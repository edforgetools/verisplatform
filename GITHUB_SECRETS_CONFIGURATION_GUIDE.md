# 🔐 GitHub Secrets Configuration Guide

## Step 1: Configure GitHub Secrets

You need to add the following secrets to your GitHub repository. Go to:
**Repository Settings > Secrets and variables > Actions > Repository secrets**

### 🔑 **Required Secrets (Add these to GitHub)**

#### **Core Application Secrets**

**Supabase Configuration:**
```
STAGING_SUPABASE_URL=https://your-staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STAGING_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROD_SUPABASE_URL=https://your-prod-project.supabase.co
PROD_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROD_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ACCESS_TOKEN=your-supabase-cli-token
```

**Stripe Configuration:**
```
STAGING_STRIPE_SECRET_KEY=sk_test_your_staging_stripe_secret_key
STAGING_STRIPE_WEBHOOK_SECRET=whsec_your_staging_webhook_secret
PROD_STRIPE_SECRET_KEY=sk_live_your_prod_stripe_secret_key
PROD_STRIPE_WEBHOOK_SECRET=whsec_your_prod_webhook_secret
```

**Cryptographic Keys (Generated):**
```
STAGING_VERIS_SIGNING_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----

STAGING_VERIS_SIGNING_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----

PROD_VERIS_SIGNING_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----

PROD_VERIS_SIGNING_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
```

**Authentication Tokens:**
```
STAGING_CRON_JOB_TOKEN=staging-cron-token-minimum-16-chars
PROD_CRON_JOB_TOKEN=prod-cron-token-minimum-16-chars
```

#### **AWS Configuration**

**AWS Credentials:**
```
STAGING_AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
STAGING_AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
PROD_AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
PROD_AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**S3 Registry Buckets:**
```
STAGING_REGISTRY_S3_BUCKET=veris-registry-staging
PROD_REGISTRY_S3_BUCKET=veris-registry-prod
```

#### **Vercel Configuration**

```
VERCEL_TOKEN=your-vercel-api-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

#### **Optional Services**

**Arweave (Optional):**
```
STAGING_ARWEAVE_WALLET={"kty":"RSA","n":"your-arweave-wallet-json"}
PROD_ARWEAVE_WALLET={"kty":"RSA","n":"your-arweave-wallet-json"}
```

**Redis (Optional):**
```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Monitoring (Optional):**
```
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook
```

## 🔑 **How to Get Real Values**

### **Supabase Keys:**
1. Go to your Supabase project dashboard
2. Go to Settings > API
3. Copy the Project URL, anon key, and service_role key
4. Create separate projects for staging and production

### **Stripe Keys:**
1. Go to Stripe Dashboard > Developers > API keys
2. Use test keys for staging (sk_test_...)
3. Use live keys for production (sk_live_...)
4. Create webhook endpoints and get webhook secrets

### **AWS Keys:**
1. Go to AWS IAM > Users > Create user
2. Attach policies for S3 access
3. Create access keys
4. Create S3 buckets for registry storage

### **Vercel Keys:**
1. Go to Vercel Dashboard > Settings > Tokens
2. Create a new token
3. Get org ID and project ID from project settings

### **Cryptographic Keys:**
Use the generated keys from `frontend/keys/` directory:
```bash
cd frontend && pnpm run generate-keys
```

## ⚠️ **Important Notes**

1. **Use different values for staging and production**
2. **Keep secrets secure** - never commit them to code
3. **Test with staging first** before production
4. **Rotate keys regularly** for security
5. **Use least-privilege access** for all services

## ✅ **Verification**

After adding secrets, test them with:
```bash
cd frontend && pnpm run validate-services
```

This will verify all external service configurations are working correctly.
