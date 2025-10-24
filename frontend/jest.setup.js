// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock environment variables for testing - MUST be set before any modules are loaded
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.NEXT_PUBLIC_STRIPE_MODE = "test";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "placeholder-service-key";
process.env.VERIS_SIGNING_PRIVATE_KEY =
  process.env.VERIS_SIGNING_PRIVATE_KEY || "placeholder-private-key-".repeat(10);
process.env.VERIS_SIGNING_PUBLIC_KEY =
  process.env.VERIS_SIGNING_PUBLIC_KEY || "placeholder-public-key-".repeat(10);
process.env.CRON_JOB_TOKEN = process.env.CRON_JOB_TOKEN || "placeholder-cron-token";
process.env.UPSTASH_REDIS_REST_URL =
  process.env.UPSTASH_REDIS_REST_URL || "https://placeholder-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder-redis-token";
process.env.supabaseservicekey = process.env.supabaseservicekey || "placeholder-service-key";
process.env.REGISTRY_S3_BUCKET = process.env.REGISTRY_S3_BUCKET || "test-bucket";
process.env.ARWEAVE_WALLET_JSON =
  process.env.ARWEAVE_WALLET_JSON || '{"kty":"EC","crv":"P-256","x":"test","y":"test","d":"test"}';
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";

// This file only contains environment variables that need to be set before any modules are loaded
// All other mocks are in jest.setup.after.js
