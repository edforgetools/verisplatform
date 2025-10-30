#!/bin/bash
# Audit Vercel Environment Variables
# This script audits the Vercel environment variables and reports what's missing

set -e

echo "🔍 Auditing Vercel Environment Variables..."
echo ""

# Required variables for Production (from validate-env.ts)
REQUIRED_PROD=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "VERIS_SIGNING_PRIVATE_KEY"
  "VERIS_SIGNING_PUBLIC_KEY"
  "CRON_JOB_TOKEN"
  "NEXT_PUBLIC_STRIPE_MODE"
  "NEXT_PUBLIC_SITE_URL"
)

# Optional but recommended for Production
OPTIONAL_PROD=(
  "AWS_REGION"
  "AWS_ROLE_ARN"
  "NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID"
  "NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
)

# Check Production environment
echo "📋 PRODUCTION ENVIRONMENT:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

prod_vars=$(cd "$(dirname "$0")/.." && npx vercel env ls production 2>&1 | grep -E "^ [A-Za-z_]" | awk '{print $1}' | sort)

missing_prod=()
for var in "${REQUIRED_PROD[@]}"; do
  if echo "$prod_vars" | grep -q "^${var}$"; then
    echo "✅ $var"
  else
    echo "❌ $var (MISSING)"
    missing_prod+=("$var")
  fi
done

echo ""
echo "📌 Optional variables for Production:"
for var in "${OPTIONAL_PROD[@]}"; do
  if echo "$prod_vars" | grep -q "^${var}$"; then
    echo "✅ $var"
  else
    echo "⚪ $var (not set)"
  fi
done

# Check for deprecated variables
echo ""
echo "⚠️  Deprecated variables:"
if echo "$prod_vars" | grep -q "^supabaseservicekey$"; then
  echo "❌ supabaseservicekey (should be removed - use SUPABASE_SERVICE_ROLE_KEY)"
else
  echo "✅ No deprecated variables found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Preview environment
echo "📋 PREVIEW ENVIRONMENT:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ℹ️  Preview deployments skip strict validation, but these are recommended:"

preview_vars=$(cd "$(dirname "$0")/.." && npx vercel env ls preview 2>&1 | grep -E "^ [A-Za-z_]" | awk '{print $1}' | sort)

RECOMMENDED_PREVIEW=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "VERIS_SIGNING_PUBLIC_KEY"
)

for var in "${RECOMMENDED_PREVIEW[@]}"; do
  if echo "$preview_vars" | grep -q "^${var}$"; then
    echo "✅ $var"
  else
    echo "⚪ $var (not set - optional for preview)"
  fi
done

echo ""
echo "⚠️  Deprecated variables:"
if echo "$preview_vars" | grep -q "^supabaseservicekey$"; then
  echo "❌ supabaseservicekey (should be removed)"
else
  echo "✅ No deprecated variables found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Summary
if [ ${#missing_prod[@]} -eq 0 ]; then
  echo "✅ All required Production variables are set!"
  exit 0
else
  echo "❌ Missing required Production variables:"
  for var in "${missing_prod[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "To add missing variables, use:"
  echo "  npx vercel env add <VAR_NAME> production"
  exit 1
fi

