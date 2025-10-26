#!/bin/bash
# Simplified GitHub Workflows Validation Script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔍 GitHub Workflows Validation"
echo "=============================="
echo

# Check if workflow directory exists
log "Checking workflow directory..."
if [ ! -d ".github/workflows" ]; then
    error "Workflow directory not found: .github/workflows"
    exit 1
fi
success "Workflow directory exists"

# Check if main workflow files exist
log "Checking main workflow files..."
required_workflows=("ci.yml" "deploy-staging.yml" "deploy-production.yml")
for workflow in "${required_workflows[@]}"; do
    if [ ! -f ".github/workflows/$workflow" ]; then
        error "Required workflow missing: $workflow"
        exit 1
    fi
done
success "All main workflow files exist"

# Check if API endpoints exist
log "Checking API endpoints..."
api_endpoints=("/api/health" "/api/db-health")
for endpoint in "${api_endpoints[@]}"; do
    if [ ! -f "frontend/src/app${endpoint}/route.ts" ]; then
        error "Missing API endpoint: $endpoint"
        exit 1
    fi
done
success "All referenced API endpoints exist"

# Check if package.json exists and has required scripts
log "Checking package.json scripts..."
if [ ! -f "frontend/package.json" ]; then
    error "Package.json not found: frontend/package.json"
    exit 1
fi

required_scripts=("build" "lint" "typecheck" "test" "validate-services")
for script in "${required_scripts[@]}"; do
    if ! grep -q "\"$script\":" "frontend/package.json"; then
        error "Required script missing: $script"
        exit 1
    fi
done
success "All required scripts exist in package.json"

# Check if environment validation script exists
log "Checking validation scripts..."
if [ ! -f "frontend/src/scripts/validate-external-services.ts" ]; then
    error "External services validation script missing"
    exit 1
fi
success "Validation scripts exist"

# Check if secrets are referenced in workflows
log "Checking secrets references..."
required_secrets=("STAGING_SUPABASE_URL" "PROD_SUPABASE_URL" "VERCEL_TOKEN")
for secret in "${required_secrets[@]}"; do
    if ! grep -r "secrets\.$secret" .github/workflows/*.yml >/dev/null 2>&1; then
        warning "Secret not referenced in workflows: $secret"
    fi
done
success "Secrets validation completed"

echo
success "✅ All GitHub workflows validation checks passed!"
echo
echo "📋 Next steps:"
echo "1. Ensure all required secrets are configured in GitHub repository settings"
echo "2. Test workflows by pushing to develop branch (staging) or main branch (production)"
echo "3. Monitor workflow runs for any runtime issues"
echo "4. Review the GITHUB_SECRETS_SETUP.md file for complete setup instructions"
