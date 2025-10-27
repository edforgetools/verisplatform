# TODO: MVP Workflows & CI/CD Fixes

## Priority Tasks

### 1. Fix MVP Workflows
- [ ] Fix `e2e.yml` - currently hanging/failing
- [ ] Fix `web_quality.yml` - currently failing in ~46s
- [ ] Verify `content_guard.yml` works
- [ ] Verify `release_gate.yml` works

### 2. Remove Non-MVP Workflows
- [ ] Delete archived workflows from `.github/archive/`
- [ ] Remove `deploy-staging.yml` (not in MVP scope)
- [ ] Remove `deploy-production.yml` (not in MVP scope)
- [ ] Remove `test-comprehensive.yml` (not in MVP scope)
- [ ] Keep only: `content_guard.yml`, `e2e.yml`, `web_quality.yml`, `release_gate.yml`

### 3. Address GitHub Issues
- [ ] Check all open issues
- [ ] Close outdated issues
- [ ] Fix critical workflow failures

### 4. Make Everything Green
- [ ] All workflows pass consistently
- [ ] Vercel deployment succeeds
- [ ] All tests pass
- [ ] No workflow failures

### 5. Vercel Deployment
- [ ] Verify Vercel deployment works
- [ ] Check production URL
- [ ] Verify environment variables in Vercel
- [ ] Test deployed site

## Current Status
- ✅ GitHub secrets cleaned up (31 → 8)
- ❌ E2E workflow hanging/failing
- ❌ Web quality workflow failing
- ✅ Vercel deploying successfully
