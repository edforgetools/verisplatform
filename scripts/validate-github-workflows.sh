#!/bin/bash
# GitHub Workflows Validation Script
# This script validates that all GitHub workflows are properly configured

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v pnpm &> /dev/null; then
        missing_deps+=("pnpm")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}"
        error "Please install the missing dependencies and try again"
        exit 1
    fi
    
    success "All dependencies are installed"
}

# Validate workflow files exist and are valid YAML
validate_workflow_files() {
    log "Validating workflow files..."
    
    local workflow_dir=".github/workflows"
    local invalid_files=()
    
    if [ ! -d "$workflow_dir" ]; then
        error "Workflow directory not found: $workflow_dir"
        exit 1
    fi
    
    for file in "$workflow_dir"/*.yml; do
        if [ -f "$file" ]; then
            # Basic YAML syntax check using grep for common YAML patterns
            if ! grep -q "^name:" "$file" || ! grep -q "^on:" "$file" || ! grep -q "^jobs:" "$file"; then
                invalid_files+=("$file")
            fi
        fi
    done
    
    if [ ${#invalid_files[@]} -ne 0 ]; then
        error "Invalid workflow files found: ${invalid_files[*]}"
        exit 1
    fi
    
    success "All workflow files have valid basic structure"
}

# Check for required secrets in workflow files
validate_workflow_secrets() {
    log "Validating workflow secrets..."
    
    local workflow_dir=".github/workflows"
    local required_secrets=(
        "STAGING_SUPABASE_URL"
        "STAGING_SUPABASE_ANON_KEY"
        "STAGING_SUPABASE_SERVICE_KEY"
        "PROD_SUPABASE_URL"
        "PROD_SUPABASE_ANON_KEY"
        "PROD_SUPABASE_SERVICE_KEY"
        "STAGING_STRIPE_SECRET_KEY"
        "STAGING_STRIPE_WEBHOOK_SECRET"
        "PROD_STRIPE_SECRET_KEY"
        "PROD_STRIPE_WEBHOOK_SECRET"
        "STAGING_VERIS_SIGNING_PRIVATE_KEY"
        "STAGING_VERIS_SIGNING_PUBLIC_KEY"
        "PROD_VERIS_SIGNING_PRIVATE_KEY"
        "PROD_VERIS_SIGNING_PUBLIC_KEY"
        "STAGING_CRON_JOB_TOKEN"
        "PROD_CRON_JOB_TOKEN"
        "VERCEL_TOKEN"
        "VERCEL_ORG_ID"
        "VERCEL_PROJECT_ID"
    )
    
    local missing_secrets=()
    
    for secret in "${required_secrets[@]}"; do
        if ! grep -r "secrets\.$secret" "$workflow_dir"/*.yml >/dev/null 2>&1; then
            missing_secrets+=("$secret")
        fi
    done
    
    if [ ${#missing_secrets[@]} -ne 0 ]; then
        warning "Secrets not referenced in workflows: ${missing_secrets[*]}"
        warning "These secrets may not be needed or workflows need to be updated"
    else
        success "All required secrets are referenced in workflows"
    fi
}

# Validate environment variables in workflows
validate_workflow_env_vars() {
    log "Validating workflow environment variables..."
    
    local workflow_dir=".github/workflows"
    local required_env_vars=(
        "NODE_VERSION"
        "PNPM_VERSION"
        "STAGING_URL"
        "PRODUCTION_URL"
    )
    
    local missing_env_vars=()
    
    for env_var in "${required_env_vars[@]}"; do
        if ! grep -r "env\.$env_var" "$workflow_dir"/*.yml >/dev/null 2>&1; then
            missing_env_vars+=("$env_var")
        fi
    done
    
    if [ ${#missing_env_vars[@]} -ne 0 ]; then
        warning "Environment variables not referenced: ${missing_env_vars[*]}"
    else
        success "All required environment variables are referenced"
    fi
}

# Test workflow syntax with act (if available)
test_workflow_syntax() {
    log "Testing workflow syntax..."
    
    if command -v act &> /dev/null; then
        log "Using act to validate workflow syntax..."
        
        # Test CI workflow
        if act --dry-run --workflows .github/workflows/ci.yml >/dev/null 2>&1; then
            success "CI workflow syntax is valid"
        else
            error "CI workflow has syntax errors"
            exit 1
        fi
        
        # Test staging deployment workflow
        if act --dry-run --workflows .github/workflows/deploy-staging.yml >/dev/null 2>&1; then
            success "Staging deployment workflow syntax is valid"
        else
            error "Staging deployment workflow has syntax errors"
            exit 1
        fi
        
        # Test production deployment workflow
        if act --dry-run --workflows .github/workflows/deploy-production.yml >/dev/null 2>&1; then
            success "Production deployment workflow syntax is valid"
        else
            error "Production deployment workflow has syntax errors"
            exit 1
        fi
    else
        warning "act not installed - skipping workflow syntax testing"
        warning "Install act with: brew install act (macOS) or see https://github.com/nektos/act"
    fi
}

# Validate package.json scripts referenced in workflows
validate_package_scripts() {
    log "Validating package.json scripts..."
    
    local workflow_dir=".github/workflows"
    local package_json="frontend/package.json"
    
    if [ ! -f "$package_json" ]; then
        error "Package.json not found: $package_json"
        exit 1
    fi
    
    # Extract script names from package.json
    local available_scripts
    available_scripts=$(node -e "console.log(Object.keys(require('./$package_json').scripts).join(' '))")
    
    # Check if workflows reference valid scripts
    local invalid_scripts=()
    
    for workflow_file in "$workflow_dir"/*.yml; do
        if [ -f "$workflow_file" ]; then
            # Extract pnpm run commands from workflow
            local workflow_scripts
            workflow_scripts=$(grep -o "pnpm.*run [a-zA-Z0-9_-]*" "$workflow_file" | sed 's/.*run //' | sort -u)
            
            for script in $workflow_scripts; do
                if [[ ! " $available_scripts " =~ " $script " ]]; then
                    invalid_scripts+=("$script (in $(basename "$workflow_file"))")
                fi
            done
        fi
    done
    
    
    if [ ${#invalid_scripts[@]} -ne 0 ]; then
        error "Invalid scripts referenced in workflows: ${invalid_scripts[*]}"
        exit 1
    fi
    
    success "All workflow scripts are valid"
}

# Validate API endpoints referenced in workflows
validate_api_endpoints() {
    log "Validating API endpoints..."
    
    local workflow_dir=".github/workflows"
    local api_endpoints=(
        "/api/health"
        "/api/db-health"
    )
    
    # Check if API endpoints exist in the codebase
    local missing_endpoints=()
    
    for endpoint in "${api_endpoints[@]}"; do
        local endpoint_path="frontend/src/app${endpoint}/route.ts"
        if [ ! -f "$endpoint_path" ]; then
            missing_endpoints+=("$endpoint")
        fi
    done
    
    if [ ${#missing_endpoints[@]} -ne 0 ]; then
        error "Missing API endpoints: ${missing_endpoints[*]}"
        exit 1
    fi
    
    success "All referenced API endpoints exist"
}

# Main validation function
main() {
    echo "🔍 GitHub Workflows Validation"
    echo "=============================="
    echo
    
    check_dependencies
    echo
    
    validate_workflow_files
    echo
    
    validate_workflow_secrets
    echo
    
    validate_workflow_env_vars
    echo
    
    validate_package_scripts
    echo
    
    validate_api_endpoints
    echo
    
    test_workflow_syntax
    echo
    
    success "✅ All GitHub workflows validation checks passed!"
    echo
    echo "📋 Next steps:"
    echo "1. Ensure all required secrets are configured in GitHub repository settings"
    echo "2. Test workflows by pushing to develop branch (staging) or main branch (production)"
    echo "3. Monitor workflow runs for any runtime issues"
    echo "4. Review the GITHUB_SECRETS_SETUP.md file for complete setup instructions"
}

# Run main function
main "$@"
