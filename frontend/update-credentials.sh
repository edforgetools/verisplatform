#!/bin/bash

# =============================================================================
# VERIS - Update Credentials Script
# =============================================================================
# This script reads credentials from credentials-template.env and updates everything

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Updating Veris credentials...${NC}"
echo ""

# Check if template file exists
if [ ! -f "credentials-template.env" ]; then
    echo -e "${RED}❌ credentials-template.env not found!${NC}"
    echo "Please create the template file first with your credentials."
    exit 1
fi

# Source the template file
source credentials-template.env

# Validate required variables
if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project.supabase.co" ]; then
    echo -e "${RED}❌ Please set SUPABASE_URL in credentials-template.env${NC}"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ] || [ "$SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here" ]; then
    echo -e "${RED}❌ Please set SUPABASE_ANON_KEY in credentials-template.env${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ] || [ "$SUPABASE_SERVICE_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-key-here" ]; then
    echo -e "${RED}❌ Please set SUPABASE_SERVICE_KEY in credentials-template.env${NC}"
    exit 1
fi

if [ -z "$STRIPE_SECRET_KEY" ] || [ "$STRIPE_SECRET_KEY" = "sk_test_your-secret-key-here" ]; then
    echo -e "${RED}❌ Please set STRIPE_SECRET_KEY in credentials-template.env${NC}"
    exit 1
fi

if [ -z "$STRIPE_PUBLISHABLE_KEY" ] || [ "$STRIPE_PUBLISHABLE_KEY" = "pk_test_your-publishable-key-here" ]; then
    echo -e "${RED}❌ Please set STRIPE_PUBLISHABLE_KEY in credentials-template.env${NC}"
    exit 1
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ] || [ "$STRIPE_WEBHOOK_SECRET" = "whsec_your-webhook-secret-here" ]; then
    echo -e "${RED}❌ Please set STRIPE_WEBHOOK_SECRET in credentials-template.env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All credentials validated${NC}"

# Determine Stripe mode
if [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
    STRIPE_MODE="test"
    echo -e "${GREEN}✅ Detected Stripe TEST mode${NC}"
else
    STRIPE_MODE="live"
    echo -e "${GREEN}✅ Detected Stripe LIVE mode${NC}"
fi

# Generate additional keys
echo -e "${YELLOW}🔐 Generating additional keys...${NC}"
CRON_JOB_TOKEN=$(openssl rand -hex 32)
INTERNAL_KEY=$(openssl rand -hex 32)
echo -e "${GREEN}✅ Generated security keys${NC}"

# Create backup of existing .env.local
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Created backup of existing .env.local${NC}"
fi

# Create new .env.local with real values
echo -e "${YELLOW}📝 Updating local .env.local...${NC}"
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

# Update Vercel environment variables
echo -e "${YELLOW}☁️  Updating Vercel environment variables...${NC}"

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

# Summary
echo ""
echo -e "${GREEN}🎉 CREDENTIALS UPDATE COMPLETE!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "✅ Supabase URL: $SUPABASE_URL"
echo "✅ Stripe Mode: $STRIPE_MODE"
echo "✅ Local .env.local updated"
echo "✅ Vercel environment variables updated"
echo "✅ Real cryptographic keys configured"
echo ""
echo -e "${YELLOW}🔗 Next Steps:${NC}"
echo "1. Test locally: npm run dev"
echo "2. Deploy to Vercel: vercel --prod"
echo "3. Set up Stripe webhook endpoint"
echo ""
echo -e "${GREEN}🚀 Ready to go!${NC}"
