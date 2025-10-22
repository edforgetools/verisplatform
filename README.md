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

## License

Private - All rights reserved.
