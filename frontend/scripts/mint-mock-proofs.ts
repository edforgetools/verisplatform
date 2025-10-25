#!/usr/bin/env tsx

/**
 * Script to mint N mock proofs to staging bucket
 *
 * This script creates mock proofs with sample data and uploads them to the staging S3 bucket.
 * It's useful for testing and development purposes.
 *
 * Usage:
 *   tsx scripts/mint-mock-proofs.ts [count] [--dry-run]
 *
 * Examples:
 *   tsx scripts/mint-mock-proofs.ts 10
 *   tsx scripts/mint-mock-proofs.ts 100 --dry-run
 */

import { createHash, randomBytes } from "crypto";
import { uploadProofToRegistry } from "../src/lib/s3-registry";
import {
  createCanonicalProof,
  canonicalizeAndSign,
  CanonicalProofV1,
} from "../src/lib/proof-schema";
import { generateProofId } from "../src/lib/ids";
import { ENV } from "../src/lib/env";

interface MockProofOptions {
  count: number;
  dryRun: boolean;
}

/**
 * Generate mock file content for testing
 */
function generateMockFileContent(): Buffer {
  const content = `Mock file content - ${Date.now()} - ${randomBytes(16).toString("hex")}`;
  return Buffer.from(content, "utf8");
}

/**
 * Create a mock proof with sample data
 */
function createMockProof(index: number): CanonicalProofV1 {
  // Generate mock file content
  const mockContent = generateMockFileContent();
  const hash = createHash("sha256").update(mockContent).digest("hex");

  // Generate unique proof ID
  const proofId = generateProofId();

  // Create subject
  const subject = {
    type: "file",
    namespace: "veris.mock",
    id: proofId,
  };

  // Create metadata
  const metadata = {
    filename: `mock-file-${index + 1}.txt`,
    size: mockContent.length,
    mimeType: "text/plain",
    createdBy: "mock-script",
    batch: Math.floor(index / 10) + 1, // Group into batches of 10
    description: `Mock proof #${index + 1} for testing purposes`,
    tags: ["mock", "test", "sample"],
    createdAt: new Date().toISOString(),
  };

  // Create canonical proof
  const canonicalProof = createCanonicalProof(hash, subject, metadata);

  // Sign the proof
  return canonicalizeAndSign(canonicalProof);
}

/**
 * Upload mock proof to staging bucket
 */
async function uploadMockProof(proof: CanonicalProofV1, index: number): Promise<void> {
  try {
    console.log(`[${index + 1}] Uploading proof ${proof.subject.id}...`);

    const result = await uploadProofToRegistry(proof, {
      stagingBucket: ENV.server.REGISTRY_S3_STAGING_BUCKET,
      productionBucket: ENV.server.REGISTRY_S3_STAGING_BUCKET, // Use staging for both
    });

    console.log(`[${index + 1}] ✓ Uploaded to: ${result.stagingUrl}`);
    console.log(`[${index + 1}]   Checksum: ${result.checksum}`);
  } catch (error) {
    console.error(
      `[${index + 1}] ✗ Failed to upload:`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

/**
 * Main function to mint mock proofs
 */
async function mintMockProofs(options: MockProofOptions): Promise<void> {
  const { count, dryRun } = options;

  console.log(`🚀 Starting mock proof minting...`);
  console.log(`   Count: ${count}`);
  console.log(`   Dry run: ${dryRun ? "YES" : "NO"}`);
  console.log(`   Staging bucket: ${ENV.server.REGISTRY_S3_STAGING_BUCKET}`);
  console.log("");

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No actual uploads will be performed");
    console.log("");
  }

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const proof = createMockProof(i);

      if (dryRun) {
        console.log(`[${i + 1}] Would upload proof ${proof.subject.id}`);
        console.log(`[${i + 1}]   Hash: ${proof.hash_full}`);
        console.log(`[${i + 1}]   Metadata: ${JSON.stringify(proof.metadata, null, 2)}`);
        successCount++;
      } else {
        await uploadMockProof(proof, i);
        successCount++;
      }

      // Add small delay to avoid overwhelming the system
      if (i < count - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`[${i + 1}] ✗ Error:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log("");
  console.log("📊 Summary:");
  console.log(`   Total: ${count}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Duration: ${duration.toFixed(2)}s`);
  console.log(`   Rate: ${(count / duration).toFixed(2)} proofs/sec`);

  if (errorCount > 0) {
    console.log("");
    console.log("⚠️  Some proofs failed to upload. Check the errors above.");
    process.exit(1);
  } else {
    console.log("");
    console.log("✅ All mock proofs minted successfully!");
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): MockProofOptions {
  const args = process.argv.slice(2);

  let count = 10; // Default count
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: tsx scripts/mint-mock-proofs.ts [count] [--dry-run]

Arguments:
  count      Number of mock proofs to create (default: 10)
  --dry-run  Show what would be done without actually uploading
  --help     Show this help message

Examples:
  tsx scripts/mint-mock-proofs.ts 10
  tsx scripts/mint-mock-proofs.ts 100 --dry-run
      `);
      process.exit(0);
    } else if (!isNaN(Number(arg))) {
      count = Number(arg);
    } else {
      console.error(`Unknown argument: ${arg}`);
      console.error("Use --help for usage information");
      process.exit(1);
    }
  }

  if (count <= 0) {
    console.error("Count must be a positive number");
    process.exit(1);
  }

  return { count, dryRun };
}

/**
 * Validate environment variables
 */
function validateEnvironment(): void {
  const required = [
    "REGISTRY_S3_STAGING_BUCKET",
    "AWS_REGION",
    "VERIS_SIGNING_PRIVATE_KEY",
    "VERIS_SIGNING_PUBLIC_KEY",
  ];

  const missing = required.filter((key) => !ENV.server[key as keyof typeof ENV.server]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("");
    console.error("Please set these environment variables and try again.");
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    validateEnvironment();

    await mintMockProofs(options);
  } catch (error) {
    console.error("💥 Fatal error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
