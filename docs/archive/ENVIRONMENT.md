# Environment Variables Documentation

This document provides comprehensive documentation for all environment variables used by the Veris platform.

## Overview

The Veris platform uses environment variables for configuration, secrets management, and feature flags. Variables are categorized into client-side (exposed to browser) and server-side (secrets) variables.

## Security Guidelines

### Client-Side Variables (NEXT*PUBLIC*\*)

- Exposed to the browser
- Should not contain secrets
- Must be prefixed with `NEXT_PUBLIC_`
- Can be safely committed to version control

### Server-Side Variables

- Only available on the server
- Can contain secrets
- Must never be prefixed with `NEXT_PUBLIC_`
- Should never be committed to version control

## Variable Categories

### Supabase Configuration

#### NEXT_PUBLIC_SUPABASE_URL

- **Description**: Supabase project URL for client-side access
- **Required**: Yes
- **Type**: string (URL)
- **Environment**: client
- **Security**: public
- **Example**: `https://your-project.supabase.co`
- **Validation**: Must be a valid HTTPS URL
- **Notes**: This URL is exposed to the browser and should not contain secrets

#### NEXT_PUBLIC_SUPABASE_ANON_KEY

- **Description**: Supabase anonymous key for client-side database access
- **Required**: Yes
- **Type**: string (JWT)
- **Environment**: client
- **Security**: public
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Validation**: Minimum 10 characters, valid JWT format
- **Notes**: This key is exposed to the browser and has limited permissions

#### supabaseservicekey

- **Description**: Supabase service role key for server-side database access
- **Required**: Yes
- **Type**: string (JWT)
- **Environment**: server
- **Security**: secret
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Validation**: Minimum 10 characters, valid JWT format
- **Notes**: This key has elevated permissions and should never be exposed to the client

### Stripe Configuration

#### NEXT_PUBLIC_STRIPE_MODE

- **Description**: Stripe mode (test or live) - controls which keys and price IDs are used
- **Required**: No
- **Type**: enum
- **Environment**: client
- **Security**: public
- **Example**: `test`
- **Validation**: Must be 'test' or 'live'
- **Default**: `test`
- **Notes**: Set to 'live' for production, 'test' for development

#### STRIPE_SECRET_KEY

- **Description**: Stripe secret key for server-side payment operations
- **Required**: Yes
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `sk_test_1234567890abcdef`
- **Validation**: Must start with 'sk\_'
- **Dependencies**: NEXT_PUBLIC_STRIPE_MODE
- **Notes**: Use test keys for development, live keys for production

#### STRIPE_WEBHOOK_SECRET

- **Description**: Stripe webhook secret for webhook signature verification
- **Required**: Yes
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `whsec_1234567890abcdef`
- **Validation**: Must start with 'whsec\_'
- **Notes**: Get this from your Stripe dashboard webhook settings

#### NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID

- **Description**: Stripe price ID for Pro monthly subscription plan
- **Required**: No
- **Type**: string
- **Environment**: client
- **Security**: public
- **Example**: `price_1234567890abcdef`
- **Validation**: Valid Stripe price ID format
- **Dependencies**: NEXT_PUBLIC_STRIPE_MODE
- **Notes**: Create this in your Stripe dashboard under Products > Pricing

#### NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID

- **Description**: Stripe price ID for Team monthly subscription plan
- **Required**: No
- **Type**: string
- **Environment**: client
- **Security**: public
- **Example**: `price_0987654321fedcba`
- **Validation**: Valid Stripe price ID format
- **Dependencies**: NEXT_PUBLIC_STRIPE_MODE
- **Notes**: Create this in your Stripe dashboard under Products > Pricing

#### STRIPE_USAGE_PRICE_ID

- **Description**: Stripe price ID for usage-based billing
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: sensitive
- **Example**: `price_usage_1234567890`
- **Validation**: Valid Stripe price ID format
- **Notes**: Optional: for usage-based billing models

### Authentication & Security

#### CRON_JOB_TOKEN

- **Description**: Token for authenticating cron jobs and scheduled tasks
- **Required**: Yes
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `your-secure-cron-token-here-min-16-chars`
- **Validation**: Minimum 16 characters
- **Notes**: Generate a secure random string for this token

#### CRON_SECRET

- **Description**: Legacy cron secret for backward compatibility
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `your-legacy-cron-secret-here`
- **Validation**: Minimum 16 characters
- **Conflicts**: CRON_JOB_TOKEN
- **Notes**: Use CRON_JOB_TOKEN instead for new deployments

#### INTERNAL_KEY

- **Description**: Key for accessing internal status and admin endpoints
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `your-secure-internal-key-here-min-16-chars`
- **Validation**: Minimum 16 characters
- **Notes**: Generate a secure random string for this key

### Redis Configuration

#### UPSTASH_REDIS_URL

- **Description**: Upstash Redis connection URL
- **Required**: No
- **Type**: string (URL)
- **Environment**: server
- **Security**: sensitive
- **Example**: `redis://default:password@host:port`
- **Validation**: Valid Redis URL format
- **Conflicts**: REDIS_URL
- **Notes**: Use this for Upstash Redis connections

#### REDIS_URL

- **Description**: Standard Redis connection URL
- **Required**: No
- **Type**: string (URL)
- **Environment**: server
- **Security**: sensitive
- **Example**: `redis://localhost:6379`
- **Validation**: Valid Redis URL format
- **Conflicts**: UPSTASH_REDIS_URL
- **Notes**: Use this for standard Redis connections

#### UPSTASH_REDIS_REST_URL

- **Description**: Upstash Redis REST API URL for serverless environments
- **Required**: No
- **Type**: string (URL)
- **Environment**: server
- **Security**: sensitive
- **Example**: `https://your-redis.upstash.io`
- **Validation**: Valid HTTPS URL
- **Dependencies**: UPSTASH_REDIS_REST_TOKEN
- **Notes**: Use this for serverless Redis access

#### UPSTASH_REDIS_REST_TOKEN

- **Description**: Upstash Redis REST API token
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `your-upstash-token-here`
- **Validation**: Non-empty string
- **Dependencies**: UPSTASH_REDIS_REST_URL
- **Notes**: Get this from your Upstash dashboard

### Cryptographic Keys

#### VERIS_SIGNING_PRIVATE_KEY

- **Description**: Private key for signing proofs
- **Required**: Yes
- **Type**: string (PEM)
- **Environment**: server
- **Security**: secret
- **Example**: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`
- **Validation**: Minimum 100 characters, valid PEM format
- **Notes**: Generate this using the key generation script

#### VERIS_SIGNING_PUBLIC_KEY

- **Description**: Public key for verifying proofs
- **Required**: Yes
- **Type**: string (PEM)
- **Environment**: server
- **Security**: sensitive
- **Example**: `-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----`
- **Validation**: Minimum 100 characters, valid PEM format
- **Notes**: This key is used to verify proof signatures

### AWS Configuration

#### AWS_REGION

- **Description**: AWS region for S3 and other services
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `us-east-1`
- **Validation**: Valid AWS region identifier
- **Default**: `us-east-1`
- **Notes**: Choose the region closest to your users

#### AWS_ROLE_ARN

- **Description**: AWS IAM role ARN for service authentication
- **Required**: No
- **Type**: string (ARN)
- **Environment**: server
- **Security**: sensitive
- **Example**: `arn:aws:iam::123456789012:role/veris-role`
- **Validation**: Valid AWS IAM role ARN format
- **Notes**: Use this for IAM role-based authentication

#### AWS_ACCESS_KEY_ID

- **Description**: AWS access key ID
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `AKIAIOSFODNN7EXAMPLE`
- **Validation**: Valid AWS access key format
- **Dependencies**: AWS_SECRET_ACCESS_KEY
- **Notes**: Use this for access key-based authentication

#### AWS_SECRET_ACCESS_KEY

- **Description**: AWS secret access key
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **Validation**: Valid AWS secret key format
- **Dependencies**: AWS_ACCESS_KEY_ID
- **Notes**: Use this for access key-based authentication

### S3 Registry Configuration

#### REGISTRY_S3_BUCKET

- **Description**: S3 bucket for registry storage
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `veris-registry-dev`
- **Validation**: Valid S3 bucket name
- **Notes**: Create this bucket in your AWS account

#### REGISTRY_S3_STAGING_BUCKET

- **Description**: S3 bucket for staging registry
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `veris-registry-staging`
- **Validation**: Valid S3 bucket name
- **Notes**: Use this for staging environment

#### REGISTRY_S3_PRODUCTION_BUCKET

- **Description**: S3 bucket for production registry
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `veris-registry-prod`
- **Validation**: Valid S3 bucket name
- **Notes**: Use this for production environment

#### REGISTRY_S3_PREFIX

- **Description**: S3 key prefix for registry objects
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `registry/`
- **Validation**: Valid S3 key prefix
- **Default**: `registry/`
- **Notes**: Use this to organize objects in your S3 bucket

### Arweave Configuration

#### ARWEAVE_GATEWAY_URL

- **Description**: Arweave gateway URL for publishing
- **Required**: No
- **Type**: string (URL)
- **Environment**: server
- **Security**: public
- **Example**: `https://arweave.net`
- **Validation**: Valid HTTPS URL
- **Default**: `https://arweave.net`
- **Notes**: Use the official Arweave gateway

#### ARWEAVE_WALLET_JSON

- **Description**: Arweave wallet JSON for publishing
- **Required**: No
- **Type**: string (JSON)
- **Environment**: server
- **Security**: secret
- **Example**: `{"kty":"RSA","n":"..."}`
- **Validation**: Valid JSON string
- **Conflicts**: ARWEAVE_WALLET
- **Notes**: Use this for JSON wallet format

#### ARWEAVE_WALLET

- **Description**: Arweave wallet for publishing
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: secret
- **Example**: `your-arweave-wallet-here`
- **Validation**: Valid Arweave wallet
- **Conflicts**: ARWEAVE_WALLET_JSON
- **Notes**: Use this for wallet string format

### Monitoring & Observability

#### SENTRY_DSN

- **Description**: Sentry DSN for error tracking and performance monitoring
- **Required**: No
- **Type**: string (URL)
- **Environment**: server
- **Security**: sensitive
- **Example**: `https://your-sentry-dsn@sentry.io/project-id`
- **Validation**: Valid Sentry DSN URL
- **Notes**: Get this from your Sentry project settings

### Site Configuration

#### NEXT_PUBLIC_SITE_URL

- **Description**: Base URL of the site
- **Required**: No
- **Type**: string (URL)
- **Environment**: client
- **Security**: public
- **Example**: `http://localhost:3000`
- **Validation**: Valid URL
- **Notes**: Used for redirects and webhook URLs

#### NEXT_PUBLIC_API_BASE_URL

- **Description**: Base URL for API calls
- **Required**: No
- **Type**: string (URL)
- **Environment**: client
- **Security**: public
- **Example**: `https://api.verisplatform.com`
- **Validation**: Valid URL
- **Notes**: Use this for custom API endpoints

#### NEXT_PUBLIC_VERIS_API_KEY

- **Description**: API key for Veris services
- **Required**: No
- **Type**: string
- **Environment**: client
- **Security**: sensitive
- **Example**: `your-api-key-here`
- **Validation**: Non-empty string
- **Notes**: Use this for API authentication

### Feature Flags

#### ENABLE_MIRRORS

- **Description**: Enable mirror functionality for registry replication
- **Required**: No
- **Type**: boolean
- **Environment**: server
- **Security**: public
- **Example**: `true`
- **Validation**: true or false
- **Default**: `false`
- **Notes**: Enable this for registry mirroring

#### ENABLE_SNAPSHOT_AUTOMATION

- **Description**: Enable automated registry snapshots
- **Required**: No
- **Type**: boolean
- **Environment**: server
- **Security**: public
- **Example**: `true`
- **Validation**: true or false
- **Default**: `false`
- **Notes**: Enable this for automatic snapshots

#### ENABLE_NONESSENTIAL_CRON

- **Description**: Enable non-essential cron jobs
- **Required**: No
- **Type**: boolean
- **Environment**: server
- **Security**: public
- **Example**: `false`
- **Validation**: true or false
- **Default**: `false`
- **Notes**: Enable this for additional cron jobs

#### ENABLE_BILLING

- **Description**: Enable billing functionality
- **Required**: No
- **Type**: boolean
- **Environment**: server
- **Security**: public
- **Example**: `true`
- **Validation**: true or false
- **Default**: `true`
- **Notes**: Enable this for payment processing

#### ENABLE_TELEMETRY

- **Description**: Enable telemetry collection
- **Required**: No
- **Type**: boolean
- **Environment**: server
- **Security**: public
- **Example**: `true`
- **Validation**: true or false
- **Default**: `true`
- **Notes**: Enable this for usage analytics

### Development & Deployment

#### NODE_ENV

- **Description**: Node.js environment
- **Required**: No
- **Type**: enum
- **Environment**: both
- **Security**: public
- **Example**: `development`
- **Validation**: development, test, or production
- **Default**: `development`
- **Notes**: Set by the runtime environment

#### NEXT_PHASE

- **Description**: Next.js build phase
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `phase-development-server`
- **Validation**: Valid Next.js phase
- **Notes**: Set by Next.js during build

#### VERCEL_GIT_COMMIT_SHA

- **Description**: Vercel git commit SHA
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `abc123def456`
- **Validation**: Valid git SHA
- **Notes**: Set by Vercel during deployment

#### VERCEL_GIT_COMMIT_REF

- **Description**: Vercel git commit reference
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `main`
- **Validation**: Valid git reference
- **Notes**: Set by Vercel during deployment

#### VERCEL_DEPLOYMENT_ID

- **Description**: Vercel deployment ID
- **Required**: No
- **Type**: string
- **Environment**: server
- **Security**: public
- **Example**: `deployment-123`
- **Validation**: Valid deployment ID
- **Notes**: Set by Vercel during deployment

## Setup Instructions

1. Copy the example file: `cp env.example .env.local`
2. Fill in the required values
3. Generate cryptographic keys: `npm run generate-keys`
4. Validate configuration: `npm run validate-env`
5. Start the development server: `npm run dev`

## Validation

Run the environment validation script to check your configuration:

```bash
npm run validate-env
```

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

## Security Best Practices

1. **Never commit secrets**: Use `.env.local` and ensure it's in `.gitignore`
2. **Use environment-specific values**: Different values for development, staging, and production
3. **Rotate secrets regularly**: Change keys and tokens periodically
4. **Use least privilege**: Only grant necessary permissions
5. **Monitor access**: Log and monitor access to sensitive endpoints

## Environment-Specific Configuration

### Development

- Use test Stripe keys
- Use local Redis if available
- Enable debug logging
- Use development Supabase project

### Staging

- Use test Stripe keys
- Use staging S3 buckets
- Enable monitoring
- Use staging Supabase project

### Production

- Use live Stripe keys
- Use production S3 buckets
- Enable all monitoring
- Use production Supabase project
- Enable all security features
