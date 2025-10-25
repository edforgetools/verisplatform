#!/bin/bash

# =============================================================================
# VERIS - Real Credentials Setup Script
# =============================================================================
# This script helps set up real Supabase and Stripe credentials

set -e

echo "🚀 Setting up real credentials for Veris platform..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to prompt for input
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="${3:-false}"
    
    if [ "$is_secret" = "true" ]; then
        echo -e "${BLUE}$prompt${NC}"
        read -s -p "Enter value: " value
        echo ""
    else
        read -p "$prompt: " value
    fi
    
    eval "$var_name='$value'"
}

# Function to validate Supabase URL
validate_supabase_url() {
    local url="$1"
    if [[ $url =~ ^https://[a-zA-Z0-9-]+\.supabase\.co$ ]]; then
        return 0
    else
        echo -e "${RED}❌ Invalid Supabase URL format. Should be: https://your-project.supabase.co${NC}"
        return 1
    fi
}

# Function to validate Stripe key
validate_stripe_key() {
    local key="$1"
    local prefix="$2"
    if [[ $key =~ ^$prefix ]]; then
        return 0
    else
        echo -e "${RED}❌ Invalid Stripe key format. Should start with: $prefix${NC}"
        return 1
    fi
}

echo -e "${GREEN}📋 Let's gather your real credentials...${NC}"
echo ""

# =============================================================================
# SUPABASE CREDENTIALS
# =============================================================================
echo -e "${YELLOW}🔗 SUPABASE SETUP${NC}"
echo "Go to: https://supabase.com/dashboard"
echo "1. Select your project (or create a new one)"
echo "2. Go to Settings > API"
echo "3. Copy the Project URL and API keys"
echo ""

# Get Supabase URL
while true; do
    prompt_input "Supabase Project URL (https://your-project.supabase.co)" SUPABASE_URL
    if validate_supabase_url "$SUPABASE_URL"; then
        break
    fi
done

# Get Supabase Anon Key
prompt_input "Supabase Anon Key (starts with eyJ...)" SUPABASE_ANON_KEY true

# Get Supabase Service Key
prompt_input "Supabase Service Key (starts with eyJ...)" SUPABASE_SERVICE_KEY true

echo ""

# =============================================================================
# STRIPE CREDENTIALS
# =============================================================================
echo -e "${YELLOW}💳 STRIPE SETUP${NC}"
echo "Go to: https://dashboard.stripe.com/apikeys"
echo "1. Copy your Publishable key (pk_test_... or pk_live_...)"
echo "2. Copy your Secret key (sk_test_... or sk_live_...)"
echo "3. Go to Webhooks and create a new endpoint"
echo ""

# Get Stripe Secret Key
while true; do
    prompt_input "Stripe Secret Key (sk_test_... or sk_live_...)" STRIPE_SECRET_KEY true
    if validate_stripe_key "$STRIPE_SECRET_KEY" "sk_"; then
        break
    fi
done

# Get Stripe Publishable Key
while true; do
    prompt_input "Stripe Publishable Key (pk_test_... or pk_live_...)" STRIPE_PUBLISHABLE_KEY true
    if validate_stripe_key "$STRIPE_PUBLISHABLE_KEY" "pk_"; then
        break
    fi
done

# Get Stripe Webhook Secret
prompt_input "Stripe Webhook Secret (whsec_...)" STRIPE_WEBHOOK_SECRET true

echo ""

# =============================================================================
# DETERMINE STRIPE MODE
# =============================================================================
if [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
    STRIPE_MODE="test"
    echo -e "${GREEN}✅ Detected Stripe TEST mode${NC}"
else
    STRIPE_MODE="live"
    echo -e "${GREEN}✅ Detected Stripe LIVE mode${NC}"
fi

echo ""

# =============================================================================
# GENERATE ADDITIONAL KEYS
# =============================================================================
echo -e "${YELLOW}🔐 GENERATING ADDITIONAL KEYS${NC}"

# Generate CRON_JOB_TOKEN
CRON_JOB_TOKEN=$(openssl rand -hex 32)
echo -e "${GREEN}✅ Generated CRON_JOB_TOKEN${NC}"

# Generate INTERNAL_KEY
INTERNAL_KEY=$(openssl rand -hex 32)
echo -e "${GREEN}✅ Generated INTERNAL_KEY${NC}"

echo ""

# =============================================================================
# UPDATE LOCAL ENVIRONMENT FILE
# =============================================================================
echo -e "${YELLOW}📝 UPDATING LOCAL ENVIRONMENT FILE${NC}"

# Create backup of existing .env.local
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Created backup of existing .env.local${NC}"
fi

# Create new .env.local with real values
cat > .env.local << EOF
# =============================================================================
# VERIS - Environment Configuration (REAL VALUES)
# =============================================================================
# Generated on $(date)
# ⚠️  DO NOT COMMIT THIS FILE TO GIT

# =============================================================================
# CLIENT-SIDE VARIABLES (NEXT_PUBLIC_*)
# =============================================================================

# Supabase Configuration (Client)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Stripe Configuration (Client)
NEXT_PUBLIC_STRIPE_MODE=$STRIPE_MODE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY

# Site URL (Client)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# =============================================================================
# SERVER-SIDE VARIABLES
# =============================================================================

# Supabase Service Key (Server)
supabaseservicekey=$SUPABASE_SERVICE_KEY

# Stripe Configuration (Server)
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

# CRON Job Authentication (Server)
CRON_JOB_TOKEN=$CRON_JOB_TOKEN

# Internal Status Page (Server)
INTERNAL_KEY=$INTERNAL_KEY

# Veris Cryptographic Keys (Server)
# Using the existing keys from private_key_single_line.txt and public_key_single_line.txt
VERIS_SIGNING_PRIVATE_KEY=\$(cat private_key_single_line.txt)
VERIS_SIGNING_PUBLIC_KEY=\$(cat public_key_single_line.txt)

# =============================================================================
# DEVELOPMENT-ONLY VARIABLES
# =============================================================================
NODE_ENV=development
NEXT_PHASE=phase-development-server
EOF

echo -e "${GREEN}✅ Updated .env.local with real credentials${NC}"

# =============================================================================
# UPDATE VERCEL ENVIRONMENT VARIABLES
# =============================================================================
echo ""
echo -e "${YELLOW}☁️  UPDATING VERCEL ENVIRONMENT VARIABLES${NC}"

# Update Vercel environment variables
echo "Updating Vercel environment variables..."

# Client-side variables
vercel env rm NEXT_PUBLIC_SUPABASE_URL production --yes 2>/dev/null || true
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "$SUPABASE_URL"

vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes 2>/dev/null || true
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY"

vercel env rm NEXT_PUBLIC_STRIPE_MODE production --yes 2>/dev/null || true
vercel env add NEXT_PUBLIC_STRIPE_MODE production <<< "$STRIPE_MODE"

vercel env rm NEXT_PUBLIC_SITE_URL production --yes 2>/dev/null || true
vercel env add NEXT_PUBLIC_SITE_URL production <<< "https://frontend-snapthumb1s-projects.vercel.app"

# Server-side variables
vercel env rm supabaseservicekey production --yes 2>/dev/null || true
vercel env add supabaseservicekey production <<< "$SUPABASE_SERVICE_KEY"

vercel env rm STRIPE_SECRET_KEY production --yes 2>/dev/null || true
vercel env add STRIPE_SECRET_KEY production <<< "$STRIPE_SECRET_KEY"

vercel env rm STRIPE_WEBHOOK_SECRET production --yes 2>/dev/null || true
vercel env add STRIPE_WEBHOOK_SECRET production <<< "$STRIPE_WEBHOOK_SECRET"

vercel env rm CRON_JOB_TOKEN production --yes 2>/dev/null || true
vercel env add CRON_JOB_TOKEN production <<< "$CRON_JOB_TOKEN"

# Update signing keys with real values
vercel env rm VERIS_SIGNING_PRIVATE_KEY production --yes 2>/dev/null || true
vercel env add VERIS_SIGNING_PRIVATE_KEY production <<< "$(cat private_key_single_line.txt)"

vercel env rm VERIS_SIGNING_PUBLIC_KEY production --yes 2>/dev/null || true
vercel env add VERIS_SIGNING_PUBLIC_KEY production <<< "$(cat public_key_single_line.txt)"

echo -e "${GREEN}✅ Updated all Vercel environment variables${NC}"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${GREEN}🎉 SETUP COMPLETE!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "✅ Supabase URL: $SUPABASE_URL"
echo "✅ Stripe Mode: $STRIPE_MODE"
echo "✅ Local .env.local updated"
echo "✅ Vercel environment variables updated"
echo "✅ Real cryptographic keys configured"
echo ""
echo -e "${YELLOW}🔗 Next Steps:${NC}"
echo "1. Test the application locally: npm run dev"
echo "2. Deploy to Vercel: vercel --prod"
echo "3. Set up Stripe webhook endpoint: https://dashboard.stripe.com/webhooks"
echo "4. Configure Supabase database schema if needed"
echo ""
echo -e "${RED}⚠️  Important:${NC}"
echo "- Never commit .env.local to git"
echo "- Keep your API keys secure"
echo "- Test in staging before production"
echo ""
echo -e "${GREEN}🚀 Ready to go!${NC}"
