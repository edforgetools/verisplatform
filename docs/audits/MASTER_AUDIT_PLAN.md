# Veris Master Audit & Decruft Plan

**Generated:** 2025-01-29
**Target Completion:** 2-3 weeks
**Repository:** edforgetools/verisplatform
**Branch Strategy:** `chore/audit-decruft` → PR to `main`

## Executive Summary

This plan delivers a systematic audit and cleanup of the Veris codebase, external services, and GitHub environment to achieve:

- **Security:** Zero high/critical vulnerabilities, secrets scanning, key rotation
- **Performance:** Lighthouse ≥55/85/90/90, Core Web Vitals compliance
- **Code Quality:** Zero dead code, no circular deps, strict TypeScript
- **Compliance:** License audit, WCAG 2.2 AA accessibility
- **Operations:** Automated audits, CI/CD hardening, monitoring

## Current State Analysis

### ✅ Strengths
- Good CI/CD foundation (5 active workflows)
- Comprehensive E2E testing with Playwright
- Lighthouse CI already integrated
- TypeScript strict mode enabled
- PNPM workspace structure
- Extensive documentation

### ⚠️  Issues Identified
1. **9 .env backup files** in frontend/ (potential secret leak risk)
2. **No secret scanning** in CI (gitleaks/trufflehog needed)
3. **No dependency audit** automation (npm audit not in CI)
4. **No dead code detection** (knip/ts-prune not configured)
5. **No bundle analysis** (webpack-bundle-analyzer needed)
6. **Missing GitHub security features:**
   - No SECURITY.md
   - No CODEOWNERS
   - No dependabot.yml
   - Branch protection not documented
7. **Scattered scripts** (25+ scripts in multiple locations)
8. **No Makefile** for consistent automation
9. **Missing audit tooling:** depcheck, knip, ts-prune, jscpd, madge
10. **No service inventory** (AWS, Supabase, Stripe, Arweave)

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Secrets in git history | High | Medium | Scan with gitleaks, rotate keys |
| Outdated dependencies with vulns | High | High | Run npm audit, upgrade packages |
| Orphaned cloud resources | Medium | Medium | Service inventory and cleanup |
| Dead code increasing bundle | Low | High | Run knip/ts-prune, remove unused |
| Circular dependencies | Medium | Low | Run madge, refactor if found |
| Missing branch protection | High | Low | Configure via GitHub API |

## Task Breakdown (8 Phases)

### Phase 0: Prep and Safety Net
- **Duration:** 30 minutes
- **Risk:** Low
- **Tasks:** 4

### Phase 1: External Services Audit
- **Duration:** 2-3 hours
- **Risk:** Medium (requires access to AWS, Supabase, Stripe)
- **Tasks:** 6

### Phase 2: GitHub Hardening
- **Duration:** 1 hour
- **Risk:** Low
- **Tasks:** 5

### Phase 3: Secret Scanning and History Hygiene
- **Duration:** 1-2 hours
- **Risk:** Medium (may require key rotation)
- **Tasks:** 4

### Phase 4: Dependency Audit
- **Duration:** 2-4 hours
- **Risk:** Medium (breaking changes possible)
- **Tasks:** 6

### Phase 5: Codebase Decruft
- **Duration:** 3-6 hours
- **Risk:** Low-Medium
- **Tasks:** 7

### Phase 6: Bundle and Performance
- **Duration:** 2-3 hours
- **Risk:** Low
- **Tasks:** 5

### Phase 7: CI/CD Hardening
- **Duration:** 2-3 hours
- **Risk:** Low
- **Tasks:** 4

### Phase 8: Monitoring and Documentation
- **Duration:** 2-3 hours
- **Risk:** Low
- **Tasks:** 4

## Success Criteria

### Security
- [ ] Zero secrets detected in git history
- [ ] All keys rotated within 90 days
- [ ] Secret scanning enabled in CI
- [ ] Zero high/critical npm vulnerabilities
- [ ] Branch protection enabled on main
- [ ] Dependabot alerts active

### Performance
- [ ] Lighthouse Performance ≥55
- [ ] Lighthouse Accessibility ≥85
- [ ] Lighthouse Best Practices ≥90
- [ ] Lighthouse SEO ≥90
- [ ] LCP ≤1.8s
- [ ] CLS ≤0.1
- [ ] INP ≤200ms

### Code Quality
- [ ] Zero TypeScript errors in strict mode
- [ ] Zero ESLint warnings
- [ ] Zero unused exports (knip)
- [ ] Zero circular dependencies (madge)
- [ ] Code duplication <5% (jscpd)
- [ ] All tests passing

### Operations
- [ ] Makefile with all audit commands
- [ ] CI runs all audits automatically
- [ ] Service inventory documented
- [ ] Rollback procedures documented
- [ ] Maintenance schedule established

## Detailed Task Sequences

See individual task files:
- [TASK-00-PREP.md](./TASK-00-PREP.md)
- [TASK-01-SERVICES.md](./TASK-01-SERVICES.md)
- [TASK-02-GITHUB.md](./TASK-02-GITHUB.md)
- [TASK-03-SECRETS.md](./TASK-03-SECRETS.md)
- [TASK-04-DEPS.md](./TASK-04-DEPS.md)
- [TASK-05-DECRUFT.md](./TASK-05-DECRUFT.md)
- [TASK-06-BUNDLE.md](./TASK-06-BUNDLE.md)
- [TASK-07-CI.md](./TASK-07-CI.md)
- [TASK-08-MONITORING.md](./TASK-08-MONITORING.md)

## Execution Strategy

### For Cursor AI

Each task file is structured for Cursor consumption:

1. **Title and Context**
2. **Prerequisites** (what must be done first)
3. **Step-by-step Commands** (exact shell commands)
4. **File Changes** (diffs for file edits)
5. **Validation** (automated checks)
6. **Rollback** (revert instructions)
7. **Acceptance Criteria** (checklist)
8. **Estimated Time and Risk**

### Execution Order

Tasks should be executed sequentially by phase, but within each phase tasks can often be parallelized. Dependencies are explicitly called out in each task file.

### Continuous Integration

After each phase:
1. Run `make audit:all` locally
2. Commit changes to `chore/audit-decruft` branch
3. Push and verify CI passes
4. Review generated reports in `docs/audits/`

### Final Merge

After all phases complete:
1. Generate final audit summary
2. Create PR: `chore/audit-decruft` → `main`
3. Request review
4. Merge after approval
5. Tag release with audit completion

## Budget and Performance Targets

### Lighthouse Budgets (CI Enforced)

```json
{
  "performance": 55,
  "accessibility": 85,
  "best-practices": 90,
  "seo": 90
}
```

### Core Web Vitals

| Metric | Target | Measurement |
|--------|---------|-------------|
| LCP | ≤1.8s | 75th percentile |
| CLS | ≤0.1 | 75th percentile |
| INP | ≤200ms | 75th percentile |

### Bundle Size Budgets

| Bundle | Target | Current | Status |
|--------|--------|---------|--------|
| Main JS | <300KB gzip | TBD | 🔍 |
| Main CSS | <50KB gzip | TBD | 🔍 |
| Total Page | <400KB gzip | TBD | 🔍 |

### Dependency Budgets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Total Dependencies | <100 | 70 | ✅ |
| High Vulnerabilities | 0 | TBD | 🔍 |
| Critical Vulnerabilities | 0 | TBD | 🔍 |
| Outdated Packages | <10% | TBD | 🔍 |

## Day-2 Operations

### Weekly Maintenance

```bash
make audit:secrets
make audit:deps
make audit:dead
```

**Owner:** Engineering Lead
**Duration:** 15 minutes
**Alert on:** Any high/critical findings

### Monthly Maintenance

```bash
make audit:services
make audit:licenses
make audit:bundle
```

**Owner:** Engineering Lead
**Duration:** 30 minutes
**Actions:**
- Rotate old API keys (>60 days)
- Review new dependencies
- Check bundle size trends

### Quarterly Review

```bash
make audit:all
# Manual review of:
# - AWS IAM policies
# - S3 bucket policies
# - Supabase RLS rules
# - GitHub permissions
```

**Owner:** CTO / Security Lead
**Duration:** 2-4 hours
**Deliverable:** Audit report and remediation plan

### Annual Audit

- Full penetration test
- Third-party security audit
- Compliance review (WCAG, GDPR, etc.)
- Architecture review
- Registry integrity audit

**Owner:** CTO + External Auditor
**Duration:** 1-2 weeks
**Budget:** $10-20K

## Automation Philosophy

All audits should be:

1. **Automated** - Runnable via `make` or npm script
2. **Fast** - Complete in <5 minutes for CI
3. **Reliable** - Deterministic, no flaky checks
4. **Actionable** - Clear output with remediation steps
5. **Versioned** - Reports committed to git
6. **Monitored** - Failures alert engineering team

## Rollback Strategy

Each task includes rollback instructions. General rollback:

```bash
# Revert last commit
git reset --hard HEAD~1

# Revert entire branch
git checkout main
git branch -D chore/audit-decruft

# Restore specific file
git checkout main -- path/to/file
```

## References

- [Veris Build Plan](../CURSOR_BUILD_PLAN.md)
- [Implementation Status](../IMPLEMENTATION_STATUS.md)
- [Next Steps](../NEXT_STEPS_FOR_CURSOR.md)
- [CI/CD Archive](../../.github/archive/)
- [Environment Setup](../env.md)

## Appendix: Tool Inventory

### Security
- `gitleaks` - Secret scanning
- `trufflehog` - Deep secret detection
- `npm audit` - Dependency vulnerabilities
- GitHub secret scanning (native)

### Code Quality
- `knip` - Unused exports and dependencies
- `ts-prune` - Unused TypeScript exports
- `depcheck` - Unused dependencies
- `madge` - Circular dependencies
- `jscpd` - Code duplication

### Performance
- Lighthouse CLI - Web vitals and audits
- `webpack-bundle-analyzer` - Bundle visualization
- `source-map-explorer` - Bundle composition

### Compliance
- `license-checker` - License audit
- `pa11y-ci` - Accessibility testing
- Playwright - E2E and visual regression

### DevOps
- `lefthook` - Git hooks
- `husky` - Alternative git hooks
- `lint-staged` - Pre-commit linting
- GitHub Actions - CI/CD

## Contact and Support

**Questions?** Open an issue in the repository.
**Emergency?** Contact engineering lead directly.
**Contributing?** See [CONTRIBUTING.md](../../CONTRIBUTING.md) (TBD)
