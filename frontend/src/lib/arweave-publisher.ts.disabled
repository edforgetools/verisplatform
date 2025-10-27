/**
 * Arweave publisher utilities for publishing snapshot artifacts
 * Server-only module for publishing to Arweave
 */

import Arweave from "arweave";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { verifySignature, sha256 } from "./crypto-server";
import { SnapshotManifest } from "./registry-snapshot";

export interface ArweavePublishResult {
  batch: number;
  manifestTxId: string;
  jsonlTxId: string;
  manifestUrl: string;
  jsonlUrl: string;
}

/**
 * Create S3 client for fetching snapshot artifacts
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

  if (roleArn) {
    config.roleArn = roleArn;
  }

  return new S3Client(config);
}

/**
 * Create Arweave client
 */
export function createArweaveClient(): Arweave {
  const gatewayUrl = process.env.ARWEAVE_GATEWAY_URL || "https://arweave.net";

  return Arweave.init({
    host: gatewayUrl.replace(/^https?:\/\//, ""),
    port: gatewayUrl.startsWith("https") ? 443 : 80,
    protocol: gatewayUrl.startsWith("https") ? "https" : "http",
  });
}

/**
 * Fetch snapshot artifacts from S3
 */
async function fetchSnapshotArtifacts(batch: number): Promise<{
  manifest: SnapshotManifest;
  jsonlData: Buffer;
}> {
  const bucket = process.env.REGISTRY_S3_BUCKET;
  const prefix = process.env.REGISTRY_S3_PREFIX || "registry/";

  if (!bucket) {
    throw new Error("REGISTRY_S3_BUCKET environment variable is required");
  }

  const s3Client = createS3Client();
  const manifestKey = `${prefix}snapshots/${batch}.manifest.json`;
  const jsonlKey = `${prefix}snapshots/${batch}.jsonl.gz`;

  // Fetch manifest
  const { Body: manifestBody } = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: manifestKey,
    }),
  );

  if (!manifestBody) {
    throw new Error(`Manifest not found for batch ${batch}`);
  }

  const manifestContent = await manifestBody.transformToString();
  const manifest: SnapshotManifest = JSON.parse(manifestContent);

  // Fetch JSONL data
  const { Body: jsonlBody } = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: jsonlKey,
    }),
  );

  if (!jsonlBody) {
    throw new Error(`JSONL not found for batch ${batch}`);
  }

  const jsonlData = Buffer.from(await jsonlBody.transformToByteArray());

  return { manifest, jsonlData };
}

/**
 * Verify manifest signature and integrity
 */
function verifyManifestIntegrity(manifest: SnapshotManifest): boolean {
  try {
    // Verify manifest signature
    const { signature, ...manifestWithoutSignature } = manifest;
    const manifestJson = JSON.stringify(manifestWithoutSignature);
    const manifestHash = sha256(Buffer.from(manifestJson, "utf8"));

    if (!verifySignature(manifestHash, signature)) {
      return false;
    }

    // Verify manifest structure
    if (manifest.schema_version !== 1) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verifying manifest integrity:", error);
    return false;
  }
}

/**
 * Publish snapshot artifacts to Arweave
 */
export async function publishSnapshotToArweave(batch: number): Promise<ArweavePublishResult> {
  const walletJson = process.env.ARWEAVE_WALLET_JSON;

  if (!walletJson) {
    throw new Error("ARWEAVE_WALLET_JSON environment variable is required");
  }

  const arweave = createArweaveClient();
  const wallet = JSON.parse(walletJson);

  // Fetch snapshot artifacts from S3
  const { manifest, jsonlData } = await fetchSnapshotArtifacts(batch);

  // Verify manifest integrity
  if (!verifyManifestIntegrity(manifest)) {
    throw new Error("Manifest integrity verification failed");
  }

  // Recompute SHA256 of JSONL to verify it matches manifest
  const jsonlHash = sha256(jsonlData);
  if (jsonlHash !== manifest.sha256_jsonl) {
    throw new Error("JSONL hash mismatch with manifest");
  }

  // Create Arweave tags
  const tags = {
    App: "veris",
    Type: "registry-snapshot",
    Batch: batch.toString(),
    MerkleRoot: manifest.merkle_root,
    Schema: "proof.v1",
    ContentType: "application/gzip",
  };

  // Publish JSONL to Arweave
  const jsonlTransaction = await arweave.createTransaction(
    {
      data: jsonlData,
    },
    wallet,
  );

  // Add tags to JSONL transaction
  Object.entries(tags).forEach(([key, value]) => {
    jsonlTransaction.addTag(key, value);
  });

  // Sign and post JSONL transaction
  await arweave.transactions.sign(jsonlTransaction, wallet);
  const jsonlResponse = await arweave.transactions.post(jsonlTransaction);

  if (jsonlResponse.status !== 200) {
    throw new Error(`Failed to post JSONL transaction: ${jsonlResponse.status}`);
  }

  const jsonlTxId = jsonlTransaction.id;

  // Publish manifest to Arweave
  const manifestData = JSON.stringify(manifest, null, 2);
  const manifestTransaction = await arweave.createTransaction(
    {
      data: manifestData,
    },
    wallet,
  );

  // Add tags to manifest transaction
  Object.entries(tags).forEach(([key, value]) => {
    manifestTransaction.addTag(key, value);
  });
  manifestTransaction.addTag("ContentType", "application/json");
  manifestTransaction.addTag("RelatedTxId", jsonlTxId);

  // Sign and post manifest transaction
  await arweave.transactions.sign(manifestTransaction, wallet);
  const manifestResponse = await arweave.transactions.post(manifestTransaction);

  if (manifestResponse.status !== 200) {
    throw new Error(`Failed to post manifest transaction: ${manifestResponse.status}`);
  }

  const manifestTxId = manifestTransaction.id;

  const gatewayUrl = process.env.ARWEAVE_GATEWAY_URL || "https://arweave.net";

  return {
    batch,
    manifestTxId,
    jsonlTxId,
    manifestUrl: `${gatewayUrl}/${manifestTxId}`,
    jsonlUrl: `${gatewayUrl}/${jsonlTxId}`,
  };
}

/**
 * Check if snapshot is already published to Arweave
 */
export async function isSnapshotPublished(batch: number): Promise<boolean> {
  try {
    const arweave = createArweaveClient();

    // Search for existing transactions with our tags
    const query = {
      tags: [
        { name: "App", values: ["veris"] },
        { name: "Type", values: ["registry-snapshot"] },
        { name: "Batch", values: [batch.toString()] },
      ],
    };

    const results = await arweave.arql(query);

    return results.length > 0;
  } catch (error) {
    console.error("Error checking if snapshot is published:", error);
    return false;
  }
}
