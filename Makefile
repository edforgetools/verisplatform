.PHONY: help audit-all audit-secrets audit-deps audit-licenses audit-dead audit-circular audit-dup audit-bundle audit-eslint audit-ts audit-services clean-reports

help:
	@echo "Veris Audit Commands:"
	@echo "  make audit:all       - Run all audits"
	@echo "  make audit:secrets   - Scan for secrets"
	@echo "  make audit:deps      - Check dependencies"
	@echo "  make audit:licenses  - License compliance"
	@echo "  make audit:dead      - Dead code detection"
	@echo "  make audit:circular  - Circular dependencies"
	@echo "  make audit:dup       - Code duplication"
	@echo "  make audit:bundle    - Bundle size analysis"
	@echo "  make audit:eslint    - Linting"
	@echo "  make audit:ts        - TypeScript checks"
	@echo "  make audit:services  - External services"
	@echo "  make clean:reports   - Clean audit reports"

audit\:all: audit\:secrets audit\:deps audit\:licenses audit\:dead audit\:circular audit\:dup audit\:eslint audit\:ts
	@echo "✅ All audits complete"

audit\:secrets:
	@echo "🔍 Scanning for secrets..."
	@./scripts/secret_scan.sh || true

audit\:deps:
	@echo "🔍 Auditing dependencies..."
	@cd frontend && npm audit --json > ../docs/audits/npm-audit.json 2>&1 || true
	@cd frontend && npm ls --json > ../docs/audits/sbom.json 2>&1 || true
	@cd frontend && npm outdated --json > ../docs/audits/outdated.json 2>&1 || true

audit\:licenses:
	@echo "🔍 Checking licenses..."
	@cd frontend && npx license-checker --json --out ../docs/audits/licenses.json
	@cd frontend && npx license-checker --summary > ../docs/audits/licenses.md

audit\:dead:
	@echo "🔍 Detecting dead code..."
	@npx tsx scripts/dead_code.ts || true

audit\:circular:
	@echo "🔍 Checking circular dependencies..."
	@cd frontend && npx madge --circular --json src > ../docs/audits/circular-deps.json 2>&1 || true

audit\:dup:
	@echo "🔍 Checking code duplication..."
	@cd frontend && npx jscpd src --reporters json --output ../docs/audits/duplication/ 2>&1 || true

audit\:bundle:
	@echo "🔍 Analyzing bundle..."
	@cd frontend && ANALYZE=true npm run build 2>&1 || true

audit\:eslint:
	@echo "🔍 Running ESLint..."
	@cd frontend && npm run lint > ../docs/audits/eslint-report.txt 2>&1 || true

audit\:ts:
	@echo "🔍 Running TypeScript checks..."
	@cd frontend && npm run typecheck 2> ../docs/audits/typescript-errors.txt || true

audit\:services:
	@echo "🔍 Auditing external services..."
	@npx tsx scripts/services_audit.ts || true

clean\:reports:
	@echo "🧹 Cleaning audit reports..."
	@rm -rf docs/audits/npm-audit.json docs/audits/sbom.json docs/audits/outdated.json docs/audits/licenses.* docs/audits/eslint-report.txt docs/audits/typescript-errors.txt
