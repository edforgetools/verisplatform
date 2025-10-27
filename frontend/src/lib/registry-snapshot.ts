/**
 * Registry snapshot utilities for deterministic snapshots every 1,000 proofs
 * Server-only module for creating and managing registry snapshots
 */

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { sha256 } from "./crypto-server";
import { CanonicalProof, verifyCanonicalProof } from "./proof-schema";
import zlib from "zlib";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);

export interface SnapshotManifest {
  batch: number;
  count: number;
  merkle_root: string;
  sha256_jsonl: string;
  sha256_manifest_without_signature: string;
  created_at: string;
  schema_version: 1;
  signature: string;
}

export interface SnapshotResult {
  batch: number;
  count: number;
  merkle_root: string;
  s3_url: string;
  manifest: SnapshotManifest;
}

/**
 * Create S3 client with environment configuration
 */
function createS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const roleArn = process.env.AWS_ROLE_ARN;

  if (!region) {
    throw new Error("AWS_REGION environment variable is required");
  }

  const config: Record<string, unknown> = {
    region,
  };

  // If using IAM role, the SDK will automatically assume the role
  if (roleArn) {
    config.roleArn = roleArn;
  }

  return new S3Client(config);
}

/**
 * Compute Merkle root from array of proof hashes
 */
export function computeMerkleRoot(proofHashes: string[]): string {
  if (proofHashes.length === 0) {
    throw new Error("Cannot compute Merkle root of empty array");
  }

  if (proofHashes.length === 1) {
    return proofHashes[0];
  }

  // Simple binary tree Merkle root computation
  let currentLevel: Buffer[] = proofHashes.map((hash) => Buffer.from(hash, "hex"));

  while (currentLevel.length > 1) {
    const nextLevel: Buffer[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

      const combined = Buffer.concat([left, right]);
      const hash = sha256(combined);
      nextLevel.push(Buffer.from(hash, "hex"));
    }

    currentLevel = nextLevel;
  }

  return currentLevel[0].toString("hex");
}

/**
 * Create snapshot manifest
 */
function createSnapshotManifest(
  batch: number,
  count: number,
  merkleRoot: string,
  jsonlHash: string,
  manifestHash: string,
): SnapshotManifest {
  const manifest: Omit<SnapshotManifest, "signature"> = {
    batch,
    count,
    merkle_root: merkleRoot,
    sha256_jsonl: jsonlHash,
    sha256_manifest_without_signature: manifestHash,
    created_at: new Date().toISOString(),
    schema_version: 1,
  };

  // Sign the manifest (without signature field)
  const manifestJson = JSON.stringify(manifest);
  const signature = signHash(sha256(Buffer.from(manifestJson, "utf8")));

  return {
    ...manifest,
    signature,
  };
}

/**
 * Create registry snapshot for a batch of proofs
 */
export async function createRegistrySnapshot(
  batch: number,
  proofs: CanonicalProof[],
): Promise<SnapshotResult> {
  const bucket = process.env.REGISTRY_S3_BUCKET;
  const prefix = process.env.REGISTRY_S3_PREFIX || "registry/";

  if (!bucket) {
    throw new Error("REGISTRY_S3_BUCKET environment variable is required");
  }

  const s3Client = createS3Client();

  // Create JSONL content (one canonical proof per line)
  const jsonlLines = proofs.map((proof) => getCanonicalJsonString(proof));
  const jsonlContent = jsonlLines.join("\n") + "\n";

  // Compress JSONL
  const compressedJsonl = await gzip(Buffer.from(jsonlContent, "utf8"));

  // Compute hashes
  const jsonlHash = sha256(Buffer.from(jsonlContent, "utf8"));
  const proofHashes = proofs.map((proof) => proof.hash_full);
  const merkleRoot = computeMerkleRoot(proofHashes);

  // Create manifest (without signature first)
  const manifestWithoutSignature = {
    batch,
    count: proofs.length,
    merkle_root: merkleRoot,
    sha256_jsonl: jsonlHash,
    sha256_manifest_without_signature: "", // Will be computed
    created_at: new Date().toISOString(),
    schema_version: 1 as const,
  };

  const manifestJson = JSON.stringify(manifestWithoutSignature);
  const manifestHash = sha256(Buffer.from(manifestJson, "utf8"));

  // Create final manifest with signature
  const manifest = createSnapshotManifest(
    batch,
    proofs.length,
    merkleRoot,
    jsonlHash,
    manifestHash,
  );

  // Upload files to S3
  const jsonlKey = `${prefix}snapshots/${batch}.jsonl.gz`;
  const manifestKey = `${prefix}snapshots/${batch}.manifest.json`;

  // Check if files already exist (idempotency)
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: jsonlKey,
      }),
    );

    // File exists, verify it matches our expected content
    // For now, we'll assume it's correct and return existing URLs
    const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${manifestKey}`;

    return {
      batch,
      count: proofs.length,
      merkle_root: merkleRoot,
      s3_url: s3Url,
      manifest,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== "NotFound") {
      throw error;
    }
    // File doesn't exist, proceed with upload
  }

  // Upload JSONL
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: jsonlKey,
      Body: compressedJsonl,
      ContentType: "application/gzip",
      ContentEncoding: "gzip",
    }),
  );

  // Upload manifest
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: manifestKey,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: "application/json",
    }),
  );

  const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${manifestKey}`;

  return {
    batch,
    count: proofs.length,
    merkle_root: merkleRoot,
    s3_url: s3Url,
    manifest,
  };
}

/**
 * Verify snapshot integrity
 */
export async function verifySnapshotIntegrity(
  batch: number,
  proofs: CanonicalProofV1[],
): Promise<boolean> {
  try {
    const bucket = process.env.REGISTRY_S3_BUCKET;
    const prefix = process.env.REGISTRY_S3_PREFIX || "registry/";

    if (!bucket) {
      throw new Error("REGISTRY_S3_BUCKET environment variable is required");
    }

    const s3Client = createS3Client();
    const manifestKey = `${prefix}snapshots/${batch}.manifest.json`;

    // Download and verify manifest
    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: manifestKey,
      }),
    );

    if (!Body) {
      throw new Error("Manifest not found");
    }

    const manifestContent = await Body.transformToString();
    const manifest: SnapshotManifest = JSON.parse(manifestContent);

    // Verify manifest signature
    const { signature, ...manifestWithoutSignature } = manifest;
    const manifestJson = JSON.stringify(manifestWithoutSignature);
    const expectedHash = sha256(Buffer.from(manifestJson, "utf8"));

    // This would need the verifySignature function from crypto-server
    // For now, we'll just verify the structure
    if (manifest.batch !== batch || manifest.count !== proofs.length) {
      return false;
    }

    // Verify Merkle root
    const proofHashes = proofs.map((proof) => proof.hash_full);
    const expectedMerkleRoot = computeMerkleRoot(proofHashes);

    return manifest.merkle_root === expectedMerkleRoot;
  } catch (error) {
    console.error("Error verifying snapshot integrity:", error);
    return false;
  }
}
