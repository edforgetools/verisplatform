# GitHub Secrets Management Guide

This document outlines all required secrets for GitHub Actions workflows to ensure consistent deployments.

## Required GitHub Secrets

### Core Application Secrets

#### Supabase Configuration

- `STAGING_SUPABASE_URL` - Staging Supabase project URL
- `STAGING_SUPABASE_ANON_KEY` - Staging Supabase anonymous key
- `STAGING_SUPABASE_SERVICE_KEY` - Staging Supabase service role key
- `PROD_SUPABASE_URL` - Production Supabase project URL
- `PROD_SUPABASE_ANON_KEY` - Production Supabase anonymous key
- `PROD_SUPABASE_SERVICE_KEY` - Production Supabase service role key
- `SUPABASE_ACCESS_TOKEN` - Supabase CLI access token for migrations

#### Stripe Configuration

- `STAGING_STRIPE_SECRET_KEY` - Staging Stripe secret key (sk*test*...)
- `STAGING_STRIPE_WEBHOOK_SECRET` - Staging Stripe webhook secret (whsec\_...)
- `PROD_STRIPE_SECRET_KEY` - Production Stripe secret key (sk*live*...)
- `PROD_STRIPE_WEBHOOK_SECRET` - Production Stripe webhook secret (whsec\_...)

#### Cryptographic Keys

- `STAGING_VERIS_SIGNING_PRIVATE_KEY` - Staging Veris signing private key (PEM format)
- `STAGING_VERIS_SIGNING_PUBLIC_KEY` - Staging Veris signing public key (PEM format)
- `PROD_VERIS_SIGNING_PRIVATE_KEY` - Production Veris signing private key (PEM format)
- `PROD_VERIS_SIGNING_PUBLIC_KEY` - Production Veris signing public key (PEM format)

#### Authentication Tokens

- `STAGING_CRON_JOB_TOKEN` - Staging CRON job authentication token (min 16 chars)
- `PROD_CRON_JOB_TOKEN` - Production CRON job authentication token (min 16 chars)

### AWS Configuration

#### AWS Credentials

- `STAGING_AWS_ACCESS_KEY_ID` - Staging AWS access key ID
- `STAGING_AWS_SECRET_ACCESS_KEY` - Staging AWS secret access key
- `PROD_AWS_ACCESS_KEY_ID` - Production AWS access key ID
- `PROD_AWS_SECRET_ACCESS_KEY` - Production AWS secret access key

#### S3 Registry Buckets

- `STAGING_REGISTRY_S3_BUCKET` - Staging S3 bucket name
- `PROD_REGISTRY_S3_BUCKET` - Production S3 bucket name

### Vercel Configuration

- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### External Services

#### Arweave

- `STAGING_ARWEAVE_WALLET` - Staging Arweave wallet JSON
- `PROD_ARWEAVE_WALLET` - Production Arweave wallet JSON

#### Redis (Optional)

- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token

#### Monitoring (Optional)

- `SENTRY_DSN` - Sentry DSN for error tracking
- `SLACK_WEBHOOK_URL` - Slack webhook URL for notifications

## Environment Variable Mapping

The following environment variables are automatically set in GitHub Actions:

### Staging Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=${{ secrets.STAGING_SUPABASE_URL }}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.STAGING_SUPABASE_ANON_KEY }}
NEXT_PUBLIC_STRIPE_MODE=test
NEXT_PUBLIC_SITE_URL=https://staging.verisplatform.com
CRON_JOB_TOKEN=${{ secrets.STAGING_CRON_JOB_TOKEN }}
STRIPE_SECRET_KEY=${{ secrets.STAGING_STRIPE_SECRET_KEY }}
STRIPE_WEBHOOK_SECRET=${{ secrets.STAGING_STRIPE_WEBHOOK_SECRET }}
SUPABASE_SERVICE_ROLE_KEY=${{ secrets.STAGING_SUPABASE_SERVICE_KEY }}
VERIS_SIGNING_PRIVATE_KEY=${{ secrets.STAGING_VERIS_SIGNING_PRIVATE_KEY }}
VERIS_SIGNING_PUBLIC_KEY=${{ secrets.STAGING_VERIS_SIGNING_PUBLIC_KEY }}
AWS_ACCESS_KEY_ID=${{ secrets.STAGING_AWS_ACCESS_KEY_ID }}
AWS_SECRET_ACCESS_KEY=${{ secrets.STAGING_AWS_SECRET_ACCESS_KEY }}
REGISTRY_S3_BUCKET=${{ secrets.STAGING_REGISTRY_S3_BUCKET }}
ARWEAVE_WALLET=${{ secrets.STAGING_ARWEAVE_WALLET }}
```

### Production Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=${{ secrets.PROD_SUPABASE_URL }}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.PROD_SUPABASE_ANON_KEY }}
NEXT_PUBLIC_STRIPE_MODE=live
NEXT_PUBLIC_SITE_URL=https://verisplatform.com
CRON_JOB_TOKEN=${{ secrets.PROD_CRON_JOB_TOKEN }}
STRIPE_SECRET_KEY=${{ secrets.PROD_STRIPE_SECRET_KEY }}
STRIPE_WEBHOOK_SECRET=${{ secrets.PROD_STRIPE_WEBHOOK_SECRET }}
SUPABASE_SERVICE_ROLE_KEY=${{ secrets.PROD_SUPABASE_SERVICE_KEY }}
VERIS_SIGNING_PRIVATE_KEY=${{ secrets.PROD_VERIS_SIGNING_PRIVATE_KEY }}
VERIS_SIGNING_PUBLIC_KEY=${{ secrets.PROD_VERIS_SIGNING_PUBLIC_KEY }}
AWS_ACCESS_KEY_ID=${{ secrets.PROD_AWS_ACCESS_KEY_ID }}
AWS_SECRET_ACCESS_KEY=${{ secrets.PROD_AWS_SECRET_ACCESS_KEY }}
REGISTRY_S3_BUCKET=${{ secrets.PROD_REGISTRY_S3_BUCKET }}
ARWEAVE_WALLET=${{ secrets.PROD_ARWEAVE_WALLET }}
```

## Setup Instructions

1. **Generate Cryptographic Keys**:

   ```bash
   cd frontend
   pnpm run generate-keys
   ```

2. **Configure Supabase**:

   - Create staging and production projects
   - Get URLs and keys from project settings
   - Generate service role keys

3. **Configure Stripe**:

   - Create staging and production accounts
   - Generate API keys and webhook secrets
   - Set up webhook endpoints

4. **Configure AWS**:

   - Create IAM users with S3 permissions
   - Create S3 buckets for registry storage
   - Generate access keys

5. **Configure Vercel**:

   - Get API token from account settings
   - Get organization and project IDs

6. **Add Secrets to GitHub**:
   - Go to repository Settings > Secrets and variables > Actions
   - Add each secret with the exact name listed above

## Validation

Run the following to validate secrets are properly configured:

```bash
# Test environment validation
pnpm --filter frontend run validate-env

# Test key generation
pnpm --filter frontend run generate-keys

# Test pilot readiness
pnpm --filter frontend run test:pilot-readiness
```

## Security Notes

- Never commit secrets to the repository
- Use different keys for staging and production
- Rotate keys regularly (every 6 months)
- Monitor secret usage in GitHub Actions logs
- Use least-privilege access for all services
