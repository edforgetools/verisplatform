# Veris MVP Makefile
# Per docs/mvp.md §9

.PHONY: help bootstrap schema:lint issue verify demo test lh a11y release

# Default target
help:
	@echo "Veris MVP Targets:"
	@echo "  bootstrap          - Install deps, set up env"
	@echo "  schema:lint        - Validate schema file"
	@echo "  issue              - CLI issuance against sample file, writes proof.json"
	@echo "  verify             - Calls POST /api/verify on proof.json"
	@echo "  demo               - Issues public demo proof for staging"
	@echo "  test               - Unit + e2e orchestration"
	@echo "  lh                 - Run Lighthouse budgets locally"
	@echo "  a11y               - Run axe+pa11y locally"
	@echo "  release            - Runs release_gate preflight locally"

# Bootstrap phase
bootstrap:
	@echo "Installing dependencies..."
	pnpm install
	@echo "Bootstrap complete"

# Schema validation
schema:lint:
	@echo "Validating schema..."
	python3 -m json.tool frontend/src/schema/proof.schema.json > /dev/null
	@echo "Schema is valid JSON"

# CLI issuance
issue:
	@echo "Issuing proof..."
	cd frontend && pnpm run mint:mock

# Verify proof
verify:
	@echo "Verifying proof..."
	cd frontend && curl -X POST http://localhost:3000/api/verify -H "Content-Type: application/json" -d @proof.json

# Demo proof
demo:
	@echo "Issuing demo proof..."
	cd frontend && pnpm run mint:demo

# Tests
test:
	@echo "Running tests..."
	cd frontend && pnpm test

# Lighthouse
lh:
	@echo "Running Lighthouse..."
	cd frontend && pnpm run lighthouse

# A11y
a11y:
	@echo "Running accessibility tests..."
	cd frontend && pnpm run a11y

# Release
release:
	@echo "Running release preflight..."
	cd frontend && pnpm run test:ci && pnpm run test:e2e
	@echo "Release checks passed"

# Ed25519 integration testing (MVP §2.1)
test-ed25519:
	@echo "Testing Ed25519 integration..."
	cd frontend && VERIS_ED25519_PRIVATE_KEY="$$(grep VERIS_ED25519_PRIVATE_KEY .env.local | cut -d'"' -f2)" \
	VERIS_ED25519_PUBLIC_KEY="$$(grep VERIS_ED25519_PUBLIC_KEY .env.local | cut -d'"' -f2)" \
	VERIS_ISSUER="$$(grep VERIS_ISSUER .env.local | cut -d'"' -f2)" \
	npx tsx scripts/test-ed25519-integration.ts

.PHONY: test-ed25519
