#!/usr/bin/env tsx
/**
 * Environment validation script for build-time validation
 * This script ensures that all required environment variables are present
 * and properly formatted before the build process continues.
 */
import { z } from "zod";
import { config } from "dotenv";
// Load environment variables from .env.local if it exists
config({ path: ".env.local" });
// =============================================================================
// BUILD-TIME ENVIRONMENT SCHEMA
// =============================================================================
// This schema defines the minimum required environment variables for a successful build
// Some variables are optional for development but required for production
// Create different schemas for CI vs local development
const createBuildTimeSchema = (isCI: boolean) => {
  const baseSchema = {
    // Required for all environments
    NEXT_PUBLIC_SUPABASE_URL: isCI
      ? z.string().min(1, "Supabase URL required")
      : z.string().url("Invalid Supabase URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: isCI
      ? z.string().min(1, "Supabase anon key required")
      : z.string().min(10, "Supabase anon key too short"),
    SUPABASE_SERVICE_ROLE_KEY: isCI
      ? z.string().min(1, "Supabase service role key required")
      : z.string().min(10, "Supabase service role key too short"),
    STRIPE_SECRET_KEY: isCI
      ? z.string().min(1, "Stripe secret key required")
      : z.string().startsWith("sk_", "Invalid Stripe secret key format"),
    STRIPE_WEBHOOK_SECRET: isCI
      ? z.string().min(1, "Stripe webhook secret required")
      : z.string().startsWith("whsec_", "Invalid Stripe webhook secret format"),
    VERIS_SIGNING_PRIVATE_KEY: isCI
      ? z.string().min(1, "Veris signing private key required")
      : z.string().min(100, "Veris signing private key too short"),
    VERIS_SIGNING_PUBLIC_KEY: isCI
      ? z.string().min(1, "Veris signing public key required")
      : z.string().min(100, "Veris signing public key too short"),
    // CRON authentication (at least one required)
    CRON_JOB_TOKEN: isCI
      ? z.string().min(1, "CRON token required").optional()
      : z.string().min(16, "CRON token must be at least 16 characters").optional(),
    CRON_SECRET: isCI
      ? z.string().min(1, "CRON secret required").optional()
      : z.string().min(16, "CRON secret must be at least 16 characters").optional(),
    // Optional for development, but validated if present
    NEXT_PUBLIC_STRIPE_MODE: z.enum(["test", "live"]).optional(),
    NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: z.string().optional(),
    NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: isCI
      ? z.string().min(1, "Site URL required").optional()
      : z.string().url().optional(),
    UPSTASH_REDIS_URL: z.string().url("Invalid Upstash Redis URL").optional(),
    REDIS_URL: z.string().url("Invalid Redis URL").optional(),
    UPSTASH_REDIS_REST_URL: z.string().url("Invalid Upstash Redis REST URL").optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "Upstash Redis REST token required").optional(),
    AWS_REGION: z.string().min(1, "AWS region required").optional(),
    AWS_ROLE_ARN: z.string().startsWith("arn:aws:iam::", "Invalid AWS role ARN format").optional(),
    REGISTRY_S3_BUCKET: z.string().min(1, "Registry S3 bucket required").optional(),
    REGISTRY_S3_STAGING_BUCKET: z.string().min(1, "Registry S3 staging bucket required").optional(),
    REGISTRY_S3_PRODUCTION_BUCKET: z
      .string()
      .min(1, "Registry S3 production bucket required")
      .optional(),
    REGISTRY_S3_PREFIX: z.string().optional(),
    ARWEAVE_GATEWAY_URL: z.string().url("Invalid Arweave gateway URL").optional(),
    ARWEAVE_WALLET_JSON: z.string().optional(),
    SENTRY_DSN: z.string().url("Invalid Sentry DSN").optional(),
  };
  return z
    .object(baseSchema)
    .refine(
      (v) => {
        // At least one CRON authentication method must be provided
        return !!(v.CRON_JOB_TOKEN || v.CRON_SECRET);
      },
      {
        message: "Either CRON_JOB_TOKEN or CRON_SECRET must be provided",
        path: ["CRON_JOB_TOKEN"],
      },
    )
    .refine(
      (v) => {
        // If Redis REST is configured, both URL and token are required
        if (v.UPSTASH_REDIS_REST_URL || v.UPSTASH_REDIS_REST_TOKEN) {
          return !!(v.UPSTASH_REDIS_REST_URL && v.UPSTASH_REDIS_REST_TOKEN);
        }
        return true;
      },
      {
        message:
          "Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when using Upstash Redis REST",
        path: ["UPSTASH_REDIS_REST_URL"],
      },
    );
};
function validateEnvironment() {
  // Check if we're in CI or Vercel environment (relaxed validation)
  // Also check for Vercel preview deployments specifically
  const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
  const isVercelPreview = isVercel && process.env.VERCEL_ENV !== "production";
  const isCI =
    process.env.CI === "true" ||
    process.env.GITHUB_ACTIONS === "true" ||
    isVercel;
  // Skip validation entirely for Vercel preview deployments to avoid blocking PRs
  if (isVercelPreview) {
    console.log("🚀 Vercel preview deployment detected - skipping environment validation");
    return;
  }
  console.log("🔍 Validating environment variables...");
  if (isCI) {
    console.log("🏗️  Running in CI mode with relaxed validation");
  }
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VERIS_SIGNING_PRIVATE_KEY: process.env.VERIS_SIGNING_PRIVATE_KEY,
    VERIS_SIGNING_PUBLIC_KEY: process.env.VERIS_SIGNING_PUBLIC_KEY,
    CRON_JOB_TOKEN: process.env.CRON_JOB_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_STRIPE_MODE: process.env.NEXT_PUBLIC_STRIPE_MODE,
    NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ROLE_ARN: process.env.AWS_ROLE_ARN,
    REGISTRY_S3_BUCKET: process.env.REGISTRY_S3_BUCKET,
    REGISTRY_S3_STAGING_BUCKET: process.env.REGISTRY_S3_STAGING_BUCKET,
    REGISTRY_S3_PRODUCTION_BUCKET: process.env.REGISTRY_S3_PRODUCTION_BUCKET,
    REGISTRY_S3_PREFIX: process.env.REGISTRY_S3_PREFIX,
    ARWEAVE_GATEWAY_URL: process.env.ARWEAVE_GATEWAY_URL,
    ARWEAVE_WALLET_JSON: process.env.ARWEAVE_WALLET_JSON,
    SENTRY_DSN: process.env.SENTRY_DSN,
  };
  const buildTimeSchema = createBuildTimeSchema(isCI);
  const result = buildTimeSchema.safeParse(envVars);
  if (!result.success) {
    console.error("❌ Environment validation failed:");
    console.error("");
    result.error.issues.forEach((error: any) => {
      const path = error.path.join(".");
      console.error(`  • ${path}: ${error.message}`);
    });
    console.error("");
    console.error("💡 Make sure to:");
    console.error("  1. Copy env.example to .env.local");
    console.error("  2. Fill in all required values");
    console.error("  3. Generate signing keys with: npm run generate-keys");
    console.error("");
    console.error("📖 See env.example for detailed instructions");
    process.exit(1);
  }
  console.log("✅ Environment validation passed");
  // Show which optional variables are configured
  const optionalVars = [
    "NEXT_PUBLIC_STRIPE_MODE",
    "NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID",
    "NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID",
    "NEXT_PUBLIC_SITE_URL",
    "UPSTASH_REDIS_URL",
    "REDIS_URL",
    "UPSTASH_REDIS_REST_URL",
    "AWS_REGION",
    "REGISTRY_S3_BUCKET",
    "ARWEAVE_GATEWAY_URL",
    "SENTRY_DSN",
  ];
  const configuredOptional = optionalVars.filter(
    (varName) => envVars[varName as keyof typeof envVars],
  );
  if (configuredOptional.length > 0) {
    console.log(`📋 Optional features configured: ${configuredOptional.join(", ")}`);
  }
}
// Run validation if this script is executed directly
if (require.main === module) {
  validateEnvironment();
}
export { validateEnvironment };
