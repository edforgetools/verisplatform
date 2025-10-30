# Cursor AI - Quick Start Guide for Veris Audit

**Purpose:** Enable Cursor AI to autonomously execute the Veris audit and decruft plan.

## Overview

This audit consists of **8 phases** with **45+ individual tasks** designed to:
1. Secure the codebase and external services
2. Improve code quality and remove dead code
3. Optimize performance and bundle size
4. Harden CI/CD pipelines
5. Establish monitoring and maintenance procedures

## Quick Start

### Step 1: Read Master Plan
```bash
cat docs/audits/MASTER_AUDIT_PLAN.md
```

**Key takeaways:**
- Current state analysis and issues identified
- 8 phases with dependencies
- Success criteria and budgets
- Day-2 operations schedule

### Step 2: Review Execution Checklist
```bash
cat docs/audits/EXECUTION_CHECKLIST.md
```

**Key takeaways:**
- Phase-by-phase task breakdown
- Validation criteria for each phase
- Success metrics (security, performance, quality)
- Rollback procedures

### Step 3: Start with Phase 0
```bash
cat docs/audits/TASK-00-PREP.md
```

**Execute in order:**
1. Create branch: `git switch -c chore/audit-decruft`
2. Backup critical files
3. Install tooling
4. Create Makefile
5. Verify setup
6. Commit

## Task File Structure

Each `TASK-XX-*.md` file contains:

### 1. Header
- Phase number and name
- Duration estimate
- Risk level
- Dependencies

### 2. Rationale
Why this task matters and what it achieves.

### 3. Prerequisites
What must be completed before starting.

### 4. Steps
Exact shell commands and file changes, numbered sequentially.

### 5. Validation
Commands to verify success before proceeding.

### 6. Rollback
Instructions to revert if issues arise.

### 7. Acceptance Criteria
Checklist of completion requirements.

### 8. Cost Estimate
Time, risk, and reversibility assessment.

## Automation Commands

All tasks are wrapped in Makefile targets:

```bash
# View all commands
make help

# Run specific audit
make audit:secrets
make audit:deps
make audit:dead
make audit:bundle

# Run all audits
make audit:all

# Clean reports
make clean:reports
```

## Phase Overview

| Phase | Focus | Duration | Risk | Tasks |
|-------|-------|----------|------|-------|
| 0 | Prep & Safety Net | 30 min | Low | 4 |
| 1 | External Services | 2-3 hrs | Medium | 6 |
| 2 | GitHub Hardening | 1 hr | Low | 5 |
| 3 | Secret Scanning | 1-2 hrs | Medium | 4 |
| 4 | Dependency Audit | 2-4 hrs | Medium | 6 |
| 5A | Docs Decruft | 2-3 hrs | Low | 9 |
| 5B | Code Decruft | 3-6 hrs | Medium | 7 |
| 6 | Bundle & Perf | 2-3 hrs | Low | 5 |
| 7 | CI/CD Hardening | 2-3 hrs | Low | 4 |
| 8 | Monitoring | 2-3 hrs | Low | 4 |

**Total:** 15-25 hours over 2-3 weeks

## Critical Issues Identified

From initial analysis, these are **must-fix** items:

### High Priority
1. **9 .env backup files** - potential secret leak
2. **No secret scanning** in CI - security gap
3. **No dependency audit** in CI - vulnerability risk
4. **Missing GitHub security:** SECURITY.md, CODEOWNERS, dependabot.yml

### Medium Priority
5. **No dead code detection** - bundle bloat
6. **No bundle analysis** - performance risk
7. **Scattered scripts** (25+ locations) - maintainability
8. **No service inventory** - operational risk

### Low Priority
9. **No Makefile** - inconsistent automation
10. **Documentation scattered** - discoverability issues

## Decision Points for Human Review

Cursor should pause and ask for human input on:

1. **Key Rotation:** If secrets are found in git history
2. **Dependency Updates:** If major version upgrades are needed
3. **Breaking Changes:** If refactoring breaks tests
4. **Service Access:** If AWS/Stripe/Supabase credentials are needed
5. **CI Changes:** If workflow modifications could break deployments

## Quality Gates

Before moving to the next phase, verify:

- [ ] All commands in the phase executed successfully
- [ ] Validation section passed
- [ ] Git commit made with clear message
- [ ] No new test failures
- [ ] Documentation updated if needed

## Example: Phase 0 Execution

```bash
# 1. Create branch
git switch -c chore/audit-decruft

# 2. Backup files
mkdir -p .backups/$(date +%Y%m%d)
cp package.json .backups/$(date +%Y%m%d)/
# ... more backups

# 3. Install tooling
cd frontend
pnpm add -D gitleaks knip depcheck madge jscpd

# 4. Create Makefile
cat > Makefile << 'EOF'
# Makefile contents
EOF

# 5. Validate
make help
npx gitleaks version
npx knip --version

# 6. Commit
git add .
git commit -m "chore: initialize audit infrastructure"
```

## Reporting Progress

After each phase, generate a progress report:

```bash
cat > docs/audits/PHASE_${PHASE}_COMPLETE.md << EOF
# Phase ${PHASE} Complete

**Date:** $(date)
**Duration:** ${DURATION}
**Issues Found:** ${ISSUES}
**Actions Taken:** ${ACTIONS}

## Validation Results
- [ ] All commands succeeded
- [ ] Tests passing
- [ ] Commit made

## Next Phase
Phase ${NEXT_PHASE}: ${NEXT_PHASE_NAME}
EOF
```

## Troubleshooting

### "Command not found"
Install missing tools:
```bash
brew install gitleaks trufflehog
pnpm add -D knip ts-prune depcheck madge jscpd
```

### "Tests failing after changes"
Rollback and investigate:
```bash
git diff HEAD~1
git checkout HEAD~1 -- path/to/file
pnpm test -- --verbose
```

### "CI failing on branch"
Check CI logs:
```bash
gh run list --branch chore/audit-decruft
gh run view <run-id> --log-failed
```

### "Merge conflicts"
Rebase on main:
```bash
git fetch origin main
git rebase origin/main
# Resolve conflicts
git rebase --continue
```

## Final Deliverables

When all phases complete:

1. **Reports in `docs/audits/`:**
   - services.md / services.json
   - github.md
   - deps.md
   - licenses.md
   - dead-code.md
   - circular-deps.md
   - bundle/ directory
   - security/ directory

2. **Automation:**
   - Makefile with all audit commands
   - CI workflows with audits enabled
   - Pre-commit hooks configured

3. **Documentation:**
   - Updated README.md
   - Organized docs/ structure
   - DOCUMENTATION_GUIDE.md
   - Maintenance schedule

4. **Pull Request:**
   - Branch: `chore/audit-decruft`
   - Title: "chore: comprehensive audit and decruft"
   - Description: Link to FINAL_AUDIT_SUMMARY.md
   - Reviewers: Engineering lead

## Success Criteria

### Must Have
- ✅ Zero high/critical vulnerabilities
- ✅ Zero secrets in repository
- ✅ All tests passing
- ✅ CI green for 3 consecutive runs
- ✅ Branch protection enabled
- ✅ Audit tooling installed and working

### Should Have
- ✅ Lighthouse budgets met (≥55/85/90/90)
- ✅ Zero dead code (knip clean)
- ✅ Zero circular dependencies
- ✅ TypeScript strict mode enabled
- ✅ Documentation organized
- ✅ Service inventory complete

### Nice to Have
- ✅ Bundle size reduced by 10%+
- ✅ Code duplication <5%
- ✅ All dependencies up-to-date
- ✅ Monitoring configured
- ✅ Maintenance schedule established

## Resources

### Documentation
- [MASTER_AUDIT_PLAN.md](./MASTER_AUDIT_PLAN.md)
- [EXECUTION_CHECKLIST.md](./EXECUTION_CHECKLIST.md)
- [docs/audits/README.md](./README.md)

### Task Files
- [TASK-00-PREP.md](./TASK-00-PREP.md)
- [TASK-01-SERVICES.md](./TASK-01-SERVICES.md) (TBD)
- [TASK-02-GITHUB.md](./TASK-02-GITHUB.md) (TBD)
- [TASK-03-SECRETS.md](./TASK-03-SECRETS.md) (TBD)
- [TASK-04-DEPS.md](./TASK-04-DEPS.md) (TBD)
- [TASK-05A-DOCS-DECRUFT.md](./TASK-05A-DOCS-DECRUFT.md)
- [TASK-05-DECRUFT.md](./TASK-05-DECRUFT.md) (TBD)
- [TASK-06-BUNDLE.md](./TASK-06-BUNDLE.md) (TBD)
- [TASK-07-CI.md](./TASK-07-CI.md) (TBD)
- [TASK-08-MONITORING.md](./TASK-08-MONITORING.md) (TBD)

### Scripts
- [scripts/services_audit.ts](../../scripts/services_audit.ts)
- [scripts/secret_scan.sh](../../scripts/secret_scan.sh)
- [scripts/dead_code.ts](../../scripts/dead_code.ts) (TBD)
- [scripts/bundle_report.ts](../../scripts/bundle_report.ts) (TBD)
- [scripts/ci_guard.ts](../../scripts/ci_guard.ts) (TBD)

### External Tools
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Knip](https://github.com/webpro/knip)
- [Depcheck](https://github.com/depcheck/depcheck)
- [Madge](https://github.com/pahen/madge)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

## Questions?

- Open an issue: https://github.com/edforgetools/verisplatform/issues
- Review docs: [docs/README.md](../../README.md)
- Check archive: [docs/archive/](../../archive/)

---

**Ready to start?** Run Phase 0:

```bash
cat docs/audits/TASK-00-PREP.md
```

Then execute each step sequentially, validating as you go. Good luck! 🚀
