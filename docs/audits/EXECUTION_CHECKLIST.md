# Veris Audit & Decruft - Execution Checklist

**Date:** 2025-01-29
**Branch:** `chore/audit-decruft`
**Executor:** Cursor AI + Human Review
**Estimated Total Time:** 15-25 hours over 2-3 weeks

## Pre-Flight Checklist

Before starting any tasks:

- [ ] Read [MASTER_AUDIT_PLAN.md](./MASTER_AUDIT_PLAN.md)
- [ ] Ensure clean git working directory
- [ ] Backup critical files (`.env`, configs)
- [ ] Verify access to all external services
- [ ] Install required tools (gitleaks, knip, etc.)
- [ ] Review current CI/CD status (all green)
- [ ] Notify team of audit start
- [ ] Create feature branch: `git switch -c chore/audit-decruft`

## Phase 0: Prep and Safety Net ⏱️ 30 min

**Task File:** [TASK-00-PREP.md](./TASK-00-PREP.md)

- [ ] Create feature branch `chore/audit-decruft`
- [ ] Backup environment files to `.backups/`
- [ ] Backup package.json and workflows
- [ ] Install audit tooling (gitleaks, knip, depcheck, etc.)
- [ ] Create Makefile with audit commands
- [ ] Update .gitignore for audit outputs and backups
- [ ] Clean up existing .env backup files (9 files found)
- [ ] Create `docs/audits/` directory structure
- [ ] Verify `make help` works
- [ ] Commit initial setup
- [ ] **Validation:** Run `make help` and verify output

**Exit Criteria:** Tooling installed, Makefile works, clean git commit

---

## Phase 1: External Services Audit ⏱️ 2-3 hours

**Task File:** [TASK-01-SERVICES.md](./TASK-01-SERVICES.md)

- [ ] Run services audit script: `make audit:services`
- [ ] Review AWS IAM roles and policies
- [ ] Check S3 bucket configurations (versioning, encryption)
- [ ] Audit Supabase RLS policies and grants
- [ ] Review Stripe API keys and webhook config
- [ ] Check Redis/Upstash configuration
- [ ] Verify Arweave gateway and wallet
- [ ] Document all service endpoints and credentials
- [ ] Generate `docs/audits/services.md` report
- [ ] Generate `docs/audits/services.json` inventory
- [ ] Identify key rotation needs
- [ ] **Validation:** Services report exists, no critical issues

**Exit Criteria:** Complete service inventory, zero critical config issues

---

## Phase 2: GitHub Hardening ⏱️ 1 hour

**Task File:** [TASK-02-GITHUB.md](./TASK-02-GITHUB.md)

- [ ] Create `SECURITY.md` with security policy
- [ ] Create `CODEOWNERS` file
- [ ] Enable branch protection on `main`
  - [ ] Require PR reviews
  - [ ] Require status checks
  - [ ] Require signed commits (optional)
- [ ] Enable Dependabot alerts
- [ ] Configure `dependabot.yml`
- [ ] Enable secret scanning (GitHub native)
- [ ] Review GitHub Actions permissions
- [ ] Document branch protection in `.github/BRANCH_PROTECTION.md`
- [ ] Generate `docs/audits/github.md` report
- [ ] **Validation:** `gh api` confirms protections

**Exit Criteria:** Branch protection active, security features enabled

---

## Phase 3: Secret Scanning & History Hygiene ⏱️ 1-2 hours

**Task File:** [TASK-03-SECRETS.md](./TASK-03-SECRETS.md)

- [ ] Run secret scan: `make audit:secrets`
- [ ] Review gitleaks report
- [ ] Review trufflehog report
- [ ] Scan git history for committed secrets
- [ ] Check for large binary files
- [ ] Configure git-lfs if needed
- [ ] Set up lefthook/husky for pre-commit hooks
- [ ] Add secret scanning to CI
- [ ] Rotate any exposed credentials
- [ ] Update `.gitignore` comprehensively
- [ ] **Validation:** Zero secrets detected, pre-commit hooks work

**Exit Criteria:** No secrets in history, pre-commit hooks active

---

## Phase 4: Dependency Audit ⏱️ 2-4 hours

**Task File:** [TASK-04-DEPS.md](./TASK-04-DEPS.md)

- [ ] Run dependency audit: `make audit:deps`
- [ ] Generate SBOM: `npm ls --json > docs/audits/sbom.json`
- [ ] Run `depcheck` to find unused dependencies
- [ ] Review npm audit report
- [ ] Address high/critical vulnerabilities
- [ ] Run `npm outdated` and review upgrades
- [ ] Run license check: `make audit:licenses`
- [ ] Flag non-permissive licenses
- [ ] Remove unused dependencies
- [ ] Update dependencies (test after each)
- [ ] Generate `docs/audits/deps.md` report
- [ ] **Validation:** Zero high/critical vulnerabilities, tests pass

**Exit Criteria:** No high/critical vulns, licenses compliant, tests green

---

## Phase 5: Codebase Decruft ⏱️ 5-9 hours

### Phase 5A: Documentation Cleanup ⏱️ 2-3 hours

**Task File:** [TASK-05A-DOCS-DECRUFT.md](./TASK-05A-DOCS-DECRUFT.md)

- [ ] Generate documentation inventory
- [ ] Archive outdated build plans to `docs/archive/build-plans/`
- [ ] Archive historical reports to `docs/archive/reports/`
- [ ] Move CHANGELOG to root
- [ ] Update `docs/README.md` with clear structure
- [ ] Create `docs/DOCUMENTATION_GUIDE.md`
- [ ] Add test artifacts to `.gitignore`
- [ ] Remove committed test result markdown files
- [ ] Verify no broken links in main docs
- [ ] **Validation:** Link check passes, docs organized

### Phase 5B: Code Cleanup ⏱️ 3-6 hours

**Task File:** [TASK-05-DECRUFT.md](./TASK-05-DECRUFT.md)

- [ ] Run dead code detection: `make audit:dead`
- [ ] Review knip report
- [ ] Review ts-prune report
- [ ] Remove unused exports and functions
- [ ] Run circular dependency check: `make audit:circular`
- [ ] Refactor circular imports if found
- [ ] Run code duplication check: `make audit:dup`
- [ ] Consolidate duplicated code (if >5%)
- [ ] Enforce strict mode in `tsconfig.json`
- [ ] Fix all TypeScript strict mode errors
- [ ] Run ESLint: `make audit:eslint`
- [ ] Fix all ESLint warnings
- [ ] Consolidate scripts to `/scripts/` directory
- [ ] **Validation:** tsc, eslint, knip all clean

**Exit Criteria:** Zero dead code, no circular deps, strict TS, zero lint warnings

---

## Phase 6: Bundle & Performance ⏱️ 2-3 hours

**Task File:** [TASK-06-BUNDLE.md](./TASK-06-BUNDLE.md)

- [ ] Add Next.js bundle analyzer
- [ ] Run bundle analysis: `make audit:bundle`
- [ ] Review bundle size report
- [ ] Identify heavy dependencies
- [ ] Tree-shake or replace large libraries
- [ ] Enable CSP headers in Next.js config
- [ ] Add SRI (Subresource Integrity) for CDN assets
- [ ] Configure security headers (Referrer-Policy, etc.)
- [ ] Create middleware test for headers
- [ ] Add lighthouse budgets file
- [ ] Run Lighthouse CI locally
- [ ] Generate `docs/audits/bundle/` report
- [ ] **Validation:** Bundle <300KB, headers present, Lighthouse meets budgets

**Exit Criteria:** Performance budgets met, security headers enforced

---

## Phase 7: CI/CD Hardening ⏱️ 2-3 hours

**Task File:** [TASK-07-CI.md](./TASK-07-CI.md)

- [ ] Review existing workflows (5 active workflows)
- [ ] Add/update `ci.yml`: lint, test, build, audit
- [ ] Add/update `security.yml`: gitleaks, npm audit, CodeQL (optional)
- [ ] Update `release_gate.yml` with audit checks
- [ ] Pin GitHub Actions to SHAs (security)
- [ ] Add pnpm caching to workflows
- [ ] Add Lighthouse CI to workflows (already exists - verify)
- [ ] Add Pa11y CI to workflows (already exists - verify)
- [ ] Enforce Lighthouse budgets in CI
- [ ] Add audit failure notifications
- [ ] Test all workflows with dry-run
- [ ] **Validation:** 3 consecutive green CI runs

**Exit Criteria:** CI runs all audits, enforces budgets, pins actions

---

## Phase 8: Monitoring & Documentation ⏱️ 2-3 hours

**Task File:** [TASK-08-MONITORING.md](./TASK-08-MONITORING.md)

- [ ] Configure Sentry (if not already)
- [ ] Add privacy-preserving analytics events
- [ ] Set up synthetic monitoring (optional)
- [ ] Document error budget policy
- [ ] Create maintenance schedule in README
- [ ] Update main README with audit status badges
- [ ] Generate final audit summary report
- [ ] Document rollback procedures
- [ ] Create Day-2 operations guide
- [ ] Schedule quarterly audit review
- [ ] **Validation:** Monitoring active, docs complete

**Exit Criteria:** Observability configured, maintenance schedule documented

---

## Post-Completion Checklist

After all phases:

- [ ] Run full audit suite: `make audit:all`
- [ ] Verify all reports in `docs/audits/`
- [ ] Run full test suite: `pnpm test && pnpm test:e2e`
- [ ] Run local build: `pnpm build`
- [ ] Review all git commits for quality
- [ ] Squash/rebase commits if needed
- [ ] Push branch: `git push origin chore/audit-decruft`
- [ ] Verify CI passes on GitHub
- [ ] Generate final summary: [FINAL_AUDIT_SUMMARY.md](./FINAL_AUDIT_SUMMARY.md)
- [ ] Create PR: `chore/audit-decruft` → `main`
- [ ] Request review from team lead
- [ ] Address PR feedback
- [ ] Merge PR
- [ ] Tag release: `git tag v1.0.0-audit-complete`
- [ ] Deploy to staging
- [ ] Verify staging deployment
- [ ] Deploy to production (when ready)
- [ ] Schedule first routine audit (7 days)

---

## Success Metrics

### Security ✅
- [x] Zero secrets detected in git history
- [ ] All keys rotated within 90 days
- [ ] Secret scanning enabled in CI
- [ ] Zero high/critical npm vulnerabilities
- [ ] Branch protection enabled on main
- [ ] Dependabot alerts active

### Performance 📊
- [ ] Lighthouse Performance ≥55
- [ ] Lighthouse Accessibility ≥85
- [ ] Lighthouse Best Practices ≥90
- [ ] Lighthouse SEO ≥90
- [ ] LCP ≤1.8s
- [ ] CLS ≤0.1
- [ ] INP ≤200ms

### Code Quality 🔍
- [ ] Zero TypeScript errors in strict mode
- [ ] Zero ESLint warnings
- [ ] Zero unused exports (knip)
- [ ] Zero circular dependencies (madge)
- [ ] Code duplication <5% (jscpd)
- [ ] All tests passing (100% suite)

### Operations 🔧
- [ ] Makefile with all audit commands
- [ ] CI runs all audits automatically
- [ ] Service inventory documented
- [ ] Rollback procedures documented
- [ ] Maintenance schedule established

---

## Rollback Plan

If critical issues arise during audit:

### Immediate Rollback
```bash
git checkout main
git branch -D chore/audit-decruft
```

### Partial Rollback (specific file)
```bash
git checkout main -- path/to/file
```

### Restore from Backup
```bash
cp .backups/YYYYMMDD/env.local.backup frontend/.env.local
cp .backups/YYYYMMDD/package.json package.json
pnpm install
```

---

## Notes for Cursor AI

### Task Execution Strategy
1. Execute tasks sequentially by phase
2. Within each phase, parallelize where possible
3. Commit after each completed phase
4. Run validations before proceeding to next phase
5. If validation fails, fix issues before continuing
6. Document any deviations in commit messages

### Communication
- Report progress after each phase
- Flag any issues immediately
- Ask for human review on ambiguous decisions
- Provide rollback instructions if changes are risky
- Summarize findings at the end of each phase

### Quality Standards
- All code changes must pass TypeScript compiler
- All code changes must pass ESLint
- All tests must pass before committing
- All audit commands must run successfully
- All documentation must be accurate and up-to-date

---

## Resources

- [MASTER_AUDIT_PLAN.md](./MASTER_AUDIT_PLAN.md) - Overall strategy
- [docs/audits/README.md](./README.md) - Audit tooling guide
- [Veris Documentation](../../README.md) - Project documentation
- [GitHub Issues](https://github.com/edforgetools/verisplatform/issues) - Issue tracker

---

## Status Legend

- [ ] Not Started
- [x] Completed
- [~] In Progress
- [!] Blocked
- [?] Needs Review

---

**Last Updated:** 2025-01-29
**Next Review:** After Phase 4 completion
