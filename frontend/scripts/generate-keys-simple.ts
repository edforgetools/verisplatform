#!/usr/bin/env tsx

/**
 * Simple Key Generation Script
 *
 * This script generates cryptographic keys for the Veris platform.
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

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
 * Save keys to files
 */
async function saveKeys(privateKey: string, publicKey: string): Promise<void> {
  const keysDir = path.join(process.cwd(), "keys");

  try {
    await fs.mkdir(keysDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  await fs.writeFile(path.join(keysDir, `private-key-${timestamp}.pem`), privateKey, "utf8");

  await fs.writeFile(path.join(keysDir, `public-key-${timestamp}.pem`), publicKey, "utf8");

  console.log(`✅ Keys saved to ${keysDir}/`);
  console.log(`   Private key: private-key-${timestamp}.pem`);
  console.log(`   Public key: public-key-${timestamp}.pem`);
}

/**
 * Generate and save keys
 */
async function main(): Promise<void> {
  try {
    console.log("🔑 Generating cryptographic keys...");

    const { privateKey, publicKey } = await generateKeyPair();

    console.log("✅ Keys generated successfully");
    console.log(`   Private key length: ${privateKey.length} characters`);
    console.log(`   Public key length: ${publicKey.length} characters`);

    await saveKeys(privateKey, publicKey);

    console.log("\n📋 Next steps:");
    console.log(
      "1. Add the private key to your environment variables as VERIS_SIGNING_PRIVATE_KEY",
    );
    console.log("2. Add the public key to your environment variables as VERIS_SIGNING_PUBLIC_KEY");
    console.log("3. Add these keys to your GitHub secrets for staging and production");
    console.log("4. Test the keys with: pnpm run validate-services");
  } catch (error) {
    console.error(
      "❌ Key generation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  main().catch(console.error);
}

export { generateKeyPair, saveKeys };
