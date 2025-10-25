#!/bin/bash

# Script to set up Vercel environment variables
# Replace placeholder values with your actual values

echo "Setting up Vercel environment variables..."

# Client-side variables
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-anon-key"
vercel env add NEXT_PUBLIC_STRIPE_MODE production <<< "test"
vercel env add NEXT_PUBLIC_SITE_URL production <<< "https://frontend-snapthumb1s-projects.vercel.app"

# Server-side variables
vercel env add supabaseservicekey production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-service-key"
vercel env add STRIPE_SECRET_KEY production <<< "sk_test_placeholder"
vercel env add STRIPE_WEBHOOK_SECRET production <<< "whsec_placeholder"
vercel env add CRON_JOB_TOKEN production <<< "placeholder-cron-token-min-16-chars"
vercel env add VERIS_SIGNING_PRIVATE_KEY production <<< "-----BEGIN PRIVATE KEY-----\nplaceholder-private-key\n-----END PRIVATE KEY-----"
vercel env add VERIS_SIGNING_PUBLIC_KEY production <<< "-----BEGIN PUBLIC KEY-----\nplaceholder-public-key\n-----END PUBLIC KEY-----"

echo "Environment variables set up. Please replace placeholder values with your actual values."
echo "You can view and edit them at: https://vercel.com/snapthumb1s-projects/frontend/settings/environment-variables"
