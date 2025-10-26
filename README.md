# Veris Platform

A comprehensive proof-of-authenticity platform aligned with Veris Execution v4.4 specifications.

## Overview

Veris provides end-to-end proof issuance, registry management, verification, and billing capabilities with optional C2PA sidecar support and Arweave mirroring.

## Architecture

- **Frontend**: Next.js application with TypeScript
- **Database**: Supabase PostgreSQL
- **Storage**: AWS S3 buckets for registry
- **Billing**: Stripe integration
- **Deployment**: Vercel with OIDC authentication
- **Monitoring**: Health checks and SLO compliance

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- AWS CLI configured
- Supabase account
- Stripe account
- Vercel account

### Installation

1. **Clone and install dependencies**:

   ```bash
   git clone <repository-url>
   cd veris
   pnpm install
   ```

2. **Configure environment**:

   ```bash
   cp frontend/env.example frontend/.env.local
   # Edit frontend/.env.local with your actual values
   ```

3. **Bootstrap the project**:

   ```bash
   make bootstrap
   ```

4. **Run the execution pipeline**:
   ```bash
   ./scripts/execute.sh full
   ```

## Execution Modes

The platform supports multiple execution modes as defined in the execution documents:

| Mode          | Values                 | Effect                    |
| ------------- | ---------------------- | ------------------------- |
| `DEPLOY_MODE` | staging \| prod        | Vercel environment target |
| `STRIPE_MODE` | test \| live           | Stripe key selection      |
| `C2PA_MODE`   | on \| off              | C2PA sidecar emission     |
| `MIRROR_MODE` | auto \| manual         | Snapshot cadence          |
| `ALERT_MODE`  | slack \| email \| none | Alert destination         |

## Required Secrets

All secrets must be configured in Vercel:

- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `AWS_REGION` - AWS region for S3 buckets
- `REGISTRY_BUCKET_STAGING` - Staging S3 bucket name
- `REGISTRY_BUCKET_PROD` - Production S3 bucket name
- `AWS_ROLE_VERCEL_ARN` - Vercel IAM role ARN
- `AWS_ROLE_GITHUB_ARN` - GitHub IAM role ARN
- `ARWEAVE_WALLET_JSON` - Arweave wallet JSON
- `SLACK_WEBHOOK_URL` - Slack webhook URL
- `APP_BASE_URL` - Application base URL

## Build Phases

The execution follows a deterministic sequence:

1. **Bootstrap** - Initialize project and sync environment
2. **AWS S3 + OIDC** - Create buckets and configure OIDC roles
3. **Database** - Apply Supabase migrations
4. **Issuance + Registry** - Initialize proof system and registry
5. **Verification API** - Initialize verification endpoints
6. **C2PA Adapter** - Build C2PA sidecar (optional)
7. **Billing** - Seed Stripe with test data
8. **Snapshots + Mirror** - Create Arweave snapshots
9. **Compliance Tests** - Run PII and retention checks
10. **Dual-Mode Validation** - Test Veris + C2PA compatibility
11. **Manifest & Release** - Sign manifest and create release

## Success Gates

- Verification success ≥ 99%
- E2E latency ≤ 2s
- Billing success ≥ 95%
- Automation ≤ 5% manual
- Mirror integrity 100% hash match
- C2PA field parity ≥ 95%
- Dual-mode test 100% pass
- Sustainability ratio (revenue/infra) ≥ 6×

## Key Rotation

Keys are rotated every 6 months or 10,000 proofs (whichever comes first):

```bash
# Check rotation status
tsx scripts/key-rotation.ts status

# Perform rotation
tsx scripts/key-rotation.ts rotate

# Increment proof count
tsx scripts/key-rotation.ts increment
```

## Monitoring

### Health Checks

```bash
# Run health checks
make ops:health

# Verify SLO compliance
make ops:verify-slo
```

### Health Endpoint

The `/api/health` endpoint provides comprehensive system status:

- Component health (Supabase, Stripe, AWS S3, C2PA, Mirror, Alerts)
- SLO compliance metrics
- Response time monitoring
- Configuration validation

## Operations

### Daily Operations

```bash
# Health check
make ops:health

# SLO verification
make ops:verify-slo
```

### Alerts

- Primary: Slack via `SLACK_WEBHOOK_URL`
- Fallback: Email (configured in repo)
- Escalation: GitHub issue creation if both fail for >24h

### Compliance

- Proof JSON retained ≥ 10 years
- Logs retained 12 months
- PII redaction at ingestion
- GDPR anonymisation for metadata
- SOC2-aligned audit trails

## Development

### Scripts

- `./scripts/execute.sh` - Main execution script
- `./scripts/setup-aws-oidc.sh` - AWS S3 and OIDC setup
- `./scripts/key-rotation.ts` - Key rotation system

### Testing

```bash
# Unit tests
cd frontend && pnpm test

# E2E tests
cd frontend && pnpm test:e2e

# Dual-mode tests
make test:proof:dual-mode
```

### Linting

```bash
cd frontend && pnpm lint
```

## Deployment

### Vercel Deployment

```bash
# Deploy to staging
vercel --env staging

# Deploy to production
vercel --prod
```

### Environment Sync

```bash
# Sync environment with Vercel
make env:sync
```

## Rollback and DR

- Rollback: `make rollback:last`
- Teardown: `make teardown`
- Restore: `make restore:last-snapshot`

## Immutable Freeze

After MVP completion, apply immutable freeze:

```bash
make freeze:immutable
```

Post-freeze changes require new schema signature and steward countersign.

## Project Structure

```
veris/
├── frontend/                 # Next.js application
│   ├── src/app/             # App router pages and API routes
│   ├── src/lib/             # Shared libraries
│   ├── src/types/           # TypeScript type definitions
│   ├── e2e/                 # End-to-end tests
│   └── registry/            # Proof registry storage
├── packages/sdk-js/         # JavaScript SDK
├── scripts/                 # Execution scripts
├── logs/                    # Execution logs
├── supabase/                # Database migrations
├── Makefile                 # Build automation
└── veris execution/         # Execution documentation
```

## Contributing

1. Follow the execution documents for any changes
2. Ensure all tests pass
3. Update documentation as needed
4. Follow the immutable freeze protocol for production changes

## License

[License information]

## Support

For issues and questions, refer to the execution documents in the `veris execution/` directory.
