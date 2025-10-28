# Veris MVP

**Verifiable Proof of Delivery Platform**

See [docs/mvp.md](docs/mvp.md) for the complete executable specification.

## Quick Start

```bash
# Install dependencies
pnpm install

# Bootstrap the project
make bootstrap

# Run tests
make test

# Start development server
cd frontend && pnpm dev
```

## CI/CD

Continuous Integration is configured with the following workflows:

- **e2e.yml** - End-to-end tests with Playwright
- **web_quality.yml** - Lighthouse performance audits and accessibility tests
- **content_guard.yml** - Content validation and schema checks
- **release_gate.yml** - Release gate requiring 3 consecutive green runs

### Local Testing

Test your changes locally before pushing:

```bash
# Start development server
cd frontend && npm run dev

# Run e2e tests
npm run test:e2e

# Run Lighthouse audit
npx lighthouse http://localhost:3000 --view
```

## Architecture

- **Frontend**: Next.js application (`frontend/`)
- **Schema**: Canonical proof schema (`frontend/src/schema/proof.schema.json`)
- **Database**: Supabase PostgreSQL
- **Deployment**: Vercel

## Key Features

- **Issuance**: Create Ed25519-signed proofs for files
- **Registry**: Append-only proof storage
- **Verification**: Public, free verification API
- **Demo**: Live demonstration at `/demo`

## Documentation

- [MVP Specification](docs/mvp.md) - Complete executable spec
- [API Reference](docs/api.md) - API endpoints
- [Archive](docs/archive/) - Historical documentation

## License

[License information]
# CI trigger
# Final CI trigger
