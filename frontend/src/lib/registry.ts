/**
 * Registry Writer Module
 *
 * Isolated S3 operations for proof blob storage with immutable cache control.
 * Provides a single function call interface for writing and reading proof blobs by key.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { ENV } from "./env";
import { logger } from "./logger";

export interface RegistryBlob {
  key: string;
  data: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface RegistryReadResult {
  data: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
  lastModified?: Date;
  etag?: string;
}

export interface RegistryWriteResult {
  key: string;
  etag: string;
  lastModified: Date;
  size: number;
}

/**
 * Create S3 client with OIDC authentication
 */
function createS3Client(): S3Client {
  const region = ENV.server.AWS_REGION;
  const roleArn = ENV.server.AWS_ROLE_ARN;

  if (!region) {
    throw new Error("AWS_REGION environment variable is required");
  }

  const s3Config: Record<string, unknown> = {
    region,
  };

  // If using IAM role (for OIDC), the SDK will automatically assume the role
  if (roleArn) {
    s3Config.roleArn = roleArn;
  }

  return new S3Client(s3Config);
}

/**
 * Get registry configuration from environment variables
 */
function getRegistryConfig() {
  const bucket = ENV.server.REGISTRY_S3_PRODUCTION_BUCKET;
  const prefix = ENV.server.REGISTRY_S3_PREFIX || "registry/";

  if (!bucket) {
    throw new Error("REGISTRY_S3_PRODUCTION_BUCKET environment variable is required");
  }

  return {
    bucket,
    prefix,
  };
}

/**
 * Write a proof blob to the registry
 *
 * @param blob - The blob to write containing key, data, and optional metadata
 * @returns Promise<RegistryWriteResult> - Result with key, etag, lastModified, and size
 */
export async function writeProofBlob(blob: RegistryBlob): Promise<RegistryWriteResult> {
  const config = getRegistryConfig();
  const s3Client = createS3Client();

  // Ensure key starts with the registry prefix
  const fullKey = blob.key.startsWith(config.prefix) ? blob.key : `${config.prefix}${blob.key}`;

  try {
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: fullKey,
      Body: blob.data,
      ContentType: blob.contentType || "application/octet-stream",
      CacheControl: "immutable", // Set immutable cache control as requested
      Metadata: blob.metadata || {},
    } as any);

    const result = await s3Client.send(command);

    logger.info(
      {
        key: fullKey,
        size: blob.data.length,
        etag: result.ETag,
      },
      "Proof blob written to registry",
    );

    return {
      key: fullKey,
      etag: result.ETag || "",
      lastModified: new Date(),
      size: blob.data.length,
    };
  } catch (error) {
    logger.error(
      {
        key: fullKey,
        error: error instanceof Error ? error.message : error,
      },
      "Failed to write proof blob to registry",
    );
    throw error;
  }
}

/**
 * Read a proof blob from the registry
 *
 * @param key - The key of the blob to read
 * @returns Promise<RegistryReadResult> - Result with data, metadata, and object info
 */
export async function readProofBlob(key: string): Promise<RegistryReadResult> {
  const config = getRegistryConfig();
  const s3Client = createS3Client();

  // Ensure key starts with the registry prefix
  const fullKey = key.startsWith(config.prefix) ? key : `${config.prefix}${key}`;

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: fullKey,
    });

    const result = await s3Client.send(command);

    if (!result.Body) {
      throw new Error(`Proof blob not found: ${fullKey}`);
    }

    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    const stream = result.Body as any;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const data = Buffer.concat(chunks);

    logger.info(
      {
        key: fullKey,
        size: data.length,
        contentType: result.ContentType,
        lastModified: result.LastModified,
      },
      "Proof blob read from registry",
    );

    return {
      data,
      contentType: result.ContentType,
      metadata: result.Metadata,
      lastModified: result.LastModified,
      etag: result.ETag,
    };
  } catch (error) {
    logger.error(
      {
        key: fullKey,
        error: error instanceof Error ? error.message : error,
      },
      "Failed to read proof blob from registry",
    );
    throw error;
  }
}

/**
 * Check if a proof blob exists in the registry
 *
 * @param key - The key of the blob to check
 * @returns Promise<boolean> - True if the blob exists, false otherwise
 */
export async function proofBlobExists(key: string): Promise<boolean> {
  const config = getRegistryConfig();
  const s3Client = createS3Client();

  // Ensure key starts with the registry prefix
  const fullKey = key.startsWith(config.prefix) ? key : `${config.prefix}${key}`;

  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: fullKey,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    // If the object doesn't exist, S3 returns a 404 error
    if (error instanceof Error && error.message.includes("404")) {
      return false;
    }

    logger.error(
      {
        key: fullKey,
        error: error instanceof Error ? error.message : error,
      },
      "Failed to check if proof blob exists",
    );
    throw error;
  }
}

/**
 * Get metadata for a proof blob without downloading the data
 *
 * @param key - The key of the blob to get metadata for
 * @returns Promise<RegistryReadResult> - Result with metadata and object info (no data)
 */
export async function getProofBlobMetadata(key: string): Promise<Omit<RegistryReadResult, "data">> {
  const config = getRegistryConfig();
  const s3Client = createS3Client();

  // Ensure key starts with the registry prefix
  const fullKey = key.startsWith(config.prefix) ? key : `${config.prefix}${key}`;

  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: fullKey,
    });

    const result = await s3Client.send(command);

    return {
      contentType: result.ContentType,
      metadata: result.Metadata,
      lastModified: result.LastModified,
      etag: result.ETag,
    };
  } catch (error) {
    logger.error(
      {
        key: fullKey,
        error: error instanceof Error ? error.message : error,
      },
      "Failed to get proof blob metadata",
    );
    throw error;
  }
}
