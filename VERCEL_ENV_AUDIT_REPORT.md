# Vercel Environment Variables Audit Report

**Date:** 2025-01-29  
**Branch:** chore/audit-decruft-fixes  
**Status:** ✅ Complete

## Summary

✅ Removed deprecated `supabaseservicekey` variable name support  
✅ Removed `supabaseservicekey` from Vercel Production environment  
✅ All required Production environment variables are properly configured  
✅ Created audit script for ongoing verification

## Changes Made

### 1. Validation Script Updates
- **File:** `frontend/scripts/validate-env.ts`
- **Change:** Removed fallback support for deprecated `supabaseservicekey` variable name
- **Impact:** Code now only uses standard `SUPABASE_SERVICE_ROLE_KEY` variable name

### 2. Vercel Environment Cleanup
- **Action:** Removed `supabaseservicekey` from Production environment
- **Note:** Preview environment did not have this variable (was only in Production)

### 3. Audit Script Created
- **File:** `frontend/scripts/audit-vercel-env.sh`
- **Purpose:** Automated verification of all required environment variables
- **Usage:** Run `./scripts/audit-vercel-env.sh` from the frontend directory

## Production Environment Variables Status

### ✅ Required Variables (All Present)
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅
- `VERIS_SIGNING_PRIVATE_KEY` ✅
- `VERIS_SIGNING_PUBLIC_KEY` ✅
- `CRON_JOB_TOKEN` ✅
- `NEXT_PUBLIC_STRIPE_MODE` ✅
- `NEXT_PUBLIC_SITE_URL` ✅

### ✅ Optional Variables (All Present)
- `AWS_REGION` ✅
- `AWS_ROLE_ARN` ✅
- `NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID` ✅
- `NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID` ✅
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅

## Preview Environment Variables Status

### ✅ Recommended Variables (All Present)
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅
- `VERIS_SIGNING_PUBLIC_KEY` ✅

**Note:** Preview deployments skip strict validation to avoid blocking PRs. Missing variables won't fail preview builds.

## Variable Environment Assignments

### Production Only
- `VERIS_SIGNING_PRIVATE_KEY` (sensitive, production only)
- `CRON_JOB_TOKEN` (production cron jobs)
- `SUPABASE_SERVICE_ROLE_KEY` (production database)
- `NEXT_PUBLIC_SITE_URL` (production URL)
- `NEXT_PUBLIC_STRIPE_MODE` (production mode)
- `AWS_S3_REGISTRY_BUCKET_PROD` (production bucket)

### Preview Only
- `AWS_S3_REGISTRY_BUCKET_STAGING` (preview/staging bucket)

### Both Production and Preview
- `AWS_REGION` ✅
- `AWS_ROLE_ARN` ✅
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅
- `VERIS_SIGNING_PUBLIC_KEY` ✅
- `NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID` ✅
- `NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID` ✅
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅

## Deprecated Variables

### Removed
- ❌ `supabaseservicekey` - Removed from Production (migrated to `SUPABASE_SERVICE_ROLE_KEY`)

## Validation Behavior

- **Production Deployments:** Full validation enabled (all required variables must be present)
- **Preview Deployments:** Validation skipped (allows PRs to proceed without full production config)
- **Local Development:** Full validation with format checks (URLs, key formats, etc.)

## Next Steps

1. ✅ All required variables are correctly configured
2. ✅ Deprecated variables removed
3. ✅ Audit script available for ongoing verification

## Running the Audit

To verify environment variables anytime:

```bash
cd frontend
./scripts/audit-vercel-env.sh
```

This will check both Production and Preview environments and report any missing required variables.

