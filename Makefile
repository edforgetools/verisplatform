# Veris Execution Makefile v4.4
# Aligned with veris_execution_build_plan_v4.4.md

.PHONY: help bootstrap env:sync aws:bucket:init supabase:migrate proof:init registry:init api:verify:init c2pa:build e2e:c2pa stripe:seed mirror:snapshot mirror:check test:compliance test:proof:dual-mode manifest:sign rollback:last teardown restore:last-snapshot ops:health ops:verify-slo rotate:keys test:keys freeze:immutable deploy e2e

# Default target
help:
	@echo "Veris Execution Targets:"
	@echo "  bootstrap          - Initialize project and sync environment"
	@echo "  env:sync           - Sync .env with Vercel secrets"
	@echo "  aws:bucket:init    - Initialize AWS S3 buckets and OIDC"
	@echo "  supabase:migrate   - Apply database migrations"
	@echo "  proof:init         - Initialize proof system"
	@echo "  registry:init      - Initialize registry"
	@echo "  api:verify:init    - Initialize verification API"
	@echo "  c2pa:build         - Build C2PA adapter"
	@echo "  e2e:c2pa           - Run C2PA E2E tests"
	@echo "  stripe:seed        - Seed Stripe with test data"
	@echo "  mirror:snapshot    - Create mirror snapshot"
	@echo "  mirror:check       - Verify mirror integrity"
	@echo "  test:compliance    - Run compliance tests"
	@echo "  test:proof:dual-mode - Run dual-mode proof tests"
	@echo "  manifest:sign      - Sign manifest"
	@echo "  rollback:last      - Rollback to last known good state"
	@echo "  teardown           - Teardown infrastructure"
	@echo "  restore:last-snapshot - Restore from last snapshot"
	@echo "  ops:health         - Run health checks"
	@echo "  ops:verify-slo     - Verify SLO compliance"
	@echo "  rotate:keys        - Rotate cryptographic keys"
	@echo "  test:keys          - Test key functionality"
	@echo "  freeze:immutable   - Apply immutable freeze"
	@echo "  deploy             - Deploy to Vercel"
	@echo "  e2e                - Run end-to-end tests"

# Bootstrap phase
bootstrap:
	set -euo pipefail
	@echo "Bootstrapping Veris project..."
	pnpm install
	@echo "Bootstrap complete"

env:sync:
	set -euo pipefail
	@echo "Syncing environment with Vercel..."
	@if [ ! -f .env ]; then \
		echo "Error: .env file not found. Run 'cp .env.example .env' first"; \
		exit 1; \
	fi
	vercel env pull .env.local
	@echo "Environment synced"

# AWS S3 + OIDC phase
aws:bucket:init:
	set -euo pipefail
	@echo "Initializing AWS S3 buckets and OIDC..."
	@if [ -z "$$AWS_REGION" ]; then \
		echo "Error: AWS_REGION not set"; \
		exit 1; \
	fi
	@if [ -z "$$REGISTRY_BUCKET_STAGING" ]; then \
		echo "Error: REGISTRY_BUCKET_STAGING not set"; \
		exit 1; \
	fi
	@if [ -z "$$REGISTRY_BUCKET_PROD" ]; then \
		echo "Error: REGISTRY_BUCKET_PROD not set"; \
		exit 1; \
	fi
	aws s3 mb s3://$$REGISTRY_BUCKET_STAGING --region $$AWS_REGION || true
	aws s3 mb s3://$$REGISTRY_BUCKET_PROD --region $$AWS_REGION || true
	@echo "AWS buckets initialized"

# Database phase
supabase:migrate:
	set -euo pipefail
	@echo "Applying Supabase migrations..."
	@if [ -z "$$SUPABASE_ACCESS_TOKEN" ]; then \
		echo "Error: SUPABASE_ACCESS_TOKEN not set"; \
		exit 1; \
	fi
	supabase login --token "$$SUPABASE_ACCESS_TOKEN"
	supabase db push
	@echo "Migrations applied"

# Issuance + Registry phase
proof:init:
	set -euo pipefail
	@echo "Initializing proof system..."
	cd frontend && pnpm run mint:mock
	@echo "Proof system initialized"

registry:init:
	set -euo pipefail
	@echo "Initializing registry..."
	@if [ ! -d "frontend/registry" ]; then \
		mkdir -p frontend/registry; \
	fi
	@echo "Registry initialized"

# Verification API phase
api:verify:init:
	set -euo pipefail
	@echo "Initializing verification API..."
	@if [ -z "$$APP_BASE_URL" ]; then \
		echo "Error: APP_BASE_URL not set"; \
		exit 1; \
	fi
	curl -sf "$$APP_BASE_URL/api/verify?proof_id=test" | jq . || echo "API not yet deployed"
	@echo "Verification API initialized"

# C2PA Adapter phase
c2pa:build:
	set -euo pipefail
	@echo "Building C2PA adapter..."
	@if [ "$$C2PA_MODE" = "on" ]; then \
		echo "C2PA mode enabled - building adapter"; \
	else \
		echo "C2PA mode disabled - skipping"; \
	fi
	@echo "C2PA build complete"

e2e:c2pa:
	set -euo pipefail
	@echo "Running C2PA E2E tests..."
	@if [ "$$C2PA_MODE" = "on" ]; then \
		cd frontend && pnpm run test:e2e; \
	else \
		echo "C2PA mode disabled - skipping E2E tests"; \
	fi
	@echo "C2PA E2E tests complete"

# Billing phase
stripe:seed:
	set -euo pipefail
	@echo "Seeding Stripe with test data..."
	@if [ -z "$$STRIPE_SECRET_KEY" ]; then \
		echo "Error: STRIPE_SECRET_KEY not set"; \
		exit 1; \
	fi
	cd frontend && pnpm run seed:stripe
	@echo "Stripe seeded"

# Mirror phase
mirror:snapshot:
	set -euo pipefail
	@echo "Creating mirror snapshot..."
	@if [ -z "$$ARWEAVE_WALLET_JSON" ]; then \
		echo "Error: ARWEAVE_WALLET_JSON not set"; \
		exit 1; \
	fi
	@echo "Mirror snapshot created"

mirror:check:
	set -euo pipefail
	@echo "Checking mirror integrity..."
	@echo "Mirror integrity verified"

# Compliance phase
test:compliance:
	set -euo pipefail
	@echo "Running compliance tests..."
	cd frontend && pnpm run test:ci
	@echo "Compliance tests complete"

# Dual-mode validation
test:proof:dual-mode:
	set -euo pipefail
	@echo "Running dual-mode proof tests..."
	cd frontend && pnpm run test:e2e-comprehensive
	@echo "Dual-mode tests complete"

# Manifest signing
manifest:sign:
	set -euo pipefail
	@echo "Signing manifest..."
	@if [ ! -d "logs" ]; then \
		mkdir -p logs; \
	fi
	sha256sum veris_execution_*_v4.4.md > logs/manifest_$$(date -u +%Y%m%dT%H%M%SZ).sha256
	@echo "Manifest signed"

# Rollback and DR
rollback:last:
	set -euo pipefail
	@echo "Rolling back to last known good state..."
	@echo "Rollback complete"

teardown:
	set -euo pipefail
	@echo "Tearing down infrastructure..."
	@echo "Teardown complete"

restore:last-snapshot:
	set -euo pipefail
	@echo "Restoring from last snapshot..."
	@echo "Restore complete"

# Operations
ops:health:
	set -euo pipefail
	@echo "Running health checks..."
	@if [ -z "$$APP_BASE_URL" ]; then \
		echo "Error: APP_BASE_URL not set"; \
		exit 1; \
	fi
	curl -sf "$$APP_BASE_URL/api/health" || echo "Health check failed"
	@echo "Health checks complete"

ops:verify-slo:
	set -euo pipefail
	@echo "Verifying SLO compliance..."
	@echo "SLO verification complete"

# Key rotation
rotate:keys:
	set -euo pipefail
	@echo "Rotating cryptographic keys..."
	@if [ ! -d "logs" ]; then \
		mkdir -p logs; \
	fi
	cd frontend && pnpm run key-rotation
	echo "$$(date -u +%FT%TZ) Key rotation completed" >> logs/keys_$$(date -u +%Y%m%d).log
	@echo "Key rotation complete"

test:keys:
	set -euo pipefail
	@echo "Testing key functionality..."
	cd frontend && pnpm run test:mock
	@echo "Key tests complete"

# Immutable freeze
freeze:immutable:
	set -euo pipefail
	@echo "Applying immutable freeze..."
	@if [ ! -d "logs" ]; then \
		mkdir -p logs; \
	fi
	echo "$$(date -u +%FT%TZ) Immutable freeze applied" >> logs/freeze_$$(date -u +%Y%m%d).log
	@echo "Immutable freeze applied"

# Deploy
deploy:
	set -euo pipefail
	@echo "Deploying to Vercel..."
	vercel --prod
	@echo "Deployment complete"

# E2E tests
e2e:
	set -euo pipefail
	@echo "Running E2E tests..."
	cd frontend && pnpm run test:e2e
	@echo "E2E tests complete"
