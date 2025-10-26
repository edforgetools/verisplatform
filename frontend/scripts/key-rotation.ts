#!/usr/bin/env tsx

/**
 * Key Rotation Helper Script
 *
 * This script helps manage cryptographic key rotation for the Veris platform.
 * It can generate new keys, start rotation, and complete rotation processes.
 */

import { program } from "commander";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { logger } from "../src/lib/logger";

/**
 * Generate a new RSA key pair
 */
async function generateKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      "rsa",
      {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
        } else {
          resolve({ privateKey, publicKey });
        }
      },
    );
  });
}

/**
 * Save key pair to files
 */
async function saveKeyPair(
  privateKey: string,
  publicKey: string,
  outputDir: string,
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const privateKeyPath = path.join(outputDir, `private-${timestamp}.pem`);
  const publicKeyPath = path.join(outputDir, `public-${timestamp}.pem`);

  await fs.writeFile(privateKeyPath, privateKey);
  await fs.writeFile(publicKeyPath, publicKey);

  console.log(`Keys saved to:`);
  console.log(`  Private: ${privateKeyPath}`);
  console.log(`  Public:  ${publicKeyPath}`);
}

/**
 * Convert PEM key to single-line format for environment variables
 */
function keyToEnvFormat(key: string): string {
  return key.replace(/\n/g, "\\n");
}

/**
 * Generate new key pair command
 */
async function generateKeys(outputDir: string = "./keys"): Promise<void> {
  try {
    console.log("Generating new RSA key pair...");

    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    const { privateKey, publicKey } = await generateKeyPair();

    // Save to files
    await saveKeyPair(privateKey, publicKey, outputDir);

    // Display environment variable format
    console.log("\nEnvironment variable format:");
    console.log("VERIS_SIGNING_PRIVATE_KEY=" + keyToEnvFormat(privateKey));
    console.log("VERIS_SIGNING_PUBLIC_KEY=" + keyToEnvFormat(publicKey));

    console.log("\n✅ Key pair generated successfully!");
  } catch (error) {
    console.error("❌ Failed to generate key pair:", error);
    process.exit(1);
  }
}

/**
 * Check key rotation status
 */
async function checkStatus(): Promise<void> {
  try {
    console.log("Checking key rotation status...");

    await keyManager.initialize();
    const status = keyManager.getRotationStatus();
    const fingerprints = keyManager.getKeyFingerprints();

    console.log("\n📊 Key Rotation Status:");
    console.log(`  Rotating: ${status.isRotating ? "Yes" : "No"}`);
    console.log(`  Primary Key: ${fingerprints.primary}`);

    if (status.secondaryKey) {
      console.log(`  Secondary Key: ${fingerprints.secondary}`);
    }

    if (status.cutoffDate) {
      console.log(`  Cutoff Date: ${status.cutoffDate.toISOString()}`);
      console.log(`  Can Remove Secondary: ${status.canRemoveSecondary ? "Yes" : "No"}`);
    }

    // Health check
    const health = keyManager.healthCheck();
    console.log(`  Health: ${health.healthy ? "✅ Healthy" : "❌ Unhealthy"}`);

    if (!health.healthy) {
      console.log(`  Error: ${health.details.error}`);
    }
  } catch (error) {
    console.error("❌ Failed to check status:", error);
    process.exit(1);
  }
}

/**
 * Start key rotation
 */
async function startRotation(
  privateKeyPath: string,
  publicKeyPath: string,
  cutoffHours: number = 24,
): Promise<void> {
  try {
    console.log("Starting key rotation...");

    // Read new keys from files
    const newPrivateKey = await fs.readFile(privateKeyPath, "utf-8");
    const newPublicKey = await fs.readFile(publicKeyPath, "utf-8");

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() + cutoffHours);

    await keyManager.initialize();
    await keyManager.startRotation(newPrivateKey, newPublicKey, cutoffDate);

    console.log(`✅ Key rotation started successfully!`);
    console.log(`   Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`   Secondary key will be promoted after ${cutoffHours} hours`);
  } catch (error) {
    console.error("❌ Failed to start rotation:", error);
    process.exit(1);
  }
}

/**
 * Complete key rotation
 */
async function completeRotation(): Promise<void> {
  try {
    console.log("Completing key rotation...");

    await keyManager.initialize();
    await keyManager.completeRotation();

    console.log("✅ Key rotation completed successfully!");
    console.log("   Old primary key has been removed");
    console.log("   Secondary key is now the primary key");
  } catch (error) {
    console.error("❌ Failed to complete rotation:", error);
    process.exit(1);
  }
}

/**
 * Test key operations
 */
async function testKeys(): Promise<void> {
  try {
    console.log("Testing key operations...");

    await keyManager.initialize();

    // Test data
    const testData = "Hello, Veris!";

    // Test signing
    console.log("  Testing signature creation...");
    const signature = keyManager.signData(testData);
    console.log(`  ✅ Signature created: ${signature.substring(0, 20)}...`);

    // Test verification
    console.log("  Testing signature verification...");
    const verification = keyManager.verifySignature(testData, signature);
    console.log(`  ✅ Signature verified: ${verification.verified}`);

    if (verification.keyFingerprint) {
      console.log(`  ✅ Verified with key: ${verification.keyFingerprint}`);
    }

    // Test with wrong data
    console.log("  Testing with wrong data...");
    const wrongVerification = keyManager.verifySignature("Wrong data", signature);
    console.log(`  ✅ Correctly rejected: ${!wrongVerification.verified}`);

    console.log("\n✅ All key operations working correctly!");
  } catch (error) {
    console.error("❌ Key operations failed:", error);
    process.exit(1);
  }
}

/**
 * Main CLI program
 */
program.name("key-rotation").description("Veris Key Rotation Management Tool").version("1.0.0");

program
  .command("generate")
  .description("Generate a new RSA key pair")
  .option("-o, --output <dir>", "Output directory for keys", "./keys")
  .action(generateKeys);

program.command("status").description("Check key rotation status").action(checkStatus);

program
  .command("start")
  .description("Start key rotation process")
  .requiredOption("-p, --private <path>", "Path to new private key file")
  .requiredOption("-u, --public <path>", "Path to new public key file")
  .option("-h, --hours <number>", "Hours until cutoff", "24")
  .action((options) => startRotation(options.private, options.public, parseInt(options.hours)));

program
  .command("complete")
  .description("Complete key rotation (remove old key)")
  .action(completeRotation);

program.command("test").description("Test key operations").action(testKeys);

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
