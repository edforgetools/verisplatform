#!/usr/bin/env tsx
/**
 * External Services Validation Script
 *
 * This script validates all external service integrations to ensure
 * they are properly configured and working correctly.
 */

// Set test environment variables if not already set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-minimum-length-required";
}
if (!process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_placeholder";
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key-minimum-length";
}
if (!process.env.VERIS_SIGNING_PRIVATE_KEY) {
  process.env.VERIS_SIGNING_PRIVATE_KEY =
    "-----BEGIN PRIVATE KEY-----\ntest-private-key-minimum-length\n-----END PRIVATE KEY-----";
}
if (!process.env.VERIS_SIGNING_PUBLIC_KEY) {
  process.env.VERIS_SIGNING_PUBLIC_KEY =
    "-----BEGIN PUBLIC KEY-----\ntest-public-key-minimum-length\n-----END PUBLIC KEY-----";
}
if (!process.env.CRON_JOB_TOKEN) {
  process.env.CRON_JOB_TOKEN = "test-cron-token-minimum-length-required";
}

import { ENV } from "../lib/env";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

interface ValidationResult {
  service: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
}

class ExternalServicesValidator {
  private results: ValidationResult[] = [];

  private addResult(
    service: string,
    status: "success" | "error" | "warning",
    message: string,
    details?: any,
  ) {
    this.results.push({ service, status, message, details });
  }

  /**
   * Validate Supabase connection
   */
  async validateSupabase(): Promise<void> {
    try {
      const supabase = createClient(
        ENV.client.NEXT_PUBLIC_SUPABASE_URL,
        ENV.client.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );

      // Test connection
      const { data, error } = await supabase.from("proofs").select("count").limit(1);

      if (error) {
        this.addResult("Supabase", "error", `Connection failed: ${error.message}`);
        return;
      }

      this.addResult("Supabase", "success", "Connection successful", {
        url: ENV.client.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!ENV.server.SUPABASE_SERVICE_ROLE_KEY,
      });
    } catch (error) {
      this.addResult(
        "Supabase",
        "error",
        `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate Stripe connection
   */
  async validateStripe(): Promise<void> {
    try {
      const stripe = new Stripe(ENV.server.STRIPE_SECRET_KEY, {
        apiVersion: "2025-09-30.clover",
      });

      // Test connection by retrieving balance
      const balance = await stripe.balance.retrieve();

      this.addResult("Stripe", "success", "Connection successful", {
        mode: ENV.client.NEXT_PUBLIC_STRIPE_MODE || "test",
        hasWebhookSecret: !!ENV.server.STRIPE_WEBHOOK_SECRET,
        currency: balance.available[0]?.currency || "usd",
      });
    } catch (error) {
      this.addResult(
        "Stripe",
        "error",
        `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate AWS S3 connection
   */
  async validateAWS(): Promise<void> {
    try {
      if (!ENV.server.AWS_REGION) {
        this.addResult("AWS S3", "warning", "AWS region not configured");
        return;
      }

      const s3Client = new S3Client({
        region: ENV.server.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });

      // Test staging bucket
      if (ENV.server.REGISTRY_BUCKET_STAGING) {
        try {
          await s3Client.send(
            new HeadObjectCommand({
              Bucket: ENV.server.REGISTRY_BUCKET_STAGING,
              Key: "test-object",
            }),
          );
          this.addResult("AWS S3 (Staging)", "success", "Staging bucket accessible", {
            bucket: ENV.server.REGISTRY_BUCKET_STAGING,
            region: ENV.server.AWS_REGION,
          });
        } catch (error) {
          this.addResult(
            "AWS S3 (Staging)",
            "error",
            `Staging bucket error: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      // Test production bucket
      if (ENV.server.REGISTRY_BUCKET_PROD) {
        try {
          await s3Client.send(
            new HeadObjectCommand({
              Bucket: ENV.server.REGISTRY_BUCKET_PROD,
              Key: "test-object",
            }),
          );
          this.addResult("AWS S3 (Production)", "success", "Production bucket accessible", {
            bucket: ENV.server.REGISTRY_BUCKET_PROD,
            region: ENV.server.AWS_REGION,
          });
        } catch (error) {
          this.addResult(
            "AWS S3 (Production)",
            "error",
            `Production bucket error: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    } catch (error) {
      this.addResult(
        "AWS S3",
        "error",
        `Configuration error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate cryptographic keys
   */
  async validateCryptographicKeys(): Promise<void> {
    try {
      const privateKey = ENV.server.VERIS_SIGNING_PRIVATE_KEY;
      const publicKey = ENV.server.VERIS_SIGNING_PUBLIC_KEY;

      if (!privateKey || !publicKey) {
        this.addResult("Cryptographic Keys", "error", "Missing signing keys");
        return;
      }

      // Test signing and verification
      const testData = "validation-test-data";
      const signature = crypto.sign("sha256", Buffer.from(testData), privateKey);
      const isValid = crypto.verify("sha256", Buffer.from(testData), publicKey, signature);

      if (isValid) {
        this.addResult("Cryptographic Keys", "success", "Keys are valid and working", {
          keyLength: privateKey.length,
          canSign: true,
          canVerify: true,
        });
      } else {
        this.addResult("Cryptographic Keys", "error", "Key validation failed");
      }
    } catch (error) {
      this.addResult(
        "Cryptographic Keys",
        "error",
        `Key validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate Redis connection (if configured)
   */
  async validateRedis(): Promise<void> {
    try {
      if (!ENV.server.UPSTASH_REDIS_REST_URL || !ENV.server.UPSTASH_REDIS_REST_TOKEN) {
        this.addResult("Redis", "warning", "Redis not configured (optional)");
        return;
      }

      // Test Redis connection
      const response = await fetch(`${ENV.server.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: {
          Authorization: `Bearer ${ENV.server.UPSTASH_REDIS_REST_TOKEN}`,
        },
      });

      if (response.ok) {
        this.addResult("Redis", "success", "Connection successful", {
          url: ENV.server.UPSTASH_REDIS_REST_URL,
        });
      } else {
        this.addResult(
          "Redis",
          "error",
          `Connection failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      this.addResult(
        "Redis",
        "error",
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate Arweave connection (if configured)
   */
  async validateArweave(): Promise<void> {
    try {
      if (!ENV.server.ARWEAVE_WALLET_JSON) {
        this.addResult("Arweave", "warning", "Arweave not configured (optional)");
        return;
      }

      const gatewayUrl = ENV.server.ARWEAVE_GATEWAY_URL || "https://arweave.net";

      // Test gateway connection
      const response = await fetch(`${gatewayUrl}/info`);

      if (response.ok) {
        this.addResult("Arweave", "success", "Gateway accessible", {
          gateway: gatewayUrl,
          hasWallet: !!ENV.server.ARWEAVE_WALLET_JSON,
        });
      } else {
        this.addResult(
          "Arweave",
          "error",
          `Gateway error: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      this.addResult(
        "Arweave",
        "error",
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironment(): Promise<void> {
    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "VERIS_SIGNING_PRIVATE_KEY",
      "VERIS_SIGNING_PUBLIC_KEY",
      "CRON_JOB_TOKEN",
    ];

    const missingVars = requiredVars.filter((varName) => {
      const value =
        ENV.client[varName as keyof typeof ENV.client] ||
        ENV.server[varName as keyof typeof ENV.server];
      return !value;
    });

    if (missingVars.length === 0) {
      this.addResult("Environment", "success", "All required variables configured");
    } else {
      this.addResult(
        "Environment",
        "error",
        `Missing required variables: ${missingVars.join(", ")}`,
      );
    }
  }

  /**
   * Run all validations
   */
  async runAllValidations(): Promise<void> {
    console.log("🔍 Starting external services validation...\n");

    await this.validateEnvironment();
    await this.validateSupabase();
    await this.validateStripe();
    await this.validateAWS();
    await this.validateCryptographicKeys();
    await this.validateRedis();
    await this.validateArweave();

    this.printResults();
  }

  /**
   * Print validation results
   */
  private printResults(): void {
    console.log("\n📊 Validation Results:\n");

    const successCount = this.results.filter((r) => r.status === "success").length;
    const errorCount = this.results.filter((r) => r.status === "error").length;
    const warningCount = this.results.filter((r) => r.status === "warning").length;

    this.results.forEach((result) => {
      const icon = result.status === "success" ? "✅" : result.status === "error" ? "❌" : "⚠️";

      console.log(`${icon} ${result.service}: ${result.message}`);

      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log();
    });

    console.log(
      `📈 Summary: ${successCount} successful, ${errorCount} errors, ${warningCount} warnings`,
    );

    if (errorCount > 0) {
      console.log("\n❌ Validation failed! Please fix the errors above.");
      process.exit(1);
    } else {
      console.log("\n✅ All validations passed!");
    }
  }
}

// CLI execution
async function main() {
  const validator = new ExternalServicesValidator();
  await validator.runAllValidations();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ExternalServicesValidator };
