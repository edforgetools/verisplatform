#!/usr/bin/env tsx

/**
 * Key Rotation Script for Veris Platform
 *
 * This script provides comprehensive key rotation functionality including:
 * - Key generation
 * - Rotation management
 * - Validation and testing
 * - Environment variable updates
 * - Rollback capabilities
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { logger } from "../lib/logger";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

// =============================================================================
// KEY ROTATION INTERFACES
// =============================================================================

interface KeyPair {
  privateKey: string;
  publicKey: string;
  fingerprint: string;
  createdAt: Date;
}

interface RotationConfig {
  keySize: number;
  algorithm: string;
  outputDir: string;
  backupDir: string;
  environmentFile: string;
}

interface RotationStatus {
  isRotating: boolean;
  primaryKey: KeyPair | null;
  secondaryKey: KeyPair | null;
  cutoffDate: Date | null;
  canRemoveSecondary: boolean;
}

// =============================================================================
// KEY ROTATION SERVICE
// =============================================================================

class KeyRotationService {
  private config: RotationConfig;

  constructor(config: RotationConfig) {
    this.config = config;
  }

  /**
   * Generate a new RSA key pair
   */
  generateKeyPair(): KeyPair {
    console.log("🔑 Generating new RSA key pair...");

    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: this.config.keySize,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });

      const fingerprint = this.generateFingerprint(publicKey);

      const keyPair: KeyPair = {
        privateKey,
        publicKey,
        fingerprint,
        createdAt: new Date(),
      };

      console.log(`✅ Key pair generated successfully`);
      console.log(`   Fingerprint: ${fingerprint}`);
      console.log(`   Algorithm: ${this.config.algorithm}`);
      console.log(`   Key size: ${this.config.keySize} bits`);

      return keyPair;
    } catch (error) {
      console.error("❌ Failed to generate key pair:", error);
      throw error;
    }
  }

  /**
   * Generate key fingerprint
   */
  private generateFingerprint(publicKey: string): string {
    try {
      const derKey = publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/\s/g, "");
      const keyBuffer = Buffer.from(derKey, "base64");
      const hash = crypto.createHash("sha256").update(keyBuffer).digest("hex");
      return hash;
    } catch (error) {
      throw new Error(`Failed to generate fingerprint: ${error}`);
    }
  }

  /**
   * Validate key pair
   */
  validateKeyPair(keyPair: KeyPair): boolean {
    console.log("🔍 Validating key pair...");

    try {
      // Test signing and verification
      const testData = "key-validation-test";
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(testData);
      sign.end();
      const signature = sign.sign(keyPair.privateKey, "base64");

      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(testData);
      const isValid = verify.verify(keyPair.publicKey, signature, "base64");

      if (isValid) {
        console.log("✅ Key pair validation successful");
        return true;
      } else {
        console.log("❌ Key pair validation failed");
        return false;
      }
    } catch (error) {
      console.error("❌ Key pair validation error:", error);
      return false;
    }
  }

  /**
   * Save key pair to files
   */
  saveKeyPair(
    keyPair: KeyPair,
    prefix: string = "",
  ): { privateKeyPath: string; publicKeyPath: string } {
    console.log(`💾 Saving key pair with prefix: ${prefix || "default"}`);

    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const privateKeyPath = path.join(
        this.config.outputDir,
        `${prefix}private-key-${timestamp}.pem`,
      );
      const publicKeyPath = path.join(
        this.config.outputDir,
        `${prefix}public-key-${timestamp}.pem`,
      );

      // Save private key
      fs.writeFileSync(privateKeyPath, keyPair.privateKey, { mode: 0o600 });
      console.log(`   Private key saved: ${privateKeyPath}`);

      // Save public key
      fs.writeFileSync(publicKeyPath, keyPair.publicKey, { mode: 0o644 });
      console.log(`   Public key saved: ${publicKeyPath}`);

      // Save metadata
      const metadataPath = path.join(this.config.outputDir, `${prefix}metadata-${timestamp}.json`);
      const metadata = {
        fingerprint: keyPair.fingerprint,
        createdAt: keyPair.createdAt.toISOString(),
        algorithm: this.config.algorithm,
        keySize: this.config.keySize,
        privateKeyPath,
        publicKeyPath,
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`   Metadata saved: ${metadataPath}`);

      return { privateKeyPath, publicKeyPath };
    } catch (error) {
      console.error("❌ Failed to save key pair:", error);
      throw error;
    }
  }

  /**
   * Backup current environment variables
   */
  backupEnvironmentVariables(): string {
    console.log("📦 Backing up current environment variables...");

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(this.config.backupDir, `env-backup-${timestamp}.env`);

      // Ensure backup directory exists
      if (!fs.existsSync(this.config.backupDir)) {
        fs.mkdirSync(this.config.backupDir, { recursive: true });
      }

      // Read current environment file
      let envContent = "";
      if (fs.existsSync(this.config.environmentFile)) {
        envContent = fs.readFileSync(this.config.environmentFile, "utf8");
      }

      // Add backup header
      const backupContent = `# Environment backup created on ${new Date().toISOString()}
# Original file: ${this.config.environmentFile}
# Backup created by key rotation script

${envContent}`;

      fs.writeFileSync(backupPath, backupContent);
      console.log(`   Backup saved: ${backupPath}`);

      return backupPath;
    } catch (error) {
      console.error("❌ Failed to backup environment variables:", error);
      throw error;
    }
  }

  /**
   * Update environment variables with new keys
   */
  updateEnvironmentVariables(keyPair: KeyPair, isSecondary: boolean = false): void {
    console.log(`🔧 Updating environment variables (${isSecondary ? "secondary" : "primary"})...`);

    try {
      let envContent = "";
      if (fs.existsSync(this.config.environmentFile)) {
        envContent = fs.readFileSync(this.config.environmentFile, "utf8");
      }

      // Define key variable names
      const privateKeyVar = isSecondary
        ? "VERIS_SIGNING_PRIVATE_KEY_SECONDARY"
        : "VERIS_SIGNING_PRIVATE_KEY";
      const publicKeyVar = isSecondary
        ? "VERIS_SIGNING_PUBLIC_KEY_SECONDARY"
        : "VERIS_SIGNING_PUBLIC_KEY";

      // Update or add key variables
      const lines = envContent.split("\n");
      let updated = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${privateKeyVar}=`)) {
          lines[i] = `${privateKeyVar}="${keyPair.privateKey.replace(/\n/g, "\\n")}"`;
          updated = true;
        } else if (lines[i].startsWith(`${publicKeyVar}=`)) {
          lines[i] = `${publicKeyVar}="${keyPair.publicKey.replace(/\n/g, "\\n")}"`;
          updated = true;
        }
      }

      // If not updated, add new lines
      if (!updated) {
        lines.push("");
        lines.push(`# ${isSecondary ? "Secondary" : "Primary"} signing keys`);
        lines.push(`${privateKeyVar}="${keyPair.privateKey.replace(/\n/g, "\\n")}"`);
        lines.push(`${publicKeyVar}="${keyPair.publicKey.replace(/\n/g, "\\n")}"`);
      }

      // Add rotation metadata
      if (isSecondary) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + 7); // 7 days from now
        lines.push(`VERIS_KEY_ROTATION_CUTOFF="${cutoffDate.toISOString()}"`);
      }

      const updatedContent = lines.join("\n");
      fs.writeFileSync(this.config.environmentFile, updatedContent);

      console.log(`   Environment file updated: ${this.config.environmentFile}`);
      if (isSecondary) {
        console.log(`   Rotation cutoff set to: ${new Date().toISOString()}`);
      }
    } catch (error) {
      console.error("❌ Failed to update environment variables:", error);
      throw error;
    }
  }

  /**
   * Get current rotation status
   */
  getRotationStatus(): RotationStatus {
    console.log("📊 Checking rotation status...");

    const primaryPrivateKey = process.env.VERIS_SIGNING_PRIVATE_KEY;
    const primaryPublicKey = process.env.VERIS_SIGNING_PUBLIC_KEY;
    const secondaryPrivateKey = process.env.VERIS_SIGNING_PRIVATE_KEY_SECONDARY;
    const secondaryPublicKey = process.env.VERIS_SIGNING_PUBLIC_KEY_SECONDARY;
    const cutoffDateStr = process.env.VERIS_KEY_ROTATION_CUTOFF;

    const primaryKey: KeyPair | null =
      primaryPrivateKey && primaryPublicKey
        ? {
            privateKey: primaryPrivateKey,
            publicKey: primaryPublicKey,
            fingerprint: this.generateFingerprint(primaryPublicKey),
            createdAt: new Date(), // We don't store creation date in env
          }
        : null;

    const secondaryKey: KeyPair | null =
      secondaryPrivateKey && secondaryPublicKey
        ? {
            privateKey: secondaryPrivateKey,
            publicKey: secondaryPublicKey,
            fingerprint: this.generateFingerprint(secondaryPublicKey),
            createdAt: new Date(),
          }
        : null;

    const cutoffDate = cutoffDateStr ? new Date(cutoffDateStr) : null;
    const canRemoveSecondary = cutoffDate ? new Date() > cutoffDate : false;

    const status: RotationStatus = {
      isRotating: !!secondaryKey,
      primaryKey,
      secondaryKey,
      cutoffDate,
      canRemoveSecondary,
    };

    console.log("   Rotation Status:");
    console.log(`   - Is rotating: ${status.isRotating}`);
    console.log(`   - Primary key: ${status.primaryKey ? "✅ Present" : "❌ Missing"}`);
    console.log(`   - Secondary key: ${status.secondaryKey ? "✅ Present" : "❌ Missing"}`);
    console.log(
      `   - Cutoff date: ${status.cutoffDate ? status.cutoffDate.toISOString() : "Not set"}`,
    );
    console.log(`   - Can remove secondary: ${status.canRemoveSecondary}`);

    return status;
  }

  /**
   * Start key rotation
   */
  async startRotation(): Promise<void> {
    console.log("🔄 Starting key rotation...");

    try {
      // Check current status
      const status = this.getRotationStatus();
      if (status.isRotating) {
        throw new Error("Key rotation already in progress");
      }

      // Backup current environment
      this.backupEnvironmentVariables();

      // Generate new key pair
      const newKeyPair = this.generateKeyPair();

      // Validate new key pair
      if (!this.validateKeyPair(newKeyPair)) {
        throw new Error("New key pair validation failed");
      }

      // Save new key pair
      this.saveKeyPair(newKeyPair, "secondary-");

      // Update environment variables with secondary keys
      this.updateEnvironmentVariables(newKeyPair, true);

      console.log("✅ Key rotation started successfully");
      console.log("   New secondary key is now available for verification");
      console.log("   Primary key will continue to be used for signing until cutoff date");
      console.log("   After cutoff date, secondary key will become primary");
    } catch (error) {
      console.error("❌ Failed to start key rotation:", error);
      throw error;
    }
  }

  /**
   * Complete key rotation
   */
  async completeRotation(): Promise<void> {
    console.log("✅ Completing key rotation...");

    try {
      const status = this.getRotationStatus();
      if (!status.isRotating) {
        throw new Error("No key rotation in progress");
      }

      if (!status.canRemoveSecondary) {
        throw new Error("Cannot complete rotation - cutoff date not reached");
      }

      if (!status.secondaryKey) {
        throw new Error("Secondary key not found");
      }

      // Backup current environment
      this.backupEnvironmentVariables();

      // Update environment variables - promote secondary to primary
      this.updateEnvironmentVariables(status.secondaryKey, false);

      // Remove secondary key variables
      let envContent = "";
      if (fs.existsSync(this.config.environmentFile)) {
        envContent = fs.readFileSync(this.config.environmentFile, "utf8");
      }

      const lines = envContent.split("\n");
      const filteredLines = lines.filter(
        (line) =>
          !line.startsWith("VERIS_SIGNING_PRIVATE_KEY_SECONDARY=") &&
          !line.startsWith("VERIS_SIGNING_PUBLIC_KEY_SECONDARY=") &&
          !line.startsWith("VERIS_KEY_ROTATION_CUTOFF="),
      );

      fs.writeFileSync(this.config.environmentFile, filteredLines.join("\n"));

      console.log("✅ Key rotation completed successfully");
      console.log("   Secondary key promoted to primary");
      console.log("   Old primary key removed");
      console.log("   Rotation metadata cleaned up");
    } catch (error) {
      console.error("❌ Failed to complete key rotation:", error);
      throw error;
    }
  }

  /**
   * Rollback key rotation
   */
  async rollbackRotation(): Promise<void> {
    console.log("⏪ Rolling back key rotation...");

    try {
      const status = this.getRotationStatus();
      if (!status.isRotating) {
        throw new Error("No key rotation in progress to rollback");
      }

      // Backup current environment
      this.backupEnvironmentVariables();

      // Remove secondary key variables and rotation metadata
      let envContent = "";
      if (fs.existsSync(this.config.environmentFile)) {
        envContent = fs.readFileSync(this.config.environmentFile, "utf8");
      }

      const lines = envContent.split("\n");
      const filteredLines = lines.filter(
        (line) =>
          !line.startsWith("VERIS_SIGNING_PRIVATE_KEY_SECONDARY=") &&
          !line.startsWith("VERIS_SIGNING_PUBLIC_KEY_SECONDARY=") &&
          !line.startsWith("VERIS_KEY_ROTATION_CUTOFF="),
      );

      fs.writeFileSync(this.config.environmentFile, filteredLines.join("\n"));

      console.log("✅ Key rotation rolled back successfully");
      console.log("   Secondary key removed");
      console.log("   Primary key remains unchanged");
      console.log("   Rotation metadata cleaned up");
    } catch (error) {
      console.error("❌ Failed to rollback key rotation:", error);
      throw error;
    }
  }

  /**
   * Test key operations
   */
  async testKeyOperations(): Promise<void> {
    console.log("🧪 Testing key operations...");

    try {
      const status = this.getRotationStatus();

      if (!status.primaryKey) {
        throw new Error("No primary key available for testing");
      }

      // Test primary key
      console.log("   Testing primary key...");
      const testData = "test-data-for-verification";
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(testData);
      sign.end();
      const signature = sign.sign(status.primaryKey.privateKey, "base64");

      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(testData);
      const isValid = verify.verify(status.primaryKey.publicKey, signature, "base64");

      if (!isValid) {
        throw new Error("Primary key test failed");
      }
      console.log("   ✅ Primary key test passed");

      // Test secondary key if available
      if (status.secondaryKey) {
        console.log("   Testing secondary key...");
        const sign2 = crypto.createSign("RSA-SHA256");
        sign2.update(testData);
        sign2.end();
        const signature2 = sign2.sign(status.secondaryKey.privateKey, "base64");

        const verify2 = crypto.createVerify("RSA-SHA256");
        verify2.update(testData);
        const isValid2 = verify2.verify(status.secondaryKey.publicKey, signature2, "base64");

        if (!isValid2) {
          throw new Error("Secondary key test failed");
        }
        console.log("   ✅ Secondary key test passed");
      }

      console.log("✅ All key operations test passed");
    } catch (error) {
      console.error("❌ Key operations test failed:", error);
      throw error;
    }
  }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const config: RotationConfig = {
    keySize: 2048,
    algorithm: "RSA-SHA256",
    outputDir: path.join(process.cwd(), "keys"),
    backupDir: path.join(process.cwd(), "keys", "backups"),
    environmentFile: path.join(process.cwd(), ".env.local"),
  };

  const keyService = new KeyRotationService(config);

  try {
    switch (command) {
      case "generate":
        console.log("🔑 Generating new key pair...");
        const keyPair = keyService.generateKeyPair();
        keyService.validateKeyPair(keyPair);
        keyService.saveKeyPair(keyPair);
        break;

      case "status":
        keyService.getRotationStatus();
        break;

      case "start-rotation":
        await keyService.startRotation();
        break;

      case "complete-rotation":
        await keyService.completeRotation();
        break;

      case "rollback":
        await keyService.rollbackRotation();
        break;

      case "test":
        await keyService.testKeyOperations();
        break;

      case "backup":
        keyService.backupEnvironmentVariables();
        break;

      default:
        console.log("🔑 Veris Key Rotation Script");
        console.log("");
        console.log("Usage: npm run generate-keys <command>");
        console.log("");
        console.log("Commands:");
        console.log("  generate          Generate a new key pair");
        console.log("  status            Show current rotation status");
        console.log("  start-rotation    Start key rotation process");
        console.log("  complete-rotation Complete key rotation");
        console.log("  rollback          Rollback current rotation");
        console.log("  test              Test key operations");
        console.log("  backup            Backup environment variables");
        console.log("");
        console.log("Examples:");
        console.log("  npm run generate-keys generate");
        console.log("  npm run generate-keys start-rotation");
        console.log("  npm run generate-keys status");
        break;
    }
  } catch (error) {
    console.error("\n💥 Key rotation failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
