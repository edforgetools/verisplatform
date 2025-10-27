#!/usr/bin/env tsx

/**
 * Test script to verify mock proof creation works
 *
 * This script tests the mock proof creation functionality without actually uploading to S3.
 */

import { createHash, randomBytes } from "crypto";
import { createCanonicalProof, CanonicalProof } from "../src/lib/proof-schema";
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
function createMockProof(index: number): CanonicalProof {
  // Generate mock file content
  const mockContent = generateMockFileContent();
  const hash = createHash("sha256").update(mockContent).digest("hex");

  // Create canonical proof (already signed with Ed25519)
  return createCanonicalProof(hash);
}

async function testMockProofCreation(): Promise<void> {
  console.log("🧪 Testing mock proof creation...");

  try {
    // Test creating a single mock proof
    const proof = createMockProof(0);

    console.log("✅ Mock proof created successfully!");
    console.log(`   ID: ${proof.proof_id}`);
    console.log(`   Hash: ${proof.sha256}`);
    console.log(`   Issued at: ${proof.issued_at}`);
    console.log(`   Issuer: ${proof.issuer}`);
    console.log(`   Signature: ${proof.signature.substring(0, 50)}...`);

    // Validate the proof structure
    if (!proof.proof_id) {
      throw new Error("Missing proof ID");
    }

    if (!proof.sha256 || !/^[a-f0-9]{64}$/.test(proof.sha256)) {
      throw new Error("Invalid hash format");
    }

    if (!proof.signature || !proof.signature.startsWith("ed25519:")) {
      throw new Error("Invalid signature format");
    }

    if (!proof.issuer) {
      throw new Error("Missing issuer");
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
