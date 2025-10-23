# Veris — Cryptographic Proof of File Integrity

**Final Means Final.** Veris provides cryptographic proof of file integrity with blockchain anchoring for creative professionals and studios.

## Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with magic links
- **Payments**: Stripe subscriptions
- **Deployment**: Vercel

## Quickstart

1. **Clone and install dependencies:**

   ```bash
   git clone https://github.com/edforgetools/verisplatform.git
   cd verisplatform
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp frontend/.env.local.example frontend/.env.local
   # Fill in your Supabase and Stripe credentials
   ```

3. **Set up Supabase:**

   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql`
   - Generate types: `pnpm dlx supabase gen types typescript --project-id <PROJECT_ID> > frontend/src/lib/db-types.ts`

4. **Generate signing keys:**

   ```bash
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem
   ```

5. **Start development server:**
   ```bash
   cd frontend
   pnpm dev
   ```

## API Routes

### Proof Creation

- `POST /api/proof/create` - Upload file and create cryptographic proof
- `GET /api/proof/[id]` - Retrieve proof data
- `POST /api/proof/verify` - Verify file against stored proof

### Billing

- `POST /api/stripe/create-checkout` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### Utilities

- `GET /api/proof/[id]/certificate` - Download PDF certificate
- `POST /api/telemetry` - Track usage metrics
- `POST /api/integrity-check` - Nightly proof integrity verification
- `GET /api/db-health` - Database health check

## Environment Variables

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://verisplatform.com

# Supabase (Project: Veris Platform)
NEXT_PUBLIC_SUPABASE_URL=https://fxdzaspfxwvihrbxgjyh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
supabaseservicekey=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Stripe Price IDs
NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID=price_1SKqkE2O9l5kYbcA5hZf9ZtD
NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID=price_1SKqkj2O9l5kYbcAJzO0YOfB

# Cryptography
VERIS_SIGNING_PRIVATE_KEY=
VERIS_SIGNING_PUBLIC_KEY=

# Future integrations
ARWEAVE_KEY= # stub for later
GLACIER_VAULT= # stub for later

# Cron Job Security
CRON_SECRET= # for integrity check endpoint
```

## Demo

Try the live demo at `/demo` - upload a file and see the cryptographic proof in action.

## Deployment

Deploy to Vercel:

1. Connect your GitHub repository: [https://github.com/edforgetools/verisplatform](https://github.com/edforgetools/verisplatform)
2. Set environment variables in Vercel dashboard
3. Deploy from main branch
4. **Live URLs**:
   - Primary: [https://verisplatform.com](https://verisplatform.com)
   - WWW redirect: [https://www.verisplatform.com](https://www.verisplatform.com) (308 permanent redirect to root)

## Development

- **Code formatting**: Prettier + ESLint
- **Type safety**: TypeScript strict mode
- **Testing**: Jest (planned)
- **CI/CD**: GitHub Actions

### GitHub Actions Workflows

The repository includes automated workflows:

- **CI**: Build and test on push/PR
- **Integrity Check**: Weekly hash verification (Mondays at 5 PM UTC)
- **Retention Policy**: Daily cleanup of demo proofs older than 7 days (6 PM UTC)

## Operational Documentation

### Environment Matrix

| Variable | Development | Production | Required |
|----------|-------------|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | ✓ |
| `supabaseservicekey` | ✓ | ✓ | ✓ |
| `STRIPE_SECRET_KEY` | Test key | Live key | ✓ |
| `STRIPE_WEBHOOK_SECRET` | Test webhook | Live webhook | ✓ |
| `NEXT_PUBLIC_STRIPE_MODE` | `test` | `live` | ✓ |
| `VERIS_SIGNING_PRIVATE_KEY` | ✓ | ✓ | ✓ |
| `VERIS_SIGNING_PUBLIC_KEY` | ✓ | ✓ | ✓ |
| `CRON_JOB_TOKEN` | ✓ | ✓ | ✓ |
| `UPSTASH_REDIS_URL` | Optional | ✓ | Optional |
| `REDIS_URL` | Optional | ✓ | Optional |

### Running Locally

1. **Prerequisites:**
   - Node.js 20+
   - pnpm
   - Supabase CLI (optional)
   - Stripe CLI (for webhooks)

2. **Setup:**
   ```bash
   # Install dependencies
   pnpm install
   
   # Copy environment template
   cp frontend/.env.local.example frontend/.env.local
   
   # Edit environment variables
   nano frontend/.env.local
   ```

3. **Start development server:**
   ```bash
   cd frontend
   pnpm dev
   ```

4. **Run tests:**
   ```bash
   # Unit tests
   pnpm test
   
   # E2E tests
   pnpm test:e2e
   
   # Watch mode
   pnpm test:watch
   ```

### Stripe CLI Testing

1. **Install Stripe CLI:**
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local development:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Test webhook events:**
   ```bash
   stripe trigger payment_intent.succeeded
   stripe trigger customer.subscription.created
   ```

5. **Seed test data (if needed):**
   ```bash
   pnpm run seed:stripe
   ```

### Cron Jobs

The application includes automated cron jobs:

- **Integrity Check**: Weekly hash verification (Mondays at 5 PM UTC)
- **Proof Cleanup**: Daily cleanup of demo proofs older than 7 days (6 PM UTC)
- **Telemetry**: Daily usage metrics collection (Midnight UTC)

**Manual execution:**
```bash
# Test integrity check
curl -X POST https://your-domain.com/api/jobs/proof-gc \
  -H "x-cron-key: YOUR_CRON_TOKEN"

# Test telemetry
curl -X POST https://your-domain.com/api/jobs/telemetry-daily \
  -H "x-cron-key: YOUR_CRON_TOKEN"
```

### Release Checklist

Before releasing a new version:

- [ ] All tests pass (`pnpm test:ci`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] Environment variables updated in production
- [ ] Database migrations applied (if any)
- [ ] Stripe webhooks configured for new endpoints
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated
- [ ] Release notes prepared
- [ ] Deploy to staging environment first
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor error logs for 24 hours

**Automated release:**
```bash
pnpm run release
```

### Troubleshooting

#### Common Issues

1. **Environment Variable Errors:**
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure Stripe keys match the correct mode (test/live)

2. **Database Connection Issues:**
   - Verify Supabase URL and service key
   - Check network connectivity
   - Ensure database is not paused

3. **Stripe Webhook Failures:**
   - Verify webhook secret matches
   - Check webhook endpoint URL
   - Review Stripe dashboard for failed events

4. **Cryptographic Key Issues:**
   - Ensure signing keys are properly formatted
   - Verify keys are 2048-bit RSA keys
   - Check file permissions on key files

5. **Rate Limiting:**
   - Check Redis connection
   - Verify rate limit configuration
   - Monitor API usage patterns

#### Debug Commands

```bash
# Check environment variables
pnpm run env:check

# Test database connection
curl https://your-domain.com/api/db-health

# Verify Stripe connection
curl https://your-domain.com/api/admin/stripe/prices \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check application logs
vercel logs --follow
```

#### Performance Monitoring

- Monitor API response times
- Check database query performance
- Track memory usage
- Monitor error rates
- Review Stripe webhook success rates

## License

Private - All rights reserved.
