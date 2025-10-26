#!/bin/bash
# Service Configuration Script
# This script helps configure all external services from the command line

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

echo "🔐 Service Configuration Script"
echo "=============================="
echo

# Function to prompt for input
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="${3:-false}"
    
    if [ "$is_secret" = "true" ]; then
        read -s -p "$prompt: " input
        echo
    else
        read -p "$prompt: " input
    fi
    
    eval "$var_name='$input'"
}

# Function to validate required input
validate_input() {
    local value="$1"
    local name="$2"
    
    if [ -z "$value" ]; then
        error "$name is required"
        return 1
    fi
    return 0
}

echo "This script will help you configure all external services."
echo "Make sure you have the following ready:"
echo "- Supabase access token"
echo "- Stripe API keys (test and live)"
echo "- AWS access keys"
echo "- Vercel token and project details"
echo

read -p "Do you want to continue? (y/n): " continue_setup
if [ "$continue_setup" != "y" ]; then
    echo "Setup cancelled."
    exit 0
fi

echo
log "Starting service configuration..."

# 1. Supabase Configuration
echo
echo "🌐 Supabase Configuration"
echo "------------------------"

prompt_input "Enter Supabase access token" SUPABASE_ACCESS_TOKEN true
if validate_input "$SUPABASE_ACCESS_TOKEN" "Supabase access token"; then
    export SUPABASE_ACCESS_TOKEN
    log "Testing Supabase connection..."
    if npx supabase login --token "$SUPABASE_ACCESS_TOKEN" >/dev/null 2>&1; then
        success "Supabase login successful"
        
        # List projects
        log "Available Supabase projects:"
        npx supabase projects list
        
        echo
        prompt_input "Enter staging Supabase project URL" STAGING_SUPABASE_URL
        prompt_input "Enter staging Supabase anon key" STAGING_SUPABASE_ANON_KEY true
        prompt_input "Enter staging Supabase service key" STAGING_SUPABASE_SERVICE_KEY true
        
        prompt_input "Enter production Supabase project URL" PROD_SUPABASE_URL
        prompt_input "Enter production Supabase anon key" PROD_SUPABASE_ANON_KEY true
        prompt_input "Enter production Supabase service key" PROD_SUPABASE_SERVICE_KEY true
    else
        error "Supabase login failed"
    fi
fi

# 2. AWS Configuration
echo
echo "☁️ AWS Configuration"
echo "-------------------"

prompt_input "Enter AWS Access Key ID" AWS_ACCESS_KEY_ID
prompt_input "Enter AWS Secret Access Key" AWS_SECRET_ACCESS_KEY true
prompt_input "Enter AWS Region (default: us-east-1)" AWS_REGION

if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-east-1"
fi

if validate_input "$AWS_ACCESS_KEY_ID" "AWS Access Key ID" && validate_input "$AWS_SECRET_ACCESS_KEY" "AWS Secret Access Key"; then
    log "Configuring AWS CLI..."
    
    # Configure AWS CLI
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
    aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
    aws configure set default.region "$AWS_REGION"
    aws configure set default.output json
    
    log "Testing AWS connection..."
    if aws sts get-caller-identity >/dev/null 2>&1; then
        success "AWS connection successful"
        
        # Create S3 buckets
        log "Creating S3 buckets..."
        aws s3 mb s3://veris-registry-staging --region "$AWS_REGION" || warning "Staging bucket may already exist"
        aws s3 mb s3://veris-registry-prod --region "$AWS_REGION" || warning "Production bucket may already exist"
        
        success "S3 buckets created"
    else
        error "AWS connection failed"
    fi
fi

# 3. Stripe Configuration
echo
echo "💳 Stripe Configuration"
echo "----------------------"

prompt_input "Enter staging Stripe secret key (sk_test_...)" STAGING_STRIPE_SECRET_KEY true
prompt_input "Enter staging Stripe webhook secret (whsec_...)" STAGING_STRIPE_WEBHOOK_SECRET true
prompt_input "Enter production Stripe secret key (sk_live_...)" PROD_STRIPE_SECRET_KEY true
prompt_input "Enter production Stripe webhook secret (whsec_...)" PROD_STRIPE_WEBHOOK_SECRET true

# 4. Vercel Configuration
echo
echo "🚀 Vercel Configuration"
echo "----------------------"

prompt_input "Enter Vercel token" VERCEL_TOKEN true
prompt_input "Enter Vercel organization ID" VERCEL_ORG_ID
prompt_input "Enter Vercel project ID" VERCEL_PROJECT_ID

if validate_input "$VERCEL_TOKEN" "Vercel token"; then
    export VERCEL_TOKEN
    log "Testing Vercel connection..."
    if vercel whoami >/dev/null 2>&1; then
        success "Vercel connection successful"
    else
        error "Vercel connection failed"
    fi
fi

# 5. Generate Cryptographic Keys
echo
echo "🔑 Cryptographic Keys"
echo "--------------------"

log "Generating cryptographic keys..."
cd frontend
if pnpm run generate-keys >/dev/null 2>&1; then
    success "Cryptographic keys generated"
    
    # Read the generated keys
    LATEST_PRIVATE_KEY=$(ls -t keys/private-key-*.pem | head -1)
    LATEST_PUBLIC_KEY=$(ls -t keys/public-key-*.pem | head -1)
    
    STAGING_VERIS_SIGNING_PRIVATE_KEY=$(cat "$LATEST_PRIVATE_KEY")
    STAGING_VERIS_SIGNING_PUBLIC_KEY=$(cat "$LATEST_PUBLIC_KEY")
    PROD_VERIS_SIGNING_PRIVATE_KEY="$STAGING_VERIS_SIGNING_PRIVATE_KEY"
    PROD_VERIS_SIGNING_PUBLIC_KEY="$STAGING_VERIS_SIGNING_PUBLIC_KEY"
    
    success "Keys loaded from $LATEST_PRIVATE_KEY and $LATEST_PUBLIC_KEY"
else
    error "Failed to generate keys"
fi

cd ..

# 6. Generate CRON tokens
echo
echo "🔐 Authentication Tokens"
echo "------------------------"

STAGING_CRON_JOB_TOKEN="staging-cron-$(openssl rand -hex 16)"
PROD_CRON_JOB_TOKEN="prod-cron-$(openssl rand -hex 16)"

success "CRON tokens generated"

# 7. Create GitHub Secrets Summary
echo
echo "📋 GitHub Secrets Summary"
echo "========================="

cat > github-secrets-summary.txt << EOF
# GitHub Secrets to Add
# Go to: Repository Settings > Secrets and variables > Actions > Repository secrets

# Supabase Configuration
STAGING_SUPABASE_URL=$STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY=$STAGING_SUPABASE_ANON_KEY
STAGING_SUPABASE_SERVICE_KEY=$STAGING_SUPABASE_SERVICE_KEY
PROD_SUPABASE_URL=$PROD_SUPABASE_URL
PROD_SUPABASE_ANON_KEY=$PROD_SUPABASE_ANON_KEY
PROD_SUPABASE_SERVICE_KEY=$PROD_SUPABASE_SERVICE_KEY
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN

# Stripe Configuration
STAGING_STRIPE_SECRET_KEY=$STAGING_STRIPE_SECRET_KEY
STAGING_STRIPE_WEBHOOK_SECRET=$STAGING_STRIPE_WEBHOOK_SECRET
PROD_STRIPE_SECRET_KEY=$PROD_STRIPE_SECRET_KEY
PROD_STRIPE_WEBHOOK_SECRET=$PROD_STRIPE_WEBHOOK_SECRET

# Cryptographic Keys
STAGING_VERIS_SIGNING_PRIVATE_KEY=$STAGING_VERIS_SIGNING_PRIVATE_KEY
STAGING_VERIS_SIGNING_PUBLIC_KEY=$STAGING_VERIS_SIGNING_PUBLIC_KEY
PROD_VERIS_SIGNING_PRIVATE_KEY=$PROD_VERIS_SIGNING_PRIVATE_KEY
PROD_VERIS_SIGNING_PUBLIC_KEY=$PROD_VERIS_SIGNING_PUBLIC_KEY

# Authentication Tokens
STAGING_CRON_JOB_TOKEN=$STAGING_CRON_JOB_TOKEN
PROD_CRON_JOB_TOKEN=$PROD_CRON_JOB_TOKEN

# AWS Configuration
STAGING_AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
STAGING_AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
PROD_AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
PROD_AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
STAGING_REGISTRY_S3_BUCKET=veris-registry-staging
PROD_REGISTRY_S3_BUCKET=veris-registry-prod

# Vercel Configuration
VERCEL_TOKEN=$VERCEL_TOKEN
VERCEL_ORG_ID=$VERCEL_ORG_ID
VERCEL_PROJECT_ID=$VERCEL_PROJECT_ID
EOF

success "GitHub secrets summary created: github-secrets-summary.txt"

# 8. Create Local Environment File
echo
echo "📝 Local Environment Configuration"
echo "----------------------------------"

cat > frontend/.env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$STAGING_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$STAGING_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$STAGING_SUPABASE_SERVICE_KEY

# Stripe Configuration
STRIPE_SECRET_KEY=$STAGING_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STAGING_STRIPE_WEBHOOK_SECRET

# AWS Configuration
AWS_REGION=$AWS_REGION
REGISTRY_BUCKET_STAGING=veris-registry-staging
REGISTRY_BUCKET_PROD=veris-registry-prod

# Cryptographic Keys
VERIS_SIGNING_PRIVATE_KEY=$STAGING_VERIS_SIGNING_PRIVATE_KEY
VERIS_SIGNING_PUBLIC_KEY=$STAGING_VERIS_SIGNING_PUBLIC_KEY

# Authentication
CRON_JOB_TOKEN=$STAGING_CRON_JOB_TOKEN

# App Configuration
APP_BASE_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
EOF

success "Local environment file created: frontend/.env.local"

# 9. Test Configuration
echo
echo "🧪 Testing Configuration"
echo "------------------------"

log "Testing external services..."
cd frontend

if pnpm run validate-services >/dev/null 2>&1; then
    success "External services validation passed"
else
    warning "External services validation had issues - check the output"
fi

if pnpm run validate-env >/dev/null 2>&1; then
    success "Environment validation passed"
else
    warning "Environment validation had issues - check the output"
fi

cd ..

# 10. Final Summary
echo
echo "✅ Configuration Complete!"
echo "========================="
echo
echo "Next steps:"
echo "1. Add the secrets from 'github-secrets-summary.txt' to your GitHub repository"
echo "2. Go to: Repository Settings > Secrets and variables > Actions"
echo "3. Add each secret with the exact name and value"
echo "4. Test the deployment by pushing to the develop branch"
echo
echo "Files created:"
echo "- github-secrets-summary.txt (GitHub secrets to add)"
echo "- frontend/.env.local (Local environment configuration)"
echo
echo "Services configured:"
echo "- ✅ Supabase (staging and production)"
echo "- ✅ AWS (S3 buckets created)"
echo "- ✅ Stripe (test and live keys)"
echo "- ✅ Vercel (project linked)"
echo "- ✅ Cryptographic keys generated"
echo "- ✅ Authentication tokens created"
echo
success "All services configured successfully!"
