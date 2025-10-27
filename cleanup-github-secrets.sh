#!/bin/bash
# Script to delete unnecessary GitHub secrets for MVP
# Run with: bash cleanup-github-secrets.sh

set -e

echo "🗑️  GitHub Secrets Cleanup for MVP"
echo "===================================="
echo ""
echo "This will delete 23 unused secrets, keeping only 8 essential ones."
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# List of secrets to DELETE (all the unused ones)
SECRETS_TO_DELETE=(
  # Supabase (7 secrets)
  "PROD_SUPABASE_URL"
  "PROD_SUPABASE_ANON_KEY"
  "PROD_SUPABASE_SERVICE_KEY"
  "STAGING_SUPABASE_URL"
  "STAGING_SUPABASE_ANON_KEY"
  "STAGING_SUPABASE_SERVICE_KEY"
  "SUPABASE_ACCESS_TOKEN"
  
  # AWS (4 secrets)
  "PROD_AWS_ACCESS_KEY_ID"
  "PROD_AWS_SECRET_ACCESS_KEY"
  "STAGING_AWS_ACCESS_KEY_ID"
  "STAGING_AWS_SECRET_ACCESS_KEY"
  
  # Staging environment (6 secrets)
  "STAGING_STRIPE_SECRET_KEY"
  "STAGING_STRIPE_WEBHOOK_SECRET"
  "STAGING_CRON_JOB_TOKEN"
  "STAGING_REGISTRY_S3_BUCKET"
  "STAGING_VERIS_SIGNING_PRIVATE_KEY"
  "STAGING_VERIS_SIGNING_PUBLIC_KEY"
  
  # Production environment (6 secrets)
  "PROD_STRIPE_SECRET_KEY"
  "PROD_STRIPE_WEBHOOK_SECRET"
  "PROD_CRON_JOB_TOKEN"
  "PROD_REGISTRY_S3_BUCKET"
  "PROD_VERIS_SIGNING_PRIVATE_KEY"
  "PROD_VERIS_SIGNING_PUBLIC_KEY"
)

echo ""
echo "Deleting ${#SECRETS_TO_DELETE[@]} secrets..."
echo ""

for secret in "${SECRETS_TO_DELETE[@]}"; do
  echo -n "Deleting $secret... "
  if gh secret delete "$secret" 2>/dev/null; then
    echo "✅ Deleted"
  else
    echo "⚠️  Not found or already deleted"
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Remaining secrets (8):"
gh secret list

