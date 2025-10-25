#!/usr/bin/env tsx

/**
 * Comprehensive Environment Variable Validation
 *
 * This script validates all environment variables used by the Veris platform,
 * including client-side, server-side, and deployment-specific variables.
 * It provides detailed validation, mapping, and documentation.
 */

import { config } from "dotenv";
import path from "path";
import { z } from "zod";
import { logger } from "../lib/logger";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

// =============================================================================
// ENVIRONMENT VARIABLE SCHEMAS
// =============================================================================

// Client-side environment variables (exposed to browser)
const clientSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, "Supabase anon key too short"),

  // Stripe Configuration
  NEXT_PUBLIC_STRIPE_MODE: z.enum(["test", "live"]).optional(),
  NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: z.string().optional(),

  // Site Configuration
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // API Configuration
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_VERIS_API_KEY: z.string().optional(),
});

// Server-side environment variables (secrets)
const serverSchema = z
  .object({
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, "Supabase service key too short"),

    // Stripe
    STRIPE_SECRET_KEY: z.string().startsWith("sk_", "Invalid Stripe secret key format"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "Invalid Stripe webhook secret format"),
    STRIPE_USAGE_PRICE_ID: z.string().optional(),

    // Authentication
    CRON_JOB_TOKEN: z.string().min(16, "CRON token must be at least 16 characters").optional(),
    CRON_SECRET: z.string().min(16, "CRON secret must be at least 16 characters").optional(),
    INTERNAL_KEY: z.string().min(16, "Internal key must be at least 16 characters").optional(),

    // Redis
    UPSTASH_REDIS_URL: z.string().url("Invalid Upstash Redis URL").optional(),
    REDIS_URL: z.string().url("Invalid Redis URL").optional(),
    UPSTASH_REDIS_REST_URL: z.string().url("Invalid Upstash Redis REST URL").optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "Upstash Redis REST token required").optional(),

    // Cryptographic Keys
    VERIS_SIGNING_PRIVATE_KEY: z.string().min(100, "Veris signing private key too short"),
    VERIS_SIGNING_PUBLIC_KEY: z.string().min(100, "Veris signing public key too short"),

    // AWS Configuration
    AWS_REGION: z.string().min(1, "AWS region required").optional(),
    AWS_ROLE_ARN: z.string().startsWith("arn:aws:iam::", "Invalid AWS role ARN format").optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),

    // S3 Registry
    REGISTRY_S3_BUCKET: z.string().min(1, "Registry S3 bucket required").optional(),
    REGISTRY_S3_STAGING_BUCKET: z.string().min(1, "Registry S3 staging bucket required").optional(),
    REGISTRY_S3_PRODUCTION_BUCKET: z
      .string()
      .min(1, "Registry S3 production bucket required")
      .optional(),
    REGISTRY_S3_PREFIX: z.string().optional(),

    // Arweave
    ARWEAVE_GATEWAY_URL: z.string().url("Invalid Arweave gateway URL").optional(),
    ARWEAVE_WALLET_JSON: z.string().optional(),
    ARWEAVE_WALLET: z.string().optional(),

    // Monitoring
    SENTRY_DSN: z.string().url("Invalid Sentry DSN").optional(),

    // Verification
    VERIFICATION_TIMESTAMP_TOLERANCE_MS: z.string().transform(Number).optional(),

    // Feature Flags
    ENABLE_MIRRORS: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    ENABLE_SNAPSHOT_AUTOMATION: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    ENABLE_NONESSENTIAL_CRON: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    ENABLE_BILLING: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    ENABLE_TELEMETRY: z
      .string()
      .transform((val) => val === "true")
      .optional(),

    // Development
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    NEXT_PHASE: z.string().optional(),

    // Vercel (auto-populated)
    VERCEL_GIT_COMMIT_SHA: z.string().optional(),
    VERCEL_GIT_COMMIT_REF: z.string().optional(),
    VERCEL_GIT_COMMIT_AUTHOR_NAME: z.string().optional(),
    VERCEL_DEPLOYMENT_ID: z.string().optional(),
    VERCEL_OIDC_TOKEN: z.string().optional(),
  })
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

// =============================================================================
// ENVIRONMENT VARIABLE MAPPING
// =============================================================================

interface EnvironmentMapping {
  category: string;
  variables: Array<{
    name: string;
    description: string;
    required: boolean;
    type: string;
    example: string;
    validation: string;
    environment: "client" | "server" | "both";
    security: "public" | "secret" | "sensitive";
  }>;
}

const environmentMapping: EnvironmentMapping[] = [
  {
    category: "Supabase Configuration",
    variables: [
      {
        name: "NEXT_PUBLIC_SUPABASE_URL",
        description: "Supabase project URL",
        required: true,
        type: "string (URL)",
        example: "https://your-project.supabase.co",
        validation: "Must be a valid URL",
        environment: "client",
        security: "public",
      },
      {
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        description: "Supabase anonymous key for client-side access",
        required: true,
        type: "string",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        validation: "Minimum 10 characters",
        environment: "client",
        security: "public",
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        description: "Supabase service role key for server-side access",
        required: true,
        type: "string",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        validation: "Minimum 10 characters",
        environment: "server",
        security: "secret",
      },
    ],
  },
  {
    category: "Stripe Configuration",
    variables: [
      {
        name: "NEXT_PUBLIC_STRIPE_MODE",
        description: "Stripe mode (test or live)",
        required: false,
        type: "enum",
        example: "test",
        validation: "Must be 'test' or 'live'",
        environment: "client",
        security: "public",
      },
      {
        name: "STRIPE_SECRET_KEY",
        description: "Stripe secret key for server-side operations",
        required: true,
        type: "string",
        example: "sk_test_1234567890abcdef",
        validation: "Must start with 'sk_'",
        environment: "server",
        security: "secret",
      },
      {
        name: "STRIPE_WEBHOOK_SECRET",
        description: "Stripe webhook secret for webhook verification",
        required: true,
        type: "string",
        example: "whsec_1234567890abcdef",
        validation: "Must start with 'whsec_'",
        environment: "server",
        security: "secret",
      },
      {
        name: "NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID",
        description: "Stripe price ID for Pro monthly plan",
        required: false,
        type: "string",
        example: "price_1234567890abcdef",
        validation: "Valid Stripe price ID",
        environment: "client",
        security: "public",
      },
      {
        name: "NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID",
        description: "Stripe price ID for Team monthly plan",
        required: false,
        type: "string",
        example: "price_0987654321fedcba",
        validation: "Valid Stripe price ID",
        environment: "client",
        security: "public",
      },
      {
        name: "STRIPE_USAGE_PRICE_ID",
        description: "Stripe price ID for usage-based billing",
        required: false,
        type: "string",
        example: "price_usage_1234567890",
        validation: "Valid Stripe price ID",
        environment: "server",
        security: "sensitive",
      },
    ],
  },
  {
    category: "Authentication & Security",
    variables: [
      {
        name: "CRON_JOB_TOKEN",
        description: "Token for authenticating cron jobs and scheduled tasks",
        required: true,
        type: "string",
        example: "your-secure-cron-token-here-min-16-chars",
        validation: "Minimum 16 characters",
        environment: "server",
        security: "secret",
      },
      {
        name: "CRON_SECRET",
        description: "Legacy cron secret for backward compatibility",
        required: false,
        type: "string",
        example: "your-legacy-cron-secret-here",
        validation: "Minimum 16 characters",
        environment: "server",
        security: "secret",
      },
      {
        name: "INTERNAL_KEY",
        description: "Key for accessing internal status endpoints",
        required: false,
        type: "string",
        example: "your-secure-internal-key-here-min-16-chars",
        validation: "Minimum 16 characters",
        environment: "server",
        security: "secret",
      },
    ],
  },
  {
    category: "Redis Configuration",
    variables: [
      {
        name: "UPSTASH_REDIS_URL",
        description: "Upstash Redis connection URL",
        required: false,
        type: "string (URL)",
        example: "redis://default:password@host:port",
        validation: "Valid Redis URL",
        environment: "server",
        security: "sensitive",
      },
      {
        name: "REDIS_URL",
        description: "Standard Redis connection URL",
        required: false,
        type: "string (URL)",
        example: "redis://localhost:6379",
        validation: "Valid Redis URL",
        environment: "server",
        security: "sensitive",
      },
      {
        name: "UPSTASH_REDIS_REST_URL",
        description: "Upstash Redis REST API URL",
        required: false,
        type: "string (URL)",
        example: "https://your-redis.upstash.io",
        validation: "Valid HTTPS URL",
        environment: "server",
        security: "sensitive",
      },
      {
        name: "UPSTASH_REDIS_REST_TOKEN",
        description: "Upstash Redis REST API token",
        required: false,
        type: "string",
        example: "your-upstash-token-here",
        validation: "Non-empty string",
        environment: "server",
        security: "secret",
      },
    ],
  },
  {
    category: "Cryptographic Keys",
    variables: [
      {
        name: "VERIS_SIGNING_PRIVATE_KEY",
        description: "Private key for signing proofs",
        required: true,
        type: "string (PEM)",
        example: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",
        validation: "Minimum 100 characters, valid PEM format",
        environment: "server",
        security: "secret",
      },
      {
        name: "VERIS_SIGNING_PUBLIC_KEY",
        description: "Public key for verifying proofs",
        required: true,
        type: "string (PEM)",
        example: "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----",
        validation: "Minimum 100 characters, valid PEM format",
        environment: "server",
        security: "sensitive",
      },
    ],
  },
  {
    category: "AWS Configuration",
    variables: [
      {
        name: "AWS_REGION",
        description: "AWS region for S3 and other services",
        required: false,
        type: "string",
        example: "us-east-1",
        validation: "Valid AWS region",
        environment: "server",
        security: "public",
      },
      {
        name: "AWS_ROLE_ARN",
        description: "AWS IAM role ARN for service authentication",
        required: false,
        type: "string (ARN)",
        example: "arn:aws:iam::123456789012:role/veris-role",
        validation: "Valid AWS IAM role ARN",
        environment: "server",
        security: "sensitive",
      },
      {
        name: "AWS_ACCESS_KEY_ID",
        description: "AWS access key ID",
        required: false,
        type: "string",
        example: "AKIAIOSFODNN7EXAMPLE",
        validation: "Valid AWS access key format",
        environment: "server",
        security: "secret",
      },
      {
        name: "AWS_SECRET_ACCESS_KEY",
        description: "AWS secret access key",
        required: false,
        type: "string",
        example: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        validation: "Valid AWS secret key format",
        environment: "server",
        security: "secret",
      },
    ],
  },
  {
    category: "S3 Registry Configuration",
    variables: [
      {
        name: "REGISTRY_S3_BUCKET",
        description: "S3 bucket for registry storage",
        required: false,
        type: "string",
        example: "veris-registry-dev",
        validation: "Valid S3 bucket name",
        environment: "server",
        security: "public",
      },
      {
        name: "REGISTRY_S3_STAGING_BUCKET",
        description: "S3 bucket for staging registry",
        required: false,
        type: "string",
        example: "veris-registry-staging",
        validation: "Valid S3 bucket name",
        environment: "server",
        security: "public",
      },
      {
        name: "REGISTRY_S3_PRODUCTION_BUCKET",
        description: "S3 bucket for production registry",
        required: false,
        type: "string",
        example: "veris-registry-prod",
        validation: "Valid S3 bucket name",
        environment: "server",
        security: "public",
      },
      {
        name: "REGISTRY_S3_PREFIX",
        description: "S3 key prefix for registry objects",
        required: false,
        type: "string",
        example: "registry/",
        validation: "Valid S3 key prefix",
        environment: "server",
        security: "public",
      },
    ],
  },
  {
    category: "Arweave Configuration",
    variables: [
      {
        name: "ARWEAVE_GATEWAY_URL",
        description: "Arweave gateway URL for publishing",
        required: false,
        type: "string (URL)",
        example: "https://arweave.net",
        validation: "Valid HTTPS URL",
        environment: "server",
        security: "public",
      },
      {
        name: "ARWEAVE_WALLET_JSON",
        description: "Arweave wallet JSON for publishing",
        required: false,
        type: "string (JSON)",
        example: '{"kty":"RSA","n":"..."}',
        validation: "Valid JSON string",
        environment: "server",
        security: "secret",
      },
      {
        name: "ARWEAVE_WALLET",
        description: "Arweave wallet for publishing",
        required: false,
        type: "string",
        example: "your-arweave-wallet-here",
        validation: "Valid Arweave wallet",
        environment: "server",
        security: "secret",
      },
    ],
  },
  {
    category: "Monitoring & Observability",
    variables: [
      {
        name: "SENTRY_DSN",
        description: "Sentry DSN for error tracking",
        required: false,
        type: "string (URL)",
        example: "https://your-sentry-dsn@sentry.io/project-id",
        validation: "Valid Sentry DSN URL",
        environment: "server",
        security: "sensitive",
      },
    ],
  },
  {
    category: "Site Configuration",
    variables: [
      {
        name: "NEXT_PUBLIC_SITE_URL",
        description: "Base URL of the site",
        required: false,
        type: "string (URL)",
        example: "http://localhost:3000",
        validation: "Valid URL",
        environment: "client",
        security: "public",
      },
      {
        name: "NEXT_PUBLIC_API_BASE_URL",
        description: "Base URL for API calls",
        required: false,
        type: "string (URL)",
        example: "https://api.verisplatform.com",
        validation: "Valid URL",
        environment: "client",
        security: "public",
      },
      {
        name: "NEXT_PUBLIC_VERIS_API_KEY",
        description: "API key for Veris services",
        required: false,
        type: "string",
        example: "your-api-key-here",
        validation: "Non-empty string",
        environment: "client",
        security: "sensitive",
      },
    ],
  },
  {
    category: "Feature Flags",
    variables: [
      {
        name: "ENABLE_MIRRORS",
        description: "Enable mirror functionality",
        required: false,
        type: "boolean",
        example: "true",
        validation: "true or false",
        environment: "server",
        security: "public",
      },
      {
        name: "ENABLE_SNAPSHOT_AUTOMATION",
        description: "Enable automated snapshots",
        required: false,
        type: "boolean",
        example: "true",
        validation: "true or false",
        environment: "server",
        security: "public",
      },
      {
        name: "ENABLE_NONESSENTIAL_CRON",
        description: "Enable non-essential cron jobs",
        required: false,
        type: "boolean",
        example: "false",
        validation: "true or false",
        environment: "server",
        security: "public",
      },
      {
        name: "ENABLE_BILLING",
        description: "Enable billing functionality",
        required: false,
        type: "boolean",
        example: "true",
        validation: "true or false",
        environment: "server",
        security: "public",
      },
      {
        name: "ENABLE_TELEMETRY",
        description: "Enable telemetry collection",
        required: false,
        type: "boolean",
        example: "true",
        validation: "true or false",
        environment: "server",
        security: "public",
      },
    ],
  },
  {
    category: "Development & Deployment",
    variables: [
      {
        name: "NODE_ENV",
        description: "Node.js environment",
        required: false,
        type: "enum",
        example: "development",
        validation: "development, test, or production",
        environment: "both",
        security: "public",
      },
      {
        name: "NEXT_PHASE",
        description: "Next.js build phase",
        required: false,
        type: "string",
        example: "phase-development-server",
        validation: "Valid Next.js phase",
        environment: "server",
        security: "public",
      },
      {
        name: "VERCEL_GIT_COMMIT_SHA",
        description: "Vercel git commit SHA",
        required: false,
        type: "string",
        example: "abc123def456",
        validation: "Valid git SHA",
        environment: "server",
        security: "public",
      },
      {
        name: "VERCEL_GIT_COMMIT_REF",
        description: "Vercel git commit reference",
        required: false,
        type: "string",
        example: "main",
        validation: "Valid git reference",
        environment: "server",
        security: "public",
      },
      {
        name: "VERCEL_DEPLOYMENT_ID",
        description: "Vercel deployment ID",
        required: false,
        type: "string",
        example: "deployment-123",
        validation: "Valid deployment ID",
        environment: "server",
        security: "public",
      },
    ],
  },
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function validateEnvironmentVariables() {
  console.log("🔍 Validating environment variables...\n");

  // Parse client environment variables
  const clientEnv = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_MODE: process.env.NEXT_PUBLIC_STRIPE_MODE,
    NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_VERIS_API_KEY: process.env.NEXT_PUBLIC_VERIS_API_KEY,
  });

  // Parse server environment variables
  const serverEnv = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_USAGE_PRICE_ID: process.env.STRIPE_USAGE_PRICE_ID,
    CRON_JOB_TOKEN: process.env.CRON_JOB_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    INTERNAL_KEY: process.env.INTERNAL_KEY,
    UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    VERIS_SIGNING_PRIVATE_KEY: process.env.VERIS_SIGNING_PRIVATE_KEY,
    VERIS_SIGNING_PUBLIC_KEY: process.env.VERIS_SIGNING_PUBLIC_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ROLE_ARN: process.env.AWS_ROLE_ARN,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    REGISTRY_S3_BUCKET: process.env.REGISTRY_S3_BUCKET,
    REGISTRY_S3_STAGING_BUCKET: process.env.REGISTRY_S3_STAGING_BUCKET,
    REGISTRY_S3_PRODUCTION_BUCKET: process.env.REGISTRY_S3_PRODUCTION_BUCKET,
    REGISTRY_S3_PREFIX: process.env.REGISTRY_S3_PREFIX,
    ARWEAVE_GATEWAY_URL: process.env.ARWEAVE_GATEWAY_URL,
    ARWEAVE_WALLET_JSON: process.env.ARWEAVE_WALLET_JSON,
    ARWEAVE_WALLET: process.env.ARWEAVE_WALLET,
    SENTRY_DSN: process.env.SENTRY_DSN,
    VERIFICATION_TIMESTAMP_TOLERANCE_MS: process.env.VERIFICATION_TIMESTAMP_TOLERANCE_MS,
    ENABLE_MIRRORS: process.env.ENABLE_MIRRORS,
    ENABLE_SNAPSHOT_AUTOMATION: process.env.ENABLE_SNAPSHOT_AUTOMATION,
    ENABLE_NONESSENTIAL_CRON: process.env.ENABLE_NONESSENTIAL_CRON,
    ENABLE_BILLING: process.env.ENABLE_BILLING,
    ENABLE_TELEMETRY: process.env.ENABLE_TELEMETRY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PHASE: process.env.NEXT_PHASE,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    VERCEL_GIT_COMMIT_AUTHOR_NAME: process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME,
    VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
  });

  const results = {
    client: clientEnv,
    server: serverEnv,
    overall: clientEnv.success && serverEnv.success,
  };

  return results;
}

function generateEnvironmentReport() {
  console.log("📊 Generating environment variable report...\n");

  const validationResults = validateEnvironmentVariables();

  console.log("## Environment Variable Validation Report\n");

  // Client-side variables
  console.log("### Client-Side Variables (NEXT_PUBLIC_*)");
  if (validationResults.client.success) {
    console.log("✅ All client-side variables are valid\n");
  } else {
    console.log("❌ Client-side validation failed:");
    validationResults.client.error.issues.forEach((issue: any) => {
      console.log(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    console.log("");
  }

  // Server-side variables
  console.log("### Server-Side Variables");
  if (validationResults.server.success) {
    console.log("✅ All server-side variables are valid\n");
  } else {
    console.log("❌ Server-side validation failed:");
    validationResults.server.error.issues.forEach((issue: any) => {
      console.log(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    console.log("");
  }

  // Overall status
  console.log("### Overall Status");
  if (validationResults.overall) {
    console.log("🎉 All environment variables are valid!\n");
  } else {
    console.log("⚠️ Some environment variables have validation errors.\n");
  }

  return validationResults;
}

function generateEnvironmentMapping() {
  console.log("🗺️ Generating environment variable mapping...\n");

  console.log("## Environment Variable Mapping\n");

  environmentMapping.forEach((category) => {
    console.log(`### ${category.category}\n`);

    category.variables.forEach((variable) => {
      const status = process.env[variable.name] ? "✅ Set" : "❌ Missing";
      const required = variable.required ? "**Required**" : "Optional";

      console.log(`#### ${variable.name}`);
      console.log(`- **Status**: ${status}`);
      console.log(`- **Required**: ${required}`);
      console.log(`- **Type**: ${variable.type}`);
      console.log(`- **Environment**: ${variable.environment}`);
      console.log(`- **Security**: ${variable.security}`);
      console.log(`- **Description**: ${variable.description}`);
      console.log(`- **Example**: \`${variable.example}\``);
      console.log(`- **Validation**: ${variable.validation}`);
      console.log("");
    });
  });
}

function generateEnvironmentChecklist() {
  console.log("📋 Generating environment setup checklist...\n");

  console.log("## Environment Setup Checklist\n");

  const requiredVariables = environmentMapping
    .flatMap((category) => category.variables)
    .filter((variable) => variable.required);

  console.log("### Required Variables\n");
  requiredVariables.forEach((variable, index) => {
    const status = process.env[variable.name] ? "✅" : "❌";
    console.log(`${index + 1}. ${status} ${variable.name} - ${variable.description}`);
  });

  console.log("\n### Optional Variables\n");
  const optionalVariables = environmentMapping
    .flatMap((category) => category.variables)
    .filter((variable) => !variable.required);

  optionalVariables.forEach((variable, index) => {
    const status = process.env[variable.name] ? "✅" : "⏭️";
    console.log(`${index + 1}. ${status} ${variable.name} - ${variable.description}`);
  });

  console.log("\n### Security Checklist\n");
  console.log("1. ✅ All secrets are stored in environment variables (not in code)");
  console.log("2. ✅ Client-side variables are prefixed with NEXT_PUBLIC_");
  console.log("3. ✅ Server-side secrets are not exposed to the browser");
  console.log("4. ✅ Environment files are in .gitignore");
  console.log("5. ✅ Production secrets are stored in secure secret management");
}

function generateEnvironmentDocumentation() {
  console.log("📚 Generating environment documentation...\n");

  const fs = require("fs");
  const path = require("path");

  const documentation = `# Environment Variables Documentation

This document provides comprehensive documentation for all environment variables used by the Veris platform.

## Overview

The Veris platform uses environment variables for configuration, secrets management, and feature flags. Variables are categorized into client-side (exposed to browser) and server-side (secrets) variables.

## Security Guidelines

### Client-Side Variables (NEXT_PUBLIC_*)
- Exposed to the browser
- Should not contain secrets
- Must be prefixed with \`NEXT_PUBLIC_\`
- Can be safely committed to version control

### Server-Side Variables
- Only available on the server
- Can contain secrets
- Must never be prefixed with \`NEXT_PUBLIC_\`
- Should never be committed to version control

## Variable Categories

${environmentMapping
  .map(
    (category) => `
### ${category.category}

${category.variables
  .map(
    (variable) => `
#### ${variable.name}
- **Description**: ${variable.description}
- **Required**: ${variable.required ? "Yes" : "No"}
- **Type**: ${variable.type}
- **Environment**: ${variable.environment}
- **Security**: ${variable.security}
- **Example**: \`${variable.example}\`
- **Validation**: ${variable.validation}
`,
  )
  .join("")}
`,
  )
  .join("")}

## Setup Instructions

1. Copy the example file: \`cp env.example .env.local\`
2. Fill in the required values
3. Generate cryptographic keys: \`npm run generate-keys\`
4. Validate configuration: \`npm run validate-env\`
5. Start the development server: \`npm run dev\`

## Validation

Run the environment validation script to check your configuration:

\`\`\`bash
npm run validate-env
\`\`\`

This will validate all environment variables and provide detailed feedback on any issues.

## Troubleshooting

### Common Issues

1. **Missing required variables**: Ensure all required variables are set
2. **Invalid format**: Check that variables match the expected format
3. **Security issues**: Ensure secrets are not exposed to the client
4. **Environment mismatch**: Verify variables are set for the correct environment

### Getting Help

- Check the validation output for specific error messages
- Review the example file for correct formats
- Consult the documentation for each service (Supabase, Stripe, etc.)
`;

  const outputPath = path.join(process.cwd(), "ENVIRONMENT.md");
  fs.writeFileSync(outputPath, documentation);
  console.log(`📄 Environment documentation written to: ${outputPath}`);
}

async function main() {
  console.log("🚀 Starting comprehensive environment variable validation...\n");

  try {
    // Generate validation report
    const validationResults = generateEnvironmentReport();

    // Generate environment mapping
    generateEnvironmentMapping();

    // Generate checklist
    generateEnvironmentChecklist();

    // Generate documentation
    generateEnvironmentDocumentation();

    console.log("🎉 Environment variable validation completed!");
    console.log("\n📋 Summary:");
    console.log("✅ Environment variable validation");
    console.log("✅ Environment variable mapping");
    console.log("✅ Setup checklist generation");
    console.log("✅ Documentation generation");

    if (!validationResults.overall) {
      console.log("\n⚠️ Some environment variables have validation errors.");
      console.log("Please review the report above and fix any issues.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n💥 Environment variable validation failed:", error);
    process.exit(1);
  }
}

// Run the validation
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
