#!/bin/bash
# Veris Execution Scripts
# Aligned with veris_execution_tasks_v4.4.md

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date -u +%FT%TZ)]${NC} $1"
}

error() {
    echo -e "${RED}[$(date -u +%FT%TZ)] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date -u +%FT%TZ)] WARNING:${NC} $1"
}

# Check if required environment variables are set
check_env() {
    local required_vars=(
        "DEPLOY_MODE"
        "STRIPE_MODE" 
        "C2PA_MODE"
        "MIRROR_MODE"
        "ALERT_MODE"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
}

# Preflight checks
preflight() {
    log "Running preflight checks..."
    
    # Check if .env exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        error ".env file not found. Run 'cp .env.example .env' first"
        exit 1
    fi
    
    # Check if Makefile exists
    if [ ! -f "$PROJECT_ROOT/Makefile" ]; then
        error "Makefile not found"
        exit 1
    fi
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        error "pnpm is not installed"
        exit 1
    fi
    
    log "Preflight checks passed"
}

# Bootstrap the project
bootstrap() {
    log "Bootstrapping Veris project..."
    cd "$PROJECT_ROOT"
    make bootstrap
    log "Bootstrap complete"
}

# Sync environment with Vercel
sync_env() {
    log "Syncing environment with Vercel..."
    cd "$PROJECT_ROOT"
    make env:sync
    log "Environment synced"
}

# Initialize AWS S3 buckets and OIDC
init_aws() {
    log "Initializing AWS S3 buckets and OIDC..."
    cd "$PROJECT_ROOT"
    make aws:bucket:init
    log "AWS initialization complete"
}

# Apply database migrations
migrate_db() {
    log "Applying database migrations..."
    cd "$PROJECT_ROOT"
    make supabase:migrate
    log "Database migrations complete"
}

# Initialize proof system
init_proof() {
    log "Initializing proof system..."
    cd "$PROJECT_ROOT"
    make proof:init
    log "Proof system initialized"
}

# Initialize registry
init_registry() {
    log "Initializing registry..."
    cd "$PROJECT_ROOT"
    make registry:init
    log "Registry initialized"
}

# Initialize verification API
init_api() {
    log "Initializing verification API..."
    cd "$PROJECT_ROOT"
    make api:verify:init
    log "Verification API initialized"
}

# Seed Stripe
seed_stripe() {
    log "Seeding Stripe..."
    cd "$PROJECT_ROOT"
    make stripe:seed
    log "Stripe seeded"
}

# Build C2PA adapter
build_c2pa() {
    log "Building C2PA adapter..."
    cd "$PROJECT_ROOT"
    make c2pa:build
    log "C2PA adapter built"
}

# Run E2E tests
run_e2e() {
    log "Running E2E tests..."
    cd "$PROJECT_ROOT"
    make e2e
    log "E2E tests complete"
}

# Run dual-mode tests
run_dual_mode() {
    log "Running dual-mode tests..."
    cd "$PROJECT_ROOT"
    make test:proof:dual-mode
    log "Dual-mode tests complete"
}

# Deploy to Vercel
deploy() {
    log "Deploying to Vercel..."
    cd "$PROJECT_ROOT"
    make deploy
    log "Deployment complete"
}

# Create mirror snapshot
snapshot_mirror() {
    log "Creating mirror snapshot..."
    cd "$PROJECT_ROOT"
    make mirror:snapshot
    log "Mirror snapshot created"
}

# Post-deploy validation
validate_deploy() {
    log "Running post-deploy validation..."
    
    if [ -z "${APP_BASE_URL:-}" ]; then
        error "APP_BASE_URL not set"
        exit 1
    fi
    
    # Test verification API
    if curl -sf "$APP_BASE_URL/api/verify?proof_id=test" | jq . > /dev/null; then
        log "Verification API test passed"
    else
        error "Verification API test failed"
        exit 1
    fi
    
    # Test billing status
    if curl -sf "$APP_BASE_URL/api/billing/status" | jq . > /dev/null; then
        log "Billing API test passed"
    else
        error "Billing API test failed"
        exit 1
    fi
    
    log "Post-deploy validation complete"
}

# Run health checks
health_check() {
    log "Running health checks..."
    cd "$PROJECT_ROOT"
    make ops:health
    log "Health checks complete"
}

# Verify SLO compliance
verify_slo() {
    log "Verifying SLO compliance..."
    cd "$PROJECT_ROOT"
    make ops:verify-slo
    log "SLO verification complete"
}

# Main execution function
main() {
    local command="${1:-help}"
    
    case "$command" in
        "preflight")
            preflight
            ;;
        "bootstrap")
            preflight
            bootstrap
            ;;
        "sync-env")
            sync_env
            ;;
        "init-aws")
            init_aws
            ;;
        "migrate-db")
            migrate_db
            ;;
        "init-proof")
            init_proof
            ;;
        "init-registry")
            init_registry
            ;;
        "init-api")
            init_api
            ;;
        "seed-stripe")
            seed_stripe
            ;;
        "build-c2pa")
            build_c2pa
            ;;
        "e2e")
            run_e2e
            ;;
        "dual-mode")
            run_dual_mode
            ;;
        "deploy")
            deploy
            ;;
        "snapshot")
            snapshot_mirror
            ;;
        "validate")
            validate_deploy
            ;;
        "health")
            health_check
            ;;
        "slo")
            verify_slo
            ;;
        "full")
            preflight
            bootstrap
            sync_env
            init_aws
            migrate_db
            init_proof
            init_registry
            init_api
            seed_stripe
            build_c2pa
            run_e2e
            run_dual_mode
            deploy
            snapshot_mirror
            validate_deploy
            health_check
            verify_slo
            log "Full execution complete"
            ;;
        "help"|*)
            echo "Usage: $0 <command>"
            echo ""
            echo "Commands:"
            echo "  preflight     - Run preflight checks"
            echo "  bootstrap     - Bootstrap the project"
            echo "  sync-env      - Sync environment with Vercel"
            echo "  init-aws      - Initialize AWS S3 buckets and OIDC"
            echo "  migrate-db    - Apply database migrations"
            echo "  init-proof    - Initialize proof system"
            echo "  init-registry - Initialize registry"
            echo "  init-api      - Initialize verification API"
            echo "  seed-stripe   - Seed Stripe with test data"
            echo "  build-c2pa    - Build C2PA adapter"
            echo "  e2e           - Run E2E tests"
            echo "  dual-mode     - Run dual-mode tests"
            echo "  deploy        - Deploy to Vercel"
            echo "  snapshot      - Create mirror snapshot"
            echo "  validate      - Run post-deploy validation"
            echo "  health        - Run health checks"
            echo "  slo           - Verify SLO compliance"
            echo "  full          - Run full execution pipeline"
            echo "  help          - Show this help message"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
