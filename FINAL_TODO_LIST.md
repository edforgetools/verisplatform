# Final TODO List - Oct 27, 2025

## ✅ Completed Items

1. ✅ **Frontend UI improvements** - All complete

   - Removed duplicate Features section from home
   - Added JSON preview to demo page
   - Added paste proof.json support to verify page
   - Added accessibility features (focus states, reduced motion)
   - Added SEO metadata, sitemap, robots.txt

2. ✅ **Security fixes** - Complete

   - Moved SUPABASE_SERVICE_ROLE_KEY to GitHub Secrets
   - Rotated VERIS_SIGNING_PRIVATE_KEY and VERIS_SIGNING_PUBLIC_KEY
   - Fixed GitHub secret scanning alert (hardcoded keys removed)

3. ✅ **E2E test fixes** - Complete

   - Fixed mock endpoints from `/api/proof/verify` to `/api/verify`
   - Fixed mock response format to match actual API schema

4. ✅ **workflow fixes** - Complete
   - web_quality: PASSING
   - Auto-cancel confirmed working

## ⏳ In Progress

- **E2E workflow**: Running (~5 minutes) - should complete soon

## 📋 Pending Items (Low Priority)

1. **Git history cleanup** - Use BFG repo cleaner to remove exposed keys

   - Keys were rotated, but old keys are still in git history
   - Can be done later if security is a concern

2. **GitHub security alert** - Check if #2 auto-resolves

   - Alert is for old commit history where key was hardcoded
   - We removed it from current files
   - GitHub will rescan after workflows complete

3. **Production deployment verification** - After workflows pass
   - Check if verisplatform.com shows new frontend changes
   - Verify JSON preview, paste proof.json features work

## 🚫 Out of Scope (Don't Do Now)

- **Disabled Ed25519 files** - Not used, can stay disabled
- **Arweave publisher** - Per mvp.md §2.4, currently disabled and not needed for MVP
- **C2PA adapter** - Explicitly out of scope per mvp.md §2.6
- **Billing dashboard/docs pages** - Keeping for now (may be used)

## 🎯 Next Actions

1. Wait for E2E to complete (~2-5 minutes)
2. Verify all workflows pass
3. Check GitHub security alerts page
4. Verify production deployment
5. Monitor for any post-deployment issues
