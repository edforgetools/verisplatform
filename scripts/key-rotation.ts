#!/usr/bin/env tsx
/**
 * Veris Key Rotation System
 * Aligned with veris_execution_ops_v4.4.md
 *
 * Rotates cryptographic keys every 6 months or 10,000 proofs (whichever comes first)
 */

import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

interface KeyRotationConfig {
  interval: "6months" | "10k_proofs";
  lastRotation: string;
  proofCount: number;
  maxProofs: number;
}

interface KeyPair {
  privateKey: string;
  publicKey: string;
  fingerprint: string;
  createdAt: string;
}

class KeyRotationManager {
  private configPath: string;
  private keysPath: string;
  private logsPath: string;

  constructor() {
    this.configPath = join(process.cwd(), "logs", "key_rotation_config.json");
    this.keysPath = join(process.cwd(), "frontend", "keys");
    this.logsPath = join(process.cwd(), "logs");
  }

  /**
   * Generate a new RSA key pair
   */
  private generateKeyPair(): KeyPair {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
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

    // Generate fingerprint
    const fingerprint = crypto
      .createHash("sha256")
      .update(publicKey)
      .digest("hex")
      .substring(0, 16);

    return {
      privateKey,
      publicKey,
      fingerprint,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Load rotation configuration
   */
  private loadConfig(): KeyRotationConfig {
    if (!existsSync(this.configPath)) {
      return {
        interval: "6months",
        lastRotation: new Date().toISOString(),
        proofCount: 0,
        maxProofs: 10000,
      };
    }

    return JSON.parse(readFileSync(this.configPath, "utf8"));
  }

  /**
   * Save rotation configuration
   */
  private saveConfig(config: KeyRotationConfig): void {
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Check if key rotation is needed
   */
  private shouldRotateKeys(config: KeyRotationConfig): boolean {
    const now = new Date();
    const lastRotation = new Date(config.lastRotation);

    // Check 6-month interval
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (lastRotation < sixMonthsAgo) {
      console.log("Key rotation needed: 6-month interval reached");
      return true;
    }

    // Check 10k proofs interval
    if (config.proofCount >= config.maxProofs) {
      console.log("Key rotation needed: 10,000 proofs threshold reached");
      return true;
    }

    return false;
  }

  /**
   * Backup current keys
   */
  private backupCurrentKeys(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = join(this.keysPath, "backups", timestamp);

    execSync(`mkdir -p "${backupDir}"`, { stdio: "inherit" });

    // Backup current keys if they exist
    const currentPrivateKey = join(this.keysPath, "private_key.pem");
    const currentPublicKey = join(this.keysPath, "public_key.pem");

    if (existsSync(currentPrivateKey)) {
      execSync(`cp "${currentPrivateKey}" "${backupDir}/"`, { stdio: "inherit" });
    }

    if (existsSync(currentPublicKey)) {
      execSync(`cp "${currentPublicKey}" "${backupDir}/"`, { stdio: "inherit" });
    }

    console.log(`Keys backed up to: ${backupDir}`);
  }

  /**
   * Deploy new keys
   */
  private deployNewKeys(keyPair: KeyPair): void {
    // Ensure keys directory exists
    execSync(`mkdir -p "${this.keysPath}"`, { stdio: "inherit" });

    // Write new keys
    writeFileSync(join(this.keysPath, "private_key.pem"), keyPair.privateKey);
    writeFileSync(join(this.keysPath, "public_key.pem"), keyPair.publicKey);

    // Create formatted versions
    writeFileSync(
      join(this.keysPath, "private_key_formatted.txt"),
      keyPair.privateKey.replace(/\n/g, "\\n"),
    );

    writeFileSync(
      join(this.keysPath, "public_key_formatted.txt"),
      keyPair.publicKey.replace(/\n/g, "\\n"),
    );

    // Create single-line versions
    writeFileSync(
      join(this.keysPath, "private_key_single_line.txt"),
      keyPair.privateKey.replace(/\n/g, ""),
    );

    writeFileSync(
      join(this.keysPath, "public_key_single_line.txt"),
      keyPair.publicKey.replace(/\n/g, ""),
    );

    console.log(`New keys deployed with fingerprint: ${keyPair.fingerprint}`);
  }

  /**
   * Update Vercel secrets
   */
  private updateVercelSecrets(keyPair: KeyPair): void {
    try {
      // Update private key secret
      execSync(`vercel secrets rm VERIS_SIGNING_PRIVATE_KEY`, { stdio: "inherit" });
      execSync(`vercel secrets add VERIS_SIGNING_PRIVATE_KEY "${keyPair.privateKey}"`, {
        stdio: "inherit",
      });

      // Update public key secret
      execSync(`vercel secrets rm VERIS_SIGNING_PUBLIC_KEY`, { stdio: "inherit" });
      execSync(`vercel secrets add VERIS_SIGNING_PUBLIC_KEY "${keyPair.publicKey}"`, {
        stdio: "inherit",
      });

      console.log("Vercel secrets updated successfully");
    } catch (error) {
      console.error("Failed to update Vercel secrets:", error);
      throw error;
    }
  }

  /**
   * Test new keys
   */
  private testNewKeys(): void {
    try {
      console.log("Testing new keys...");

      // Run key validation tests
      execSync("cd frontend && pnpm run test:mock", { stdio: "inherit" });

      console.log("Key tests passed successfully");
    } catch (error) {
      console.error("Key tests failed:", error);
      throw error;
    }
  }

  /**
   * Log rotation event
   */
  private logRotation(keyPair: KeyPair, config: KeyRotationConfig): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: "key_rotation",
      fingerprint: keyPair.fingerprint,
      reason: config.proofCount >= config.maxProofs ? "10k_proofs" : "6months",
      proofCount: config.proofCount,
      previousRotation: config.lastRotation,
    };

    const logFile = join(this.logsPath, `keys_${new Date().toISOString().split("T")[0]}.log`);
    writeFileSync(logFile, JSON.stringify(logEntry, null, 2) + "\n", { flag: "a" });

    console.log(`Rotation logged to: ${logFile}`);
  }

  /**
   * Perform key rotation
   */
  public async rotateKeys(): Promise<void> {
    console.log("Starting key rotation process...");

    const config = this.loadConfig();

    if (!this.shouldRotateKeys(config)) {
      console.log("Key rotation not needed at this time");
      return;
    }

    try {
      // Generate new key pair
      console.log("Generating new key pair...");
      const newKeyPair = this.generateKeyPair();

      // Backup current keys
      this.backupCurrentKeys();

      // Deploy new keys
      this.deployNewKeys(newKeyPair);

      // Update Vercel secrets
      this.updateVercelSecrets(newKeyPair);

      // Test new keys
      this.testNewKeys();

      // Update configuration
      const updatedConfig: KeyRotationConfig = {
        ...config,
        lastRotation: new Date().toISOString(),
        proofCount: 0,
      };
      this.saveConfig(updatedConfig);

      // Log rotation
      this.logRotation(newKeyPair, config);

      console.log("Key rotation completed successfully");
    } catch (error) {
      console.error("Key rotation failed:", error);
      throw error;
    }
  }

  /**
   * Increment proof count
   */
  public incrementProofCount(): void {
    const config = this.loadConfig();
    config.proofCount += 1;
    this.saveConfig(config);

    if (config.proofCount % 1000 === 0) {
      console.log(`Proof count: ${config.proofCount}/${config.maxProofs}`);
    }
  }

  /**
   * Get rotation status
   */
  public getStatus(): any {
    const config = this.loadConfig();
    const now = new Date();
    const lastRotation = new Date(config.lastRotation);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return {
      lastRotation: config.lastRotation,
      proofCount: config.proofCount,
      maxProofs: config.maxProofs,
      daysSinceRotation: Math.floor(
        (now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24),
      ),
      needsRotation: this.shouldRotateKeys(config),
      nextRotationReason: config.proofCount >= config.maxProofs ? "10k_proofs" : "6months",
    };
  }
}

// CLI interface
async function main() {
  const manager = new KeyRotationManager();
  const command = process.argv[2];

  switch (command) {
    case "rotate":
      await manager.rotateKeys();
      break;
    case "status":
      console.log(JSON.stringify(manager.getStatus(), null, 2));
      break;
    case "increment":
      manager.incrementProofCount();
      console.log("Proof count incremented");
      break;
    default:
      console.log("Usage: tsx key-rotation.ts <command>");
      console.log("Commands:");
      console.log("  rotate    - Perform key rotation");
      console.log("  status    - Show rotation status");
      console.log("  increment - Increment proof count");
      break;
  }
}

// CLI execution
if (typeof require !== "undefined" && require.main === module) {
  main().catch(console.error);
}

export { KeyRotationManager };
