#!/usr/bin/env tsx

/**
 * Generate RSA key pair for Veris signing
 * This script generates a new RSA key pair for cryptographic signing
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

function generateKeyPair() {
  console.log("Generating RSA key pair...");

  // Generate 2048-bit RSA key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { publicKey, privateKey };
}

function saveKeys(publicKey: string, privateKey: string, outputDir: string = "./keys") {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save keys
  const publicKeyPath = path.join(outputDir, "public.pem");
  const privateKeyPath = path.join(outputDir, "private.pem");

  fs.writeFileSync(publicKeyPath, publicKey);
  fs.writeFileSync(privateKeyPath, privateKey);

  console.log(`Public key saved to: ${publicKeyPath}`);
  console.log(`Private key saved to: ${privateKeyPath}`);

  return { publicKeyPath, privateKeyPath };
}

function generateEnvFile(
  publicKey: string,
  privateKey: string,
  outputPath: string = "./.env.local",
) {
  const envContent = `# Veris Signing Keys
VERIS_SIGNING_PUBLIC_KEY="${publicKey.replace(/\n/g, "\\n")}"
VERIS_SIGNING_PRIVATE_KEY="${privateKey.replace(/\n/g, "\\n")}"
`;

  fs.writeFileSync(outputPath, envContent, { flag: "a" }); // Append to existing .env.local
  console.log(`Environment variables added to: ${outputPath}`);
}

function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || "./keys";
  const envFile = args[1] || "./.env.local";

  try {
    const { publicKey, privateKey } = generateKeyPair();

    // Save keys to files
    saveKeys(publicKey, privateKey, outputDir);

    // Add to .env.local
    generateEnvFile(publicKey, privateKey, envFile);

    console.log("\n✅ Key generation complete!");
    console.log("\nNext steps:");
    console.log("1. Add the generated keys to your .env.local file");
    console.log("2. Keep the private key secure and never commit it to version control");
    console.log("3. The public key can be shared for verification");
  } catch (error) {
    console.error("Error generating keys:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
