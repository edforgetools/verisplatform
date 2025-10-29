# Task 00: Prep and Safety Net

**Phase:** 0 - Preparation
**Duration:** 30 minutes
**Risk:** Low
**Dependencies:** None

## Rationale

Establish a safe working environment with proper branching, backup of critical configs, and installation of all audit tooling before making any changes.

## Prerequisites

- Git repository clean (no uncommitted changes)
- GitHub CLI (`gh`) installed
- Node.js 20+ and PNPM installed
- Access to all external services (AWS, Supabase, Stripe)

## Steps

### 1. Create Feature Branch

```bash
# Ensure clean working directory
git status

# Create and switch to audit branch
git switch -c chore/audit-decruft
```

### 2. Backup Current Environment Files

```bash
# Create backup directory
mkdir -p .backups/$(date +%Y%m%d)

# Backup all environment files
cp frontend/.env.local .backups/$(date +%Y%m%d)/env.local.backup 2>/dev/null || echo "No .env.local found"
cp frontend/.env.example .backups/$(date +%Y%m%d)/env.example.backup

# Backup package files
cp package.json .backups/$(date +%Y%m%d)/
cp frontend/package.json .backups/$(date +%Y%m%d)/frontend-package.json
cp pnpm-lock.yaml .backups/$(date +%Y%m%d)/

# Backup workflow files
cp -r .github/workflows .backups/$(date +%Y%m%d)/

echo "Backups created in .backups/$(date +%Y%m%d)/"
```

### 3. Install Audit Tooling

```bash
# Install security tools
pnpm add -D -w gitleaks trufflehog

# Install code quality tools
cd frontend
pnpm add -D knip ts-prune depcheck madge jscpd

# Install additional audit utilities
pnpm add -D license-checker npm-audit-resolver zx

# Install git hook managers
pnpm add -D lefthook lint-staged

# Install bundle analysis
pnpm add -D webpack-bundle-analyzer @next/bundle-analyzer

# Verify installations
npx gitleaks version
npx knip --version
npx depcheck --version
npx madge --version
npx jscpd --version
```

### 4. Create Makefile for Consistent Automation

```bash
# Create Makefile in repository root
cat > Makefile << 'EOF'
# Veris Audit & Maintenance Makefile

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

# Run all audits
audit\\:all: audit\\:secrets audit\\:deps audit\\:licenses audit\\:dead audit\\:circular audit\\:dup audit\\:eslint audit\\:ts
	@echo "✅ All audits complete. See docs/audits/ for reports."

# Secret scanning
audit\\:secrets:
	@echo "🔍 Scanning for secrets..."
	@npx gitleaks detect --report-path=docs/audits/security/gitleaks-report.json --no-git || true
	@echo "✅ Secret scan complete. Report: docs/audits/security/gitleaks-report.json"

# Dependency audit
audit\\:deps:
	@echo "🔍 Auditing dependencies..."
	@cd frontend && npm audit --json > ../docs/audits/security/npm-audit.json || true
	@cd frontend && npm ls --json > ../docs/audits/sbom.json
	@cd frontend && npm outdated --json > ../docs/audits/outdated.json || true
	@echo "✅ Dependency audit complete. Report: docs/audits/security/npm-audit.json"

# License check
audit\\:licenses:
	@echo "🔍 Checking licenses..."
	@cd frontend && npx license-checker --json --out ../docs/audits/licenses.json
	@cd frontend && npx license-checker --summary > ../docs/audits/licenses.md
	@echo "✅ License check complete. Report: docs/audits/licenses.md"

# Dead code detection
audit\\:dead:
	@echo "🔍 Detecting dead code..."
	@cd frontend && npx knip --reporter json > ../docs/audits/knip-report.json || true
	@cd frontend && npx ts-prune > ../docs/audits/ts-prune-report.txt || true
	@echo "✅ Dead code detection complete. Reports in docs/audits/"

# Circular dependencies
audit\\:circular:
	@echo "🔍 Checking circular dependencies..."
	@cd frontend && npx madge --circular --json src > ../docs/audits/circular-deps.json || true
	@echo "✅ Circular dependency check complete. Report: docs/audits/circular-deps.json"

# Code duplication
audit\\:dup:
	@echo "🔍 Checking code duplication..."
	@cd frontend && npx jscpd src --reporters json --output ../docs/audits/duplication/ || true
	@echo "✅ Duplication check complete. Report: docs/audits/duplication/"

# Bundle analysis
audit\\:bundle:
	@echo "🔍 Analyzing bundle..."
	@cd frontend && ANALYZE=true npm run build
	@echo "✅ Bundle analysis complete. Report: frontend/.next/analyze/"

# ESLint
audit\\:eslint:
	@echo "🔍 Running ESLint..."
	@cd frontend && npm run lint > ../docs/audits/eslint-report.txt || true
	@echo "✅ ESLint complete. Report: docs/audits/eslint-report.txt"

# TypeScript strict check
audit\\:ts:
	@echo "🔍 Running TypeScript checks..."
	@cd frontend && npm run typecheck 2> ../docs/audits/typescript-errors.txt || true
	@echo "✅ TypeScript check complete. Report: docs/audits/typescript-errors.txt"

# External services audit
audit\\:services:
	@echo "🔍 Auditing external services..."
	@cd frontend && npx tsx ../scripts/services_audit.ts
	@echo "✅ Services audit complete. Report: docs/audits/services.md"

# Clean reports
clean\\:reports:
	@echo "🧹 Cleaning audit reports..."
	@rm -rf docs/audits/*.json docs/audits/*.txt docs/audits/*.md docs/audits/security/* docs/audits/duplication/*
	@echo "✅ Reports cleaned."
EOF

chmod +x Makefile
```

### 5. Update .gitignore

Add audit tool outputs and backups to `.gitignore`:

```diff
--- a/.gitignore
+++ b/.gitignore
@@ -1,11 +1,24 @@
 node_modules
 .env
 .env*
+!.env.example
 frontend/.env*
+!frontend/.env.example
 *.pem
 .vercel
 .next
 .supabase
 .next
 frontend/.next
+
+# Backups
+.backups/
+*.backup
+*.bak
+*.bak[0-9]
+*.old
+*.tmp
+
+# Audit outputs
+docs/audits/*.json
+docs/audits/security/*
+docs/audits/duplication/*
```

### 6. Clean Up Existing Backup Files

```bash
# List all backup files
find . -name "*.bak*" -o -name "*.backup*" -o -name "*.old" | grep -v node_modules | grep -v .git

# Move to .backups directory
mkdir -p .backups/legacy
find frontend -name ".env*.bak*" -o -name ".env*.backup*" | xargs -I {} mv {} .backups/legacy/

# Verify cleanup
ls -la frontend/.env*
```

### 7. Initialize Audit Directory Structure

```bash
# Create audit report directories
mkdir -p docs/audits/security
mkdir -p docs/audits/bundle
mkdir -p docs/audits/duplication

# Create placeholder files
touch docs/audits/services.md
touch docs/audits/github.md
touch docs/audits/deps.md
touch docs/audits/licenses.md
touch docs/audits/dead-code.md
touch docs/audits/circular-deps.md

echo "Audit directory structure created"
```

### 8. Commit Initial Setup

```bash
git add .
git commit -m "chore: initialize audit infrastructure

- Add audit tooling (gitleaks, knip, ts-prune, etc.)
- Create Makefile for consistent audit commands
- Set up docs/audits/ directory structure
- Clean up .env backup files
- Update .gitignore for audit outputs"
```

## Validation

Run these commands to verify setup:

```bash
# Verify branch
git branch --show-current
# Expected: chore/audit-decruft

# Verify backups exist
ls -la .backups/$(date +%Y%m%d)/
# Expected: env files, package.json, workflows

# Verify tooling installed
npx gitleaks version
npx knip --version
npx depcheck --version

# Verify Makefile works
make help
# Expected: List of audit commands

# Verify directory structure
tree docs/audits/
# Expected: README.md, placeholders, subdirectories
```

## Rollback

If issues arise, revert all changes:

```bash
# Delete branch and return to main
git checkout main
git branch -D chore/audit-decruft

# Restore from backups if needed
cp .backups/$(date +%Y%m%d)/package.json package.json
cp .backups/$(date +%Y%m%d)/frontend-package.json frontend/package.json

# Reinstall original dependencies
pnpm install
```

## Acceptance Criteria

- [ ] Branch `chore/audit-decruft` created and checked out
- [ ] Backups created in `.backups/YYYYMMDD/`
- [ ] All audit tools installed and working
- [ ] Makefile created with `make help` working
- [ ] `.gitignore` updated to exclude audit outputs
- [ ] Legacy .env backup files moved to `.backups/legacy/`
- [ ] `docs/audits/` directory structure created
- [ ] Initial commit made to branch
- [ ] No CI failures (if pushed)

## Estimated Cost

- **Time:** 30 minutes
- **Risk:** Low
- **Reversibility:** High (easy rollback)
- **Dependencies:** None

## Next Steps

Proceed to [TASK-01-SERVICES.md](./TASK-01-SERVICES.md) for external services audit.
