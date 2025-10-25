#!/usr/bin/env tsx

/**
 * Test script to verify mock proof creation works
 *
 * This script tests the mock proof creation functionality without actually uploading to S3.
 */

import { createHash, randomBytes } from "crypto";
import {
  createCanonicalProof,
  canonicalizeAndSign,
  CanonicalProofV1,
} from "../src/lib/proof-schema";
import { generateProofId } from "../src/lib/ids";

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

async function testMockProofCreation(): Promise<void> {
  console.log("🧪 Testing mock proof creation...");

  try {
    // Test creating a single mock proof
    const proof = createMockProof(0);

    console.log("✅ Mock proof created successfully!");
    console.log(`   ID: ${proof.subject.id}`);
    console.log(`   Hash: ${proof.hash_full}`);
    console.log(`   Schema version: ${proof.schema_version}`);
    console.log(`   Signed at: ${proof.signed_at}`);
    console.log(`   Signer fingerprint: ${proof.signer_fingerprint}`);
    console.log(`   Metadata:`, JSON.stringify(proof.metadata, null, 2));

    // Validate the proof structure
    if (proof.schema_version !== 1) {
      throw new Error("Invalid schema version");
    }

    if (proof.hash_algo !== "sha256") {
      throw new Error("Invalid hash algorithm");
    }

    if (!proof.signature) {
      throw new Error("Missing signature");
    }

    if (!proof.subject.id) {
      throw new Error("Missing subject ID");
    }

    console.log("✅ Proof structure validation passed!");
  } catch (error) {
    console.error("❌ Test failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testMockProofCreation();
}
