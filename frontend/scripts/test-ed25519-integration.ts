#!/usr/bin/env tsx

/**
 * Test Ed25519 Integration
 * Validates that Ed25519 crypto functions work correctly per MVP §2.1
 */

import {
  sha256,
  signEd25519,
  verifyEd25519,
  createCanonicalProof,
  verifyCanonicalProof as verifyProof,
} from "../src/lib/ed25519-crypto";

async function testEd25519Integration() {
  console.log("🧪 Testing Ed25519 Integration\n");

  // Check environment variables
  const hasPrivateKey = !!process.env.VERIS_ED25519_PRIVATE_KEY;
  const hasPublicKey = !!process.env.VERIS_ED25519_PUBLIC_KEY;
  const hasIssuer = !!process.env.VERIS_ISSUER;

  console.log("Environment Check:");
  console.log(`  VERIS_ED25519_PRIVATE_KEY: ${hasPrivateKey ? "✅" : "❌"}`);
  console.log(`  VERIS_ED25519_PUBLIC_KEY: ${hasPublicKey ? "✅" : "❌"}`);
  console.log(`  VERIS_ISSUER: ${hasIssuer ? "✅" : "❌ (will use default)"}\n`);

  if (!hasPrivateKey || !hasPublicKey) {
    console.log("⚠️  Missing Ed25519 keys. Generating test keys...\n");
    console.log("To set up keys:");
    console.log("1. Run: openssl genpkey -algorithm ed25519 -out private.pem");
    console.log("2. Run: openssl pkey -in private.pem -pubout -out public.pem");
    console.log(
      "3. Add keys to .env.local as VERIS_ED25519_PRIVATE_KEY and VERIS_ED25519_PUBLIC_KEY\n",
    );
    return;
  }

  // Test 1: SHA-256 Hashing
  console.log("Test 1: SHA-256 Hashing");
  const testData = Buffer.from("Hello, Veris!");
  const hash = sha256(testData);
  console.log(`  Hash: ${hash}`);
  console.log(`  Length: ${hash.length} (expected: 64)\n`);
  console.log(hash.length === 64 ? "✅ Pass" : "❌ Fail");
  console.log();

  // Test 2: Ed25519 Signing
  console.log("Test 2: Ed25519 Signing");
  const issuedAt = new Date().toISOString();
  let signature: string;
  try {
    signature = signEd25519(hash, issuedAt);
    console.log(`  Signature: ${signature.substring(0, 30)}...`);
    console.log(`  Format: ${signature.startsWith("ed25519:") ? "ed25519:" : "Wrong prefix"}\n`);
    console.log(signature.startsWith("ed25519:") ? "✅ Pass" : "❌ Fail");
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}\n`);
    return;
  }
  console.log();

  // Test 3: Ed25519 Verification
  console.log("Test 3: Ed25519 Verification");
  try {
    const valid = verifyEd25519(hash, issuedAt, signature);
    console.log(`  Result: ${valid ? "Valid" : "Invalid"}\n`);
    console.log(valid ? "✅ Pass" : "❌ Fail");
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}\n`);
    return;
  }
  console.log();

  // Test 4: Canonical Proof Creation
  console.log("Test 4: Canonical Proof Creation");
  try {
    const proof = createCanonicalProof(hash);
    console.log(`  Proof ID: ${proof.proof_id}`);
    console.log(`  SHA256: ${proof.sha256.substring(0, 16)}...`);
    console.log(`  Issued At: ${proof.issued_at}`);
    console.log(`  Issuer: ${proof.issuer}`);
    console.log(`  Signature: ${proof.signature.substring(0, 30)}...\n`);
    console.log(
      proof.proof_id.length === 26 &&
        proof.sha256.length === 64 &&
        proof.signature.startsWith("ed25519:")
        ? "✅ Pass"
        : "❌ Fail",
    );
    console.log();

    // Test 5: Proof Verification
    console.log("Test 5: Proof Verification");
    const verificationResult = verifyProof(proof);
    console.log(`  Valid: ${verificationResult.valid}`);
    console.log(`  Errors: ${verificationResult.errors.length}\n`);
    console.log(verificationResult.valid ? "✅ Pass" : "❌ Fail");
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}\n`);
  }

  console.log("\n✨ Integration test complete");
}

// Run tests
testEd25519Integration().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
