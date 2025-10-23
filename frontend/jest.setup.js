// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key-1234567890';
process.env.supabaseservicekey =
  process.env.supabaseservicekey || 'test-service-key-1234567890';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_1234567890';
process.env.STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_1234567890';
process.env.VERIS_SIGNING_PRIVATE_KEY = process.env.VERIS_SIGNING_PRIVATE_KEY || 
  'test-private-key-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
process.env.VERIS_SIGNING_PUBLIC_KEY = process.env.VERIS_SIGNING_PUBLIC_KEY || 
  'test-public-key-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
process.env.CRON_JOB_TOKEN = process.env.CRON_JOB_TOKEN || 'test-cron-token-1234567890';
