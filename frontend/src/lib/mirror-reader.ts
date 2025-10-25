/**
 * Mirror reader utilities for fetching proof JSON from S3
 * Server-only module for reading from mirror backends
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { CanonicalProofV1 } from "./proof-schema";
import { verifyCanonicalProof } from "./proof-schema";
import { supabaseService } from "./db";
import { isMirrorsEnabled } from "./env";

/**
 * Create S3 client for reading from mirror
 */
function createS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const roleArn = process.env.AWS_ROLE_ARN;

  if (!region) {
    throw new Error("AWS_REGION environment variable is required");
  }

  const config: any = {
    region,
  };

  if (roleArn) {
    config.roleArn = roleArn;
  }

  return new S3Client(config);
}

/**
 * Fetch proof JSON from S3 by ID
 */
export async function fetchProofFromS3(proofId: string): Promise<CanonicalProofV1 | null> {
  // Feature flag check - mirrors disabled by default for MVP
  if (!isMirrorsEnabled()) {
    return null;
  }
  const bucket = process.env.REGISTRY_S3_BUCKET;
  const prefix = process.env.REGISTRY_S3_PREFIX || "registry/";

  if (!bucket) {
    throw new Error("REGISTRY_S3_BUCKET environment variable is required");
  }

  const s3Client = createS3Client();

  try {
    // Try to find the proof in the latest snapshot first
    // This is a simplified approach - in practice, you might want to search across all snapshots
    const { data: latestSnapshot } = await supabaseService()
      .from("snapshot_meta")
      .select("batch")
      .order("batch", { ascending: false })
      .limit(1)
      .single();

    if (!latestSnapshot) {
      return null;
    }

    // Download the JSONL file for the latest snapshot
    const jsonlKey = `${prefix}snapshots/${latestSnapshot.batch}.jsonl.gz`;

    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: jsonlKey,
      }),
    );

    if (!Body) {
      return null;
    }

    // Decompress and parse JSONL
    const zlib = require("zlib");
    const gunzip = require("util").promisify(zlib.gunzip);

    const compressedData = await Body.transformToByteArray();
    const decompressedData = await gunzip(Buffer.from(compressedData));
    const jsonlContent = decompressedData.toString("utf8");

    // Parse each line and look for the proof
    const lines = jsonlContent.trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        try {
          const proof: CanonicalProofV1 = JSON.parse(line);
          if (proof.subject.id === proofId) {
            return proof;
          }
        } catch (error) {
          console.error("Error parsing proof JSON:", error);
          continue;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching proof from S3:", error);
    return null;
  }
}

/**
 * Fetch proof JSON from S3 by hash
 */
export async function fetchProofFromS3ByHash(hash: string): Promise<CanonicalProofV1 | null> {
  // Feature flag check - mirrors disabled by default for MVP
  if (!isMirrorsEnabled()) {
    return null;
  }
  const bucket = process.env.REGISTRY_S3_BUCKET;
  const prefix = process.env.REGISTRY_S3_PREFIX || "registry/";

  if (!bucket) {
    throw new Error("REGISTRY_S3_BUCKET environment variable is required");
  }

  const s3Client = createS3Client();

  try {
    // Get all snapshots
    const { data: snapshots } = await supabaseService()
      .from("snapshot_meta")
      .select("batch")
      .order("batch", { ascending: false });

    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    // Search through snapshots (most recent first)
    for (const snapshot of snapshots) {
      const jsonlKey = `${prefix}snapshots/${snapshot.batch}.jsonl.gz`;

      try {
        const { Body } = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: jsonlKey,
          }),
        );

        if (!Body) {
          continue;
        }

        // Decompress and parse JSONL
        const zlib = require("zlib");
        const gunzip = require("util").promisify(zlib.gunzip);

        const compressedData = await Body.transformToByteArray();
        const decompressedData = await gunzip(Buffer.from(compressedData));
        const jsonlContent = decompressedData.toString("utf8");

        // Parse each line and look for the hash
        const lines = jsonlContent.trim().split("\n");
        for (const line of lines) {
          if (line.trim()) {
            try {
              const proof: CanonicalProofV1 = JSON.parse(line);
              if (proof.hash_full === hash) {
                return proof;
              }
            } catch (error) {
              console.error("Error parsing proof JSON:", error);
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`Error reading snapshot ${snapshot.batch}:`, error);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching proof from S3 by hash:", error);
    return null;
  }
}

/**
 * Verify proof using mirror backend
 */
export async function verifyProofFromMirror(proofId: string): Promise<{
  schema_version: number;
  proof_hash: string;
  valid: boolean;
  verified_at: string;
  signer_fp: string | null;
  source_registry: string;
  errors: string[];
}> {
  // Feature flag check - mirrors disabled by default for MVP
  if (!isMirrorsEnabled()) {
    return {
      schema_version: 1,
      proof_hash: "",
      valid: false,
      verified_at: new Date().toISOString(),
      signer_fp: null,
      source_registry: "mirror_disabled",
      errors: ["Mirror functionality is disabled"],
    };
  }

  try {
    const proof = await fetchProofFromS3(proofId);

    if (!proof) {
      return {
        schema_version: 1,
        proof_hash: "",
        valid: false,
        verified_at: new Date().toISOString(),
        signer_fp: null,
        source_registry: "s3",
        errors: ["Proof not found in mirror"],
      };
    }

    const isValid = verifyCanonicalProof(proof);

    return {
      schema_version: 1,
      proof_hash: proof.hash_full,
      valid: isValid,
      verified_at: new Date().toISOString(),
      signer_fp: isValid ? proof.signer_fingerprint : null,
      source_registry: "s3",
      errors: isValid ? [] : ["Proof verification failed"],
    };
  } catch (error) {
    return {
      schema_version: 1,
      proof_hash: "",
      valid: false,
      verified_at: new Date().toISOString(),
      signer_fp: null,
      source_registry: "s3",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}
