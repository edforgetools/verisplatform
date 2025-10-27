/**
 * S3 Registry Service
 *
 * Implements the Network Trust Registry as specified in the MVP checklist:
 * 1. Connects to AWS via OIDC (role VerisRegistryWriter-GitHub)
 * 2. Uploads proof JSON to both staging and production buckets
 * 3. Validates upload by comparing remote checksum to local
 * 4. Runs integrity check comparing schema.json hash to canonical schema
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sha256 } from "./crypto-server";
import { ENV } from "./env";
import { CanonicalProof, verifyCanonicalProof } from "./proof-schema";
import { logger } from "./logger";

export interface RegistryConfig {
  stagingBucket: string;
  productionBucket: string;
  region: string;
  prefix?: string;
  roleArn?: string;
}

export interface UploadResult {
  proofId: string;
  stagingUrl: string;
  productionUrl: string;
  checksum: string;
  uploadedAt: string;
}

export interface IntegrityCheckResult {
  isValid: boolean;
  schemaHash: string;
  canonicalSchemaHash: string;
  mismatches: string[];
}

/**
 * Create S3 client with OIDC authentication
 */
function createS3Client(config: RegistryConfig): S3Client {
  const s3Config: Record<string, unknown> = {
    region: config.region,
  };

  // If using IAM role (for OIDC), the SDK will automatically assume the role
  if (config.roleArn) {
    s3Config.roleArn = config.roleArn;
  }

  return new S3Client(s3Config);
}

/**
 * Get registry configuration from environment variables
 */
function getRegistryConfig(): RegistryConfig {
  const stagingBucket = ENV.server.REGISTRY_S3_STAGING_BUCKET;
  const productionBucket = ENV.server.REGISTRY_S3_PRODUCTION_BUCKET;
  const region = ENV.server.AWS_REGION;
  const roleArn = ENV.server.AWS_ROLE_ARN;

  if (!stagingBucket || !productionBucket || !region) {
    throw new Error(
      "Missing required environment variables: REGISTRY_S3_STAGING_BUCKET, REGISTRY_S3_PRODUCTION_BUCKET, AWS_REGION",
    );
  }

  return {
    stagingBucket,
    productionBucket,
    region,
    prefix: ENV.server.REGISTRY_S3_PREFIX || "registry/",
    roleArn,
  };
}

/**
 * Upload proof to S3 registry (both staging and production)
 */
export async function uploadProofToRegistry(
  proof: CanonicalProof,
  config?: Partial<RegistryConfig>,
): Promise<UploadResult> {
  const registryConfig = { ...getRegistryConfig(), ...config };
  const s3Client = createS3Client(registryConfig);

  // Validate proof structure
  if (!verifyCanonicalProof(proof)) {
    throw new Error("Invalid proof structure");
  }

  const proofId = proof.proof_id;
  const proofJson = JSON.stringify(proof, null, 2);
  const proofBuffer = Buffer.from(proofJson, "utf8");
  const checksum = sha256(proofBuffer);

  const key = `${registryConfig.prefix}proofs/${proofId}.json`;
  const uploadedAt = new Date().toISOString();

  // Upload to staging bucket
  const stagingResult = await s3Client.send(
    new PutObjectCommand({
      Bucket: registryConfig.stagingBucket,
      Key: key,
      Body: proofBuffer,
      ContentType: "application/json",
      Metadata: {
        proofId,
        checksum,
        uploadedAt,
        schemaVersion: "1",
      },
    }),
  );

  // Upload to production bucket
  const productionResult = await s3Client.send(
    new PutObjectCommand({
      Bucket: registryConfig.productionBucket,
      Key: key,
      Body: proofBuffer,
      ContentType: "application/json",
      Metadata: {
        proofId,
        checksum,
        uploadedAt,
        schemaVersion: "1",
      },
    }),
  );

  const stagingUrl = `https://${registryConfig.stagingBucket}.s3.${registryConfig.region}.amazonaws.com/${key}`;
  const productionUrl = `https://${registryConfig.productionBucket}.s3.${registryConfig.region}.amazonaws.com/${key}`;

  logger.info(
    {
      proofId,
      stagingUrl,
      productionUrl,
      checksum,
    },
    "Proof uploaded to registry",
  );

  return {
    proofId,
    stagingUrl,
    productionUrl,
    checksum,
    uploadedAt,
  };
}

/**
 * Download proof from S3 registry
 */
export async function downloadProofFromRegistry(
  proofId: string,
  useProduction: boolean = true,
  config?: Partial<RegistryConfig>,
): Promise<CanonicalProof> {
  const registryConfig = { ...getRegistryConfig(), ...config };
  const s3Client = createS3Client(registryConfig);

  const bucket = useProduction ? registryConfig.productionBucket : registryConfig.stagingBucket;
  const key = `${registryConfig.prefix}proofs/${proofId}.json`;

  try {
    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!Body) {
      throw new Error(`Proof ${proofId} not found in registry`);
    }

    const proofContent = await Body.transformToString();
    const proof: CanonicalProof = JSON.parse(proofContent);

    // Validate proof structure
    if (!verifyCanonicalProof(proof)) {
      throw new Error(`Invalid proof structure for ${proofId}`);
    }

    return proof;
  } catch (error) {
    logger.error(
      {
        proofId,
        bucket,
        key,
        error: error instanceof Error ? error.message : error,
      },
      "Failed to download proof from registry",
    );
    throw error;
  }
}

/**
 * Validate upload by comparing remote checksum to local
 */
export async function validateUploadIntegrity(
  proofId: string,
  expectedChecksum: string,
  useProduction: boolean = true,
  config?: Partial<RegistryConfig>,
): Promise<boolean> {
  const registryConfig = { ...getRegistryConfig(), ...config };
  const s3Client = createS3Client(registryConfig);

  const bucket = useProduction ? registryConfig.productionBucket : registryConfig.stagingBucket;
  const key = `${registryConfig.prefix}proofs/${proofId}.json`;

  try {
    // Get object metadata
    const { Metadata } = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const remoteChecksum = Metadata?.checksum;
    if (!remoteChecksum) {
      logger.warn({ proofId, bucket, key }, "No checksum metadata found");
      return false;
    }

    const isValid = remoteChecksum === expectedChecksum;

    if (!isValid) {
      logger.error(
        {
          proofId,
          expectedChecksum,
          remoteChecksum,
        },
        "Checksum mismatch detected",
      );
    }

    return isValid;
  } catch (error) {
    logger.error(
      {
        proofId,
        bucket,
        key,
        error: error instanceof Error ? error.message : error,
      },
      "Failed to validate upload integrity",
    );
    return false;
  }
}

/**
 * Run integrity check comparing schema.json hash to canonical schema
 */
export async function runIntegrityCheck(
  config?: Partial<RegistryConfig>,
): Promise<IntegrityCheckResult> {
  const registryConfig = { ...getRegistryConfig(), ...config };
  const s3Client = createS3Client(registryConfig);

  const schemaKey = `${registryConfig.prefix}schema.json`;
  const mismatches: string[] = [];

  try {
    // Download current schema from registry
    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: registryConfig.productionBucket,
        Key: schemaKey,
      }),
    );

    if (!Body) {
      throw new Error("Schema not found in registry");
    }

    const schemaContent = await Body.transformToString();
    const schemaHash = sha256(Buffer.from(schemaContent, "utf8"));

    // Load canonical schema from local file
    const canonicalSchema = require("../schema/proof.schema.json");
    const canonicalSchemaContent = JSON.stringify(canonicalSchema, null, 2);
    const canonicalSchemaHash = sha256(Buffer.from(canonicalSchemaContent, "utf8"));

    const isValid = schemaHash === canonicalSchemaHash;

    if (!isValid) {
      mismatches.push(
        `Schema hash mismatch: registry=${schemaHash}, canonical=${canonicalSchemaHash}`,
      );
    }

    return {
      isValid,
      schemaHash,
      canonicalSchemaHash,
      mismatches,
    };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
      },
      "Failed to run integrity check",
    );

    return {
      isValid: false,
      schemaHash: "",
      canonicalSchemaHash: "",
      mismatches: [`Integrity check failed: ${error instanceof Error ? error.message : error}`],
    };
  }
}

/**
 * Upload canonical schema to registry
 */
export async function uploadCanonicalSchema(config?: Partial<RegistryConfig>): Promise<void> {
  const registryConfig = { ...getRegistryConfig(), ...config };
  const s3Client = createS3Client(registryConfig);

  const canonicalSchema = require("../schema/proof.schema.json");
  const schemaContent = JSON.stringify(canonicalSchema, null, 2);
  const schemaBuffer = Buffer.from(schemaContent, "utf8");

  const key = `${registryConfig.prefix}schema.json`;

  // Upload to both staging and production
  await Promise.all([
    s3Client.send(
      new PutObjectCommand({
        Bucket: registryConfig.stagingBucket,
        Key: key,
        Body: schemaBuffer,
        ContentType: "application/json",
        Metadata: {
          schemaVersion: "1",
          uploadedAt: new Date().toISOString(),
        },
      }),
    ),
    s3Client.send(
      new PutObjectCommand({
        Bucket: registryConfig.productionBucket,
        Key: key,
        Body: schemaBuffer,
        ContentType: "application/json",
        Metadata: {
          schemaVersion: "1",
          uploadedAt: new Date().toISOString(),
        },
      }),
    ),
  ]);

  logger.info("Canonical schema uploaded to registry");
}

/**
 * List all proofs in registry
 */
export async function listRegistryProofs(
  useProduction: boolean = true,
  config?: Partial<RegistryConfig>,
): Promise<string[]> {
  const registryConfig = { ...getRegistryConfig(), ...config };
  const s3Client = createS3Client(registryConfig);

  const bucket = useProduction ? registryConfig.productionBucket : registryConfig.stagingBucket;
  const prefix = `${registryConfig.prefix}proofs/`;

  const proofIds: string[] = [];

  try {
    let continuationToken: string | undefined;

    do {
      const { Contents, NextContinuationToken } = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      if (Contents) {
        for (const object of Contents) {
          if (object.Key && object.Key.endsWith(".json")) {
            const proofId = object.Key.split("/").pop()?.replace(".json", "");
            if (proofId) {
              proofIds.push(proofId);
            }
          }
        }
      }

      continuationToken = NextContinuationToken;
    } while (continuationToken);

    return proofIds;
  } catch (error) {
    logger.error(
      {
        bucket,
        prefix,
        error: error instanceof Error ? error.message : error,
      },
      "Failed to list registry proofs",
    );
    throw error;
  }
}

/**
 * Get signed URL for proof access
 */
export async function getProofSignedUrl(
  proofId: string,
  expiresIn: number = 3600, // 1 hour
  useProduction: boolean = true,
  config?: Partial<RegistryConfig>,
): Promise<string> {
  const registryConfig = { ...getRegistryConfig(), ...config };
  const s3Client = createS3Client(registryConfig);

  const bucket = useProduction ? registryConfig.productionBucket : registryConfig.stagingBucket;
  const key = `${registryConfig.prefix}proofs/${proofId}.json`;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}
