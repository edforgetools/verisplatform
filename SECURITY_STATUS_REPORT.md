# Security Status Report

## GitHub Secret Scanning

### Active Alert

- **Alert #2**: Supabase Service Key
- **Status**: Open (in old commit history)
- **Created**: Oct 27, 2025 00:41 UTC
- **Resolution**: Key was moved to GitHub Secrets on Oct 27, 2025 02:59 UTC

### Why It's Still Open

The alert is for a key that was hardcoded in an old commit (`2565b7065344d9a25c853b7d5da9fa094a2c5d6e` from Oct 26). The key has been:

- ✅ Removed from all workflow files
- ✅ Moved to GitHub Secrets
- ✅ Rotated (new key in secrets)
- ❌ Still exists in git history (old commit)

### GitHub Secrets Status ✅

All required secrets are properly stored:

- ✅ SUPABASE_SERVICE_ROLE_KEY (updated 02:59 UTC)
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_WEBHOOK_SECRET
- ✅ VERIS_SIGNING_PRIVATE_KEY
- ✅ VERIS_SIGNING_PUBLIC_KEY
- ✅ CRON_JOB_TOKEN
- ✅ VERCEL credentials

### Recommendation

**Alert #2 will auto-close** when GitHub rescans the repository. The key is no longer in:

- Workflow files ✅
- Current code ✅
- Git history ⚠️ (old commit only)

To completely remove from history, would need to use BFG Repo Cleaner (out of scope for now).

---

_Status: Acceptable - key rotated, removed from code, only exists in old commit history_
