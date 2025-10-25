# Veris — Cryptographic Proof of File Integrity

**Final Means Final.** Veris provides cryptographic proof of file integrity with blockchain anchoring for creative professionals and studios.

## Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with magic links
- **Payments**: Stripe subscriptions
- **Deployment**: Vercel
- **Monitoring**: Sentry, Vercel Analytics
- **Caching**: Redis (Upstash)

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Supabase CLI (optional)
- Stripe CLI (for webhook testing)

### 1. Clone and Install

```bash
git clone https://github.com/edforgetools/verisplatform.git
cd verisplatform
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp frontend/env.example frontend/.env.local

# Edit environment variables
nano frontend/.env.local
```

**Required Environment Variables:**

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `supabaseservicekey` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `VERIS_SIGNING_PRIVATE_KEY` - RSA private key for signing
- `VERIS_SIGNING_PUBLIC_KEY` - RSA public key for verification
- `CRON_JOB_TOKEN` - Secure token for cron jobs

### 3. Database Setup

```bash
# Create Supabase project (if not exists)
supabase projects create veris-dev

# Apply database schema
supabase db push --project-id <PROJECT_ID>

# Generate TypeScript types
supabase gen types typescript --project-id <PROJECT_ID> > frontend/src/lib/db-types.ts
```

### 4. Generate Cryptographic Keys

```bash
# Generate RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Convert to single-line format for environment variables
cat private.pem | tr '\n' '\\n'
cat public.pem | tr '\n' '\\n'
```

### 5. Start Development Server

```bash
cd frontend
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment

### Preview Deployment

For testing and staging environments:

```bash
# Deploy to Vercel preview
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SITE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... (add all required variables)
```

### Production Deployment

1. **Connect Repository to Vercel**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Configure build settings

2. **Set Environment Variables**

   ```bash
   # Add all environment variables in Vercel dashboard
   # Or use CLI:
   vercel env add <VARIABLE_NAME>
   ```

3. **Configure Custom Domain**

   ```bash
   # Add domain in Vercel dashboard
   # Configure DNS records
   ```

4. **Deploy**
   ```bash
   # Deploy from main branch
   git push origin main
   # Vercel will automatically deploy
   ```

### Environment-Specific Configuration

| Environment | URL                | Database      | Stripe Mode |
| ----------- | ------------------ | ------------- | ----------- |
| Development | localhost:3000     | Supabase Dev  | Test        |
| Preview     | vercel-preview-url | Supabase Dev  | Test        |
| Production  | verisplatform.com  | Supabase Prod | Live        |

## Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Run tests in watch mode
pnpm test:ci          # Run tests for CI
pnpm test:e2e         # Run end-to-end tests
pnpm test:e2e:ui      # Run E2E tests with UI

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues

# Utilities
pnpm seed:stripe      # Seed Stripe test data
pnpm release          # Create a new release
```

### Project Structure

```
veris/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages and API routes
│   │   ├── components/      # React components
│   │   ├── lib/             # Utility functions and services
│   │   ├── types/           # TypeScript type definitions
│   │   └── schema/          # JSON schemas
│   ├── e2e/                 # End-to-end tests
│   ├── scripts/             # Build and utility scripts
│   └── public/              # Static assets
├── packages/
│   └── sdk-js/              # JavaScript SDK
├── supabase/                # Database migrations and schema
├── docs/                    # Documentation
└── scripts/                 # Root-level scripts
```

### API Development

API routes are located in `frontend/src/app/api/`. Each route follows Next.js App Router conventions:

```typescript
// Example API route
export async function POST(request: NextRequest) {
  try {
    // Handle request
    return jsonOk(data);
  } catch (error) {
    capture(error, { route: "/api/example" });
    return jsonErr("Internal server error", 500);
  }
}
```

### Database Development

Database schema is managed through Supabase migrations:

```bash
# Create new migration
supabase migration new <migration_name>

# Apply migrations
supabase db push --project-id <PROJECT_ID>

# Reset database
supabase db reset --project-id <PROJECT_ID>
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test api.test.ts

# Run tests with coverage
pnpm test:ci
```

### End-to-End Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run E2E tests in headed mode
pnpm test:e2e:headed
```

### Test Coverage

Coverage reports are generated in `frontend/coverage/`. Open `coverage/index.html` to view detailed coverage.

## Monitoring and Observability

### Error Tracking

- **Sentry**: Automatic error capture and performance monitoring
- **Vercel Analytics**: Real-time performance metrics
- **Custom Logging**: Structured logging with Pino

### Health Checks

```bash
# Check application health
curl https://verisplatform.com/api/db-health

# Check specific service
curl https://verisplatform.com/api/status
```

### Logs

```bash
# View Vercel logs
vercel logs --follow

# View specific function logs
vercel logs --follow --function=api/proof/create
```

## Security

### Authentication

- Magic link authentication via Supabase Auth
- JWT tokens with 1-hour expiration
- Automatic token refresh

### Authorization

- Row Level Security (RLS) in Supabase
- User-scoped data access
- Admin-only endpoints protected

### Data Protection

- All data encrypted in transit (HTTPS)
- Sensitive data encrypted at rest
- PII redaction in logs
- Secure key management

### Rate Limiting

- API rate limiting via Redis
- User-based quotas
- Progressive backoff

## Troubleshooting

### Common Issues

1. **Environment Variables**

   ```bash
   # Check environment variables
   pnpm run env:check
   ```

2. **Database Connection**

   ```bash
   # Test database connection
   curl https://your-domain.com/api/db-health
   ```

3. **Stripe Integration**

   ```bash
   # Test Stripe connection
   stripe balance retrieve
   ```

4. **Build Issues**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   pnpm build
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* pnpm dev

# Enable specific debug namespace
DEBUG=veris:* pnpm dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write tests for new features

## Documentation

- [API Documentation](API.md) - Complete API reference
- [Operations Guide](OPERATIONS.md) - Production operations
- [Pilot Runbook](RUNBOOK.md) - Deployment procedures
- [Environment Setup](frontend/env.example) - Environment configuration

## Support

- **Issues**: [GitHub Issues](https://github.com/edforgetools/verisplatform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/edforgetools/verisplatform/discussions)
- **Email**: support@verisplatform.com

## License

Private - All rights reserved.

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

| Variable                        | Development  | Production   | Required |
| ------------------------------- | ------------ | ------------ | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✓            | ✓            | ✓        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓            | ✓            | ✓        |
| `supabaseservicekey`            | ✓            | ✓            | ✓        |
| `STRIPE_SECRET_KEY`             | Test key     | Live key     | ✓        |
| `STRIPE_WEBHOOK_SECRET`         | Test webhook | Live webhook | ✓        |
| `NEXT_PUBLIC_STRIPE_MODE`       | `test`       | `live`       | ✓        |
| `VERIS_SIGNING_PRIVATE_KEY`     | ✓            | ✓            | ✓        |
| `VERIS_SIGNING_PUBLIC_KEY`      | ✓            | ✓            | ✓        |
| `CRON_JOB_TOKEN`                | ✓            | ✓            | ✓        |
| `UPSTASH_REDIS_URL`             | Optional     | ✓            | Optional |
| `REDIS_URL`                     | Optional     | ✓            | Optional |

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
