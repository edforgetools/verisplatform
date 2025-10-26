import { z } from "zod";

// Check if we're in CI environment
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

// =============================================================================
// CLIENT-SIDE ENVIRONMENT VARIABLES (NEXT_PUBLIC_*)
// =============================================================================
// These variables are exposed to the browser and should not contain secrets
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: isCI
    ? z.string().min(1, "Supabase URL required")
    : z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: isCI
    ? z.string().min(1, "Supabase anon key required")
    : z.string().min(10, "Supabase anon key too short"),
  NEXT_PUBLIC_STRIPE_MODE: z.enum(["test", "live"]).optional(),
  NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: isCI
    ? z.string().min(1, "Site URL required").optional()
    : z.string().url().optional(),
});

// =============================================================================
// SERVER-SIDE ENVIRONMENT VARIABLES
// =============================================================================
// These variables are only available on the server and can contain secrets
const serverSchema = z
  .object({
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: isCI
      ? z.string().min(1, "Supabase service role key required")
      : z.string().min(10, "Supabase service role key too short"),

    // Stripe
    STRIPE_SECRET_KEY: isCI
      ? z.string().min(1, "Stripe secret key required")
      : z.string().startsWith("sk_", "Invalid Stripe secret key format"),
    STRIPE_WEBHOOK_SECRET: isCI
      ? z.string().min(1, "Stripe webhook secret required")
      : z.string().startsWith("whsec_", "Invalid Stripe webhook secret format"),
    STRIPE_USAGE_PRICE_ID: z.string().optional(),

    // CRON Authentication
    CRON_JOB_TOKEN: isCI
      ? z.string().min(1, "CRON token required").optional()
      : z.string().min(16, "CRON token must be at least 16 characters").optional(),
    CRON_SECRET: isCI
      ? z.string().min(1, "CRON secret required").optional()
      : z.string().min(16, "CRON secret must be at least 16 characters").optional(),

    // Redis
    UPSTASH_REDIS_URL: z.string().url("Invalid Upstash Redis URL").optional(),
    REDIS_URL: z.string().url("Invalid Redis URL").optional(),
    UPSTASH_REDIS_REST_URL: z.string().url("Invalid Upstash Redis REST URL").optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "Upstash Redis REST token required").optional(),

    // Veris Cryptographic Keys
    VERIS_SIGNING_PRIVATE_KEY: isCI
      ? z.string().min(1, "Veris signing private key required")
      : z.string().min(100, "Veris signing private key too short"),
    VERIS_SIGNING_PUBLIC_KEY: isCI
      ? z.string().min(1, "Veris signing public key required")
      : z.string().min(100, "Veris signing public key too short"),

    // AWS Configuration
    AWS_REGION: z.string().min(1, "AWS region required").optional(),
    AWS_ROLE_ARN: z.string().startsWith("arn:aws:iam::", "Invalid AWS role ARN format").optional(),
    AWS_ROLE_VERCEL_ARN: z
      .string()
      .startsWith("arn:aws:iam::", "Invalid Vercel AWS role ARN format")
      .optional(),
    AWS_ROLE_GITHUB_ARN: z
      .string()
      .startsWith("arn:aws:iam::", "Invalid GitHub AWS role ARN format")
      .optional(),

    // S3 Registry
    REGISTRY_S3_BUCKET: z.string().min(1, "Registry S3 bucket required").optional(),
    REGISTRY_S3_STAGING_BUCKET: z.string().min(1, "Registry S3 staging bucket required").optional(),
    REGISTRY_S3_PRODUCTION_BUCKET: z
      .string()
      .min(1, "Registry S3 production bucket required")
      .optional(),
    REGISTRY_BUCKET_STAGING: z.string().min(1, "Registry staging bucket required").optional(),
    REGISTRY_BUCKET_PROD: z.string().min(1, "Registry production bucket required").optional(),
    REGISTRY_S3_PREFIX: z.string().optional(),

    // Arweave
    ARWEAVE_GATEWAY_URL: z.string().url("Invalid Arweave gateway URL").optional(),
    ARWEAVE_WALLET_JSON: z.string().optional(),

    // Monitoring
    SENTRY_DSN: z.string().url("Invalid Sentry DSN").optional(),

    // Internal Status Page
    INTERNAL_KEY: z.string().min(16, "Internal key must be at least 16 characters").optional(),

    // Application Configuration
    APP_BASE_URL: z.string().url("Invalid app base URL").optional(),
    NEXT_PUBLIC_APP_URL: z.string().url("Invalid public app URL").optional(),

    // Deployment and Alert Configuration
    DEPLOY_MODE: z.enum(["staging", "prod"]).optional(),
    STRIPE_MODE: z.enum(["test", "live"]).optional(),
    C2PA_MODE: z.enum(["on", "off"]).optional(),
    MIRROR_MODE: z.enum(["auto", "manual"]).optional(),
    ALERT_MODE: z.enum(["slack", "email", "none"]).optional(),
    SLACK_WEBHOOK_URL: z.string().url("Invalid Slack webhook URL").optional(),

    // Supabase Access Token
    SUPABASE_ACCESS_TOKEN: z.string().min(1, "Supabase access token required").optional(),

    // Verification
    VERIFICATION_TIMESTAMP_TOLERANCE_MS: z.string().transform(Number).optional(),

    // Feature Flags (default off for MVP)
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
// ENVIRONMENT VALIDATION AND PARSING
// =============================================================================

function createEnv() {
  // Parse client environment variables
  const clientEnv = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_MODE: process.env.NEXT_PUBLIC_STRIPE_MODE,
    NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  // Parse server environment variables
  const serverEnv = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_USAGE_PRICE_ID: process.env.STRIPE_USAGE_PRICE_ID,
    CRON_JOB_TOKEN: process.env.CRON_JOB_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    VERIS_SIGNING_PRIVATE_KEY: process.env.VERIS_SIGNING_PRIVATE_KEY,
    VERIS_SIGNING_PUBLIC_KEY: process.env.VERIS_SIGNING_PUBLIC_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ROLE_ARN: process.env.AWS_ROLE_ARN,
    AWS_ROLE_VERCEL_ARN: process.env.AWS_ROLE_VERCEL_ARN,
    AWS_ROLE_GITHUB_ARN: process.env.AWS_ROLE_GITHUB_ARN,
    REGISTRY_S3_BUCKET: process.env.REGISTRY_S3_BUCKET,
    REGISTRY_S3_STAGING_BUCKET: process.env.REGISTRY_S3_STAGING_BUCKET,
    REGISTRY_S3_PRODUCTION_BUCKET: process.env.REGISTRY_S3_PRODUCTION_BUCKET,
    REGISTRY_BUCKET_STAGING: process.env.REGISTRY_BUCKET_STAGING,
    REGISTRY_BUCKET_PROD: process.env.REGISTRY_BUCKET_PROD,
    REGISTRY_S3_PREFIX: process.env.REGISTRY_S3_PREFIX,
    ARWEAVE_GATEWAY_URL: process.env.ARWEAVE_GATEWAY_URL,
    ARWEAVE_WALLET_JSON: process.env.ARWEAVE_WALLET_JSON,
    SENTRY_DSN: process.env.SENTRY_DSN,
    INTERNAL_KEY: process.env.INTERNAL_KEY,
    APP_BASE_URL: process.env.APP_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DEPLOY_MODE: process.env.DEPLOY_MODE,
    STRIPE_MODE: process.env.STRIPE_MODE,
    C2PA_MODE: process.env.C2PA_MODE,
    MIRROR_MODE: process.env.MIRROR_MODE,
    ALERT_MODE: process.env.ALERT_MODE,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
    VERIFICATION_TIMESTAMP_TOLERANCE_MS: process.env.VERIFICATION_TIMESTAMP_TOLERANCE_MS,
    ENABLE_MIRRORS: process.env.ENABLE_MIRRORS,
    ENABLE_SNAPSHOT_AUTOMATION: process.env.ENABLE_SNAPSHOT_AUTOMATION,
    ENABLE_NONESSENTIAL_CRON: process.env.ENABLE_NONESSENTIAL_CRON,
  });

  // Handle validation errors
  if (!clientEnv.success) {
    const errors = clientEnv.error.issues
      .map((err: any) => `${err.path.join(".")}: ${err.message}`)
      .join("\n");
    throw new Error(`Client environment validation failed:\n${errors}`);
  }

  if (!serverEnv.success) {
    const errors = serverEnv.error.issues
      .map((err: any) => `${err.path.join(".")}: ${err.message}`)
      .join("\n");
    throw new Error(`Server environment validation failed:\n${errors}`);
  }

  return {
    client: clientEnv.data,
    server: serverEnv.data,
  };
}

// Export validated environment variables
// Handle test environment by providing default values
let ENV: ReturnType<typeof createEnv>;
try {
  ENV = createEnv();
} catch (error) {
  // In test environment, provide default values
  if (process.env.NODE_ENV === "test") {
    ENV = {
      client: {
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        NEXT_PUBLIC_STRIPE_MODE: "test",
        NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: "test-pro-price",
        NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID: "test-team-price",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      },
      server: {
        SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
        STRIPE_SECRET_KEY: "sk_test_placeholder",
        STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
        STRIPE_USAGE_PRICE_ID: "test-usage-price",
        CRON_JOB_TOKEN: "test-cron-token-12345678901234567890",
        UPSTASH_REDIS_REST_URL: "https://test-redis.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
        VERIS_SIGNING_PRIVATE_KEY: "test-private-key-".repeat(10),
        VERIS_SIGNING_PUBLIC_KEY: "test-public-key-".repeat(10),
        AWS_REGION: "us-east-1",
        AWS_ROLE_ARN: "arn:aws:iam::123456789012:role/test-role",
        AWS_ROLE_VERCEL_ARN: "arn:aws:iam::123456789012:role/vercel-role",
        AWS_ROLE_GITHUB_ARN: "arn:aws:iam::123456789012:role/github-role",
        REGISTRY_S3_BUCKET: "test-bucket",
        REGISTRY_S3_STAGING_BUCKET: "test-staging-bucket",
        REGISTRY_S3_PRODUCTION_BUCKET: "test-production-bucket",
        REGISTRY_BUCKET_STAGING: "test-staging-bucket",
        REGISTRY_BUCKET_PROD: "test-production-bucket",
        REGISTRY_S3_PREFIX: "registry/",
        ARWEAVE_GATEWAY_URL: "https://arweave.net",
        ARWEAVE_WALLET_JSON: '{"kty":"EC","crv":"P-256","x":"test","y":"test","d":"test"}',
        SENTRY_DSN: "https://test@sentry.io/test",
        INTERNAL_KEY: "test-internal-key",
        APP_BASE_URL: "https://test.verisplatform.com",
        NEXT_PUBLIC_APP_URL: "https://test.verisplatform.com",
        DEPLOY_MODE: "staging",
        STRIPE_MODE: "test",
        C2PA_MODE: "off",
        MIRROR_MODE: "auto",
        ALERT_MODE: "slack",
        SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/test/webhook",
        SUPABASE_ACCESS_TOKEN: "test-access-token",
        VERIFICATION_TIMESTAMP_TOLERANCE_MS: 300000,
        ENABLE_MIRRORS: false,
        ENABLE_SNAPSHOT_AUTOMATION: false,
        ENABLE_NONESSENTIAL_CRON: false,
      },
    };
  } else {
    throw error;
  }
}

export { ENV };

// Export client environment for use in client-side code
export const ENV_CLIENT = ENV.client;

/**
 * Get the CRON key from environment variables.
 * Supports both CRON_JOB_TOKEN and CRON_SECRET for backward compatibility.
 */
export function getCronKey(): string {
  const CRON_KEY = ENV.server.CRON_JOB_TOKEN ?? ENV.server.CRON_SECRET ?? "";
  if (!CRON_KEY) {
    throw new Error("Missing CRON_JOB_TOKEN (or CRON_SECRET)");
  }
  return CRON_KEY;
}

/**
 * Validate CRON authentication from request headers
 */
export function validateCronAuth(request: Request): boolean {
  const CRON_KEY = getCronKey();
  return request.headers.get("x-cron-key") === CRON_KEY;
}

/**
 * Get Stripe configuration based on mode
 */
export function getStripeConfig() {
  const mode = ENV.client.NEXT_PUBLIC_STRIPE_MODE || "test";

  return {
    mode,
    isLive: mode === "live",
    isTest: mode === "test",
    secretKey: ENV.server.STRIPE_SECRET_KEY,
    webhookSecret: ENV.server.STRIPE_WEBHOOK_SECRET,
    proPriceId: ENV.client.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
    teamPriceId: ENV.client.NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID,
    usagePriceId: ENV.server.STRIPE_USAGE_PRICE_ID,
  };
}

/**
 * Validate internal authentication from request headers
 */
export function validateInternalAuth(request: Request): boolean {
  const internalKey = ENV.server.INTERNAL_KEY;
  if (!internalKey) {
    return false;
  }
  return request.headers.get("x-internal-key") === internalKey;
}

/**
 * Feature flag helpers - all default to false for MVP
 */
export function isMirrorsEnabled(): boolean {
  return ENV.server.ENABLE_MIRRORS === true;
}

export function isSnapshotAutomationEnabled(): boolean {
  return ENV.server.ENABLE_SNAPSHOT_AUTOMATION === true;
}

export function isNonessentialCronEnabled(): boolean {
  return ENV.server.ENABLE_NONESSENTIAL_CRON === true;
}
