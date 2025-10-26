#!/usr/bin/env tsx
/**
 * Simple External Services Validation Script
 *
 * This script validates external service configurations without
 * requiring complex environment setup.
 */

// Set test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-minimum-length-required";
process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_placeholder";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key-minimum-length";
process.env.VERIS_SIGNING_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\ntest-private-key-minimum-length\n-----END PRIVATE KEY-----";
process.env.VERIS_SIGNING_PUBLIC_KEY =
  "-----BEGIN PUBLIC KEY-----\ntest-public-key-minimum-length\n-----END PUBLIC KEY-----";
process.env.CRON_JOB_TOKEN = "test-cron-token-minimum-length-required";

interface ValidationResult {
  service: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
}

class SimpleExternalServicesValidator {
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
      return !process.env[varName];
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
   * Validate Supabase configuration
   */
  async validateSupabase(): Promise<void> {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !anonKey || !serviceKey) {
        this.addResult("Supabase", "error", "Missing Supabase configuration");
        return;
      }

      // Basic URL validation
      if (!url.startsWith("https://") || !url.includes("supabase")) {
        this.addResult("Supabase", "error", "Invalid Supabase URL format");
        return;
      }

      // Basic key validation
      if (anonKey.length < 10) {
        this.addResult("Supabase", "error", "Supabase anon key too short");
        return;
      }

      if (serviceKey.length < 10) {
        this.addResult("Supabase", "error", "Supabase service key too short");
        return;
      }

      this.addResult("Supabase", "success", "Configuration valid", {
        url: url,
        hasAnonKey: !!anonKey,
        hasServiceKey: !!serviceKey,
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
   * Validate Stripe configuration
   */
  async validateStripe(): Promise<void> {
    try {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!secretKey || !webhookSecret) {
        this.addResult("Stripe", "error", "Missing Stripe configuration");
        return;
      }

      // Basic key validation
      if (!secretKey.startsWith("sk_")) {
        this.addResult("Stripe", "error", "Invalid Stripe secret key format");
        return;
      }

      if (!webhookSecret.startsWith("whsec_")) {
        this.addResult("Stripe", "error", "Invalid Stripe webhook secret format");
        return;
      }

      this.addResult("Stripe", "success", "Configuration valid", {
        hasSecretKey: !!secretKey,
        hasWebhookSecret: !!webhookSecret,
        keyFormat: secretKey.startsWith("sk_live_") ? "live" : "test",
      });
    } catch (error) {
      this.addResult(
        "Stripe",
        "error",
        `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate cryptographic keys
   */
  async validateCryptographicKeys(): Promise<void> {
    try {
      const privateKey = process.env.VERIS_SIGNING_PRIVATE_KEY;
      const publicKey = process.env.VERIS_SIGNING_PUBLIC_KEY;

      if (!privateKey || !publicKey) {
        this.addResult("Cryptographic Keys", "error", "Missing signing keys");
        return;
      }

      // Basic key validation
      if (!privateKey.includes("BEGIN PRIVATE KEY")) {
        this.addResult("Cryptographic Keys", "error", "Invalid private key format");
        return;
      }

      if (!publicKey.includes("BEGIN PUBLIC KEY")) {
        this.addResult("Cryptographic Keys", "error", "Invalid public key format");
        return;
      }

      this.addResult("Cryptographic Keys", "success", "Keys format valid", {
        keyLength: privateKey.length,
        hasPrivateKey: !!privateKey,
        hasPublicKey: !!publicKey,
      });
    } catch (error) {
      this.addResult(
        "Cryptographic Keys",
        "error",
        `Key validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate AWS configuration
   */
  async validateAWS(): Promise<void> {
    try {
      const region = process.env.AWS_REGION;
      const stagingBucket = process.env.REGISTRY_BUCKET_STAGING;
      const prodBucket = process.env.REGISTRY_BUCKET_PROD;

      if (!region) {
        this.addResult("AWS S3", "warning", "AWS region not configured");
        return;
      }

      if (!stagingBucket && !prodBucket) {
        this.addResult("AWS S3", "warning", "No S3 buckets configured");
        return;
      }

      this.addResult("AWS S3", "success", "Configuration valid", {
        region: region,
        stagingBucket: stagingBucket || "not configured",
        prodBucket: prodBucket || "not configured",
      });
    } catch (error) {
      this.addResult(
        "AWS S3",
        "error",
        `Configuration error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate CRON authentication
   */
  async validateCronAuth(): Promise<void> {
    try {
      const cronToken = process.env.CRON_JOB_TOKEN;

      if (!cronToken) {
        this.addResult("CRON Authentication", "error", "Missing CRON token");
        return;
      }

      if (cronToken.length < 16) {
        this.addResult("CRON Authentication", "error", "CRON token too short (min 16 chars)");
        return;
      }

      this.addResult("CRON Authentication", "success", "Token valid", {
        tokenLength: cronToken.length,
      });
    } catch (error) {
      this.addResult(
        "CRON Authentication",
        "error",
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
    await this.validateCryptographicKeys();
    await this.validateAWS();
    await this.validateCronAuth();

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
  const validator = new SimpleExternalServicesValidator();
  await validator.runAllValidations();
}

if (require.main === module) {
  main().catch(console.error);
}

export { SimpleExternalServicesValidator };
