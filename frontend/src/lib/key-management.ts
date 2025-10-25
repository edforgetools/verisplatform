/**
 * Key Management Interface for Veris
 *
 * Provides secure key loading, rotation support, and dual-key window management
 * for cryptographic operations without service interruption.
 */

import crypto from "crypto";
import { logger } from "./logger";

/**
 * Key configuration interface
 */
export interface KeyConfig {
  privateKey: string;
  publicKey: string;
  fingerprint: string;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Dual-key configuration for rotation support
 */
export interface DualKeyConfig {
  primary: KeyConfig;
  secondary?: KeyConfig;
  rotationCutoff?: Date;
}

/**
 * Key rotation status
 */
export interface RotationStatus {
  isRotating: boolean;
  primaryKey: KeyConfig;
  secondaryKey?: KeyConfig;
  cutoffDate?: Date;
  canRemoveSecondary: boolean;
}

/**
 * Key Management Service
 */
export class KeyManager {
  private static instance: KeyManager;
  private keyConfig: DualKeyConfig | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  /**
   * Initialize key manager with environment variables
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const primaryKey = this.loadKeyFromEnv(
        "VERIS_SIGNING_PRIVATE_KEY",
        "VERIS_SIGNING_PUBLIC_KEY",
      );

      if (!primaryKey) {
        throw new Error("Primary signing keys not found in environment variables");
      }

      // Check for secondary keys (for rotation)
      const secondaryKey = this.loadKeyFromEnv(
        "VERIS_SIGNING_PRIVATE_KEY_SECONDARY",
        "VERIS_SIGNING_PUBLIC_KEY_SECONDARY",
      );

      // Check for rotation cutoff date
      const rotationCutoff = process.env.VERIS_KEY_ROTATION_CUTOFF
        ? new Date(process.env.VERIS_KEY_ROTATION_CUTOFF)
        : undefined;

      this.keyConfig = {
        primary: primaryKey,
        secondary: secondaryKey || undefined,
        rotationCutoff,
      };

      this.initialized = true;

      logger.info(
        {
          event: "key_manager_initialized",
          primaryFingerprint: primaryKey.fingerprint,
          hasSecondary: !!secondaryKey,
          rotationCutoff: rotationCutoff?.toISOString(),
        },
        "Key manager initialized successfully",
      );
    } catch (error) {
      logger.error(
        {
          event: "key_manager_init_failed",
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to initialize key manager",
      );
      throw error;
    }
  }

  /**
   * Load key pair from environment variables
   */
  private loadKeyFromEnv(privateKeyEnv: string, publicKeyEnv: string): KeyConfig | null {
    const privateKey = process.env[privateKeyEnv];
    const publicKey = process.env[publicKeyEnv];

    if (!privateKey || !publicKey) {
      return null;
    }

    try {
      // Validate key format
      this.validateKeyFormat(privateKey, publicKey);

      // Generate fingerprint
      const fingerprint = this.generateFingerprint(publicKey);

      return {
        privateKey,
        publicKey,
        fingerprint,
        createdAt: new Date(),
        isActive: true,
      };
    } catch (error) {
      logger.error(
        {
          event: "key_validation_failed",
          envVar: privateKeyEnv,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to validate key from environment",
      );
      throw error;
    }
  }

  /**
   * Validate RSA key format
   */
  private validateKeyFormat(privateKey: string, publicKey: string): void {
    try {
      // Validate private key
      if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
        throw new Error("Invalid private key format");
      }

      // Validate public key
      if (!publicKey.includes("BEGIN PUBLIC KEY") || !publicKey.includes("END PUBLIC KEY")) {
        throw new Error("Invalid public key format");
      }

      // Test key operations
      const testData = "test";
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(testData);
      sign.end();
      const signature = sign.sign(privateKey, "base64");

      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(testData);
      const isValid = verify.verify(publicKey, signature, "base64");

      if (!isValid) {
        throw new Error("Key pair validation failed - signature verification failed");
      }
    } catch (error) {
      throw new Error(
        `Key validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Generate key fingerprint
   */
  private generateFingerprint(publicKey: string): string {
    try {
      // Convert PEM to DER format
      const derKey = publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/\s/g, "");
      const keyBuffer = Buffer.from(derKey, "base64");
      const hash = crypto.createHash("sha256").update(keyBuffer).digest("hex");
      return hash;
    } catch (error) {
      throw new Error(
        `Failed to generate key fingerprint: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Get current active key for signing
   */
  public getActiveSigningKey(): KeyConfig {
    if (!this.initialized || !this.keyConfig) {
      throw new Error("Key manager not initialized");
    }

    // During rotation, use primary key until cutoff
    if (this.keyConfig.rotationCutoff && new Date() < this.keyConfig.rotationCutoff) {
      return this.keyConfig.primary;
    }

    // After cutoff, use secondary key if available, otherwise primary
    return this.keyConfig.secondary || this.keyConfig.primary;
  }

  /**
   * Get key for verification (supports both keys during rotation)
   */
  public getVerificationKeys(): KeyConfig[] {
    if (!this.initialized || !this.keyConfig) {
      throw new Error("Key manager not initialized");
    }

    const keys = [this.keyConfig.primary];
    if (this.keyConfig.secondary) {
      keys.push(this.keyConfig.secondary);
    }

    return keys;
  }

  /**
   * Sign data with active key
   */
  public signData(data: string): string {
    const activeKey = this.getActiveSigningKey();

    try {
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(data);
      sign.end();
      return sign.sign(activeKey.privateKey, "base64");
    } catch (error) {
      logger.error(
        {
          event: "signing_failed",
          keyFingerprint: activeKey.fingerprint,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to sign data",
      );
      throw error;
    }
  }

  /**
   * Verify signature with available keys
   */
  public verifySignature(
    data: string,
    signature: string,
  ): { verified: boolean; keyFingerprint?: string } {
    const verificationKeys = this.getVerificationKeys();

    for (const key of verificationKeys) {
      try {
        const verify = crypto.createVerify("RSA-SHA256");
        verify.update(data);
        const isValid = verify.verify(key.publicKey, signature, "base64");

        if (isValid) {
          logger.debug(
            {
              event: "signature_verified",
              keyFingerprint: key.fingerprint,
            },
            "Signature verified successfully",
          );

          return { verified: true, keyFingerprint: key.fingerprint };
        }
      } catch (error) {
        logger.warn(
          {
            event: "signature_verification_error",
            keyFingerprint: key.fingerprint,
            error: error instanceof Error ? error.message : String(error),
          },
          "Error during signature verification",
        );
      }
    }

    logger.warn(
      {
        event: "signature_verification_failed",
        keyCount: verificationKeys.length,
      },
      "Signature verification failed with all available keys",
    );

    return { verified: false };
  }

  /**
   * Get rotation status
   */
  public getRotationStatus(): RotationStatus {
    if (!this.initialized || !this.keyConfig) {
      throw new Error("Key manager not initialized");
    }

    const now = new Date();
    const isRotating = !!this.keyConfig.secondary;
    const canRemoveSecondary = this.keyConfig.rotationCutoff
      ? now > this.keyConfig.rotationCutoff
      : false;

    return {
      isRotating,
      primaryKey: this.keyConfig.primary,
      secondaryKey: this.keyConfig.secondary,
      cutoffDate: this.keyConfig.rotationCutoff,
      canRemoveSecondary,
    };
  }

  /**
   * Start key rotation process
   */
  public async startRotation(
    newPrivateKey: string,
    newPublicKey: string,
    cutoffDate: Date,
  ): Promise<void> {
    if (!this.initialized || !this.keyConfig) {
      throw new Error("Key manager not initialized");
    }

    if (this.keyConfig.secondary) {
      throw new Error("Key rotation already in progress");
    }

    try {
      // Validate new key pair
      this.validateKeyFormat(newPrivateKey, newPublicKey);
      const fingerprint = this.generateFingerprint(newPublicKey);

      const newKey: KeyConfig = {
        privateKey: newPrivateKey,
        publicKey: newPublicKey,
        fingerprint,
        createdAt: new Date(),
        isActive: true,
      };

      // Update configuration
      this.keyConfig.secondary = newKey;
      this.keyConfig.rotationCutoff = cutoffDate;

      logger.info(
        {
          event: "key_rotation_started",
          newKeyFingerprint: fingerprint,
          cutoffDate: cutoffDate.toISOString(),
        },
        "Key rotation started successfully",
      );
    } catch (error) {
      logger.error(
        {
          event: "key_rotation_start_failed",
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to start key rotation",
      );
      throw error;
    }
  }

  /**
   * Complete key rotation (remove old key)
   */
  public async completeRotation(): Promise<void> {
    if (!this.initialized || !this.keyConfig) {
      throw new Error("Key manager not initialized");
    }

    const status = this.getRotationStatus();
    if (!status.isRotating || !status.canRemoveSecondary) {
      throw new Error("No rotation in progress or cutoff date not reached");
    }

    try {
      // Promote secondary key to primary
      this.keyConfig.primary = this.keyConfig.secondary!;
      this.keyConfig.secondary = undefined;
      this.keyConfig.rotationCutoff = undefined;

      logger.info(
        {
          event: "key_rotation_completed",
          newPrimaryFingerprint: this.keyConfig.primary.fingerprint,
        },
        "Key rotation completed successfully",
      );
    } catch (error) {
      logger.error(
        {
          event: "key_rotation_completion_failed",
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to complete key rotation",
      );
      throw error;
    }
  }

  /**
   * Get key fingerprints for monitoring
   */
  public getKeyFingerprints(): { primary: string; secondary?: string } {
    if (!this.initialized || !this.keyConfig) {
      throw new Error("Key manager not initialized");
    }

    return {
      primary: this.keyConfig.primary.fingerprint,
      secondary: this.keyConfig.secondary?.fingerprint,
    };
  }

  /**
   * Health check for key manager
   */
  public healthCheck(): { healthy: boolean; details: Record<string, unknown> } {
    try {
      if (!this.initialized) {
        return { healthy: false, details: { error: "Not initialized" } };
      }

      const status = this.getRotationStatus();
      const fingerprints = this.getKeyFingerprints();

      // Test signing and verification
      const testData = "health-check";
      const signature = this.signData(testData);
      const verification = this.verifySignature(testData, signature);

      return {
        healthy: verification.verified,
        details: {
          initialized: this.initialized,
          isRotating: status.isRotating,
          fingerprints,
          testSignatureVerified: verification.verified,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

/**
 * Global key manager instance
 */
export const keyManager = KeyManager.getInstance();

/**
 * Convenience functions for backward compatibility
 */
export function signHash(hashHex: string): string {
  return keyManager.signData(hashHex);
}

export function verifySignature(hashHex: string, signatureB64: string): boolean {
  return keyManager.verifySignature(hashHex, signatureB64).verified;
}

export function getKeyFingerprint(): string {
  return keyManager.getActiveSigningKey().fingerprint;
}
