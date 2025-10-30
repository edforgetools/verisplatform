# Veris Audit Reports

This directory contains automated audit reports and tooling for maintaining Veris codebase health, security, and compliance.

## Directory Structure

```
docs/audits/
├── README.md                    # This file
├── services.md                  # External services inventory
├── services.json                # Machine-readable services inventory
├── github.md                    # GitHub org/repo audit results
├── deps.md                      # Dependency audit report
├── sbom.json                    # Software Bill of Materials
├── licenses.md                  # License compliance report
├── dead-code.md                 # Unused code detection
├── circular-deps.md             # Circular dependency report
├── duplication.md               # Code duplication report
├── bundle/                      # Bundle analysis reports
│   ├── analysis.html
│   └── stats.json
└── security/                    # Security scan results
    ├── secrets-scan.txt
    ├── npm-audit.json
    └── vulnerability-report.md
```

## Automation Scripts

All automation scripts are located in `/scripts/`:

- `services_audit.ts` - Audit external services (AWS, Supabase, Stripe)
- `secret_scan.sh` - Scan for leaked secrets and credentials
- `dead_code.ts` - Detect unused code with ts-prune and knip
- `bundle_report.ts` - Generate bundle size analysis
- `ci_guard.ts` - Pre-commit and CI quality gates
- `dep_audit.ts` - Dependency vulnerability and license audit
- `circular_deps.ts` - Detect circular dependencies

## Running Audits

Use the Makefile commands:

```bash
# Run all audits
make audit:all

# Individual audits
make audit:secrets      # Scan for secrets
make audit:deps         # Check dependencies
make audit:licenses     # License compliance
make audit:dead         # Dead code detection
make audit:circular     # Circular dependencies
make audit:dup          # Code duplication
make audit:size         # Bundle size analysis
make audit:eslint       # Linting
make audit:ts           # TypeScript strict checks
make audit:services     # External services
```

## Maintenance Schedule

### Weekly
- Dependency and secret scan
- Dead code detection
- Bundle size monitoring

### Monthly
- Service key rotation check
- License compliance review
- GitHub permissions audit

### Quarterly
- AWS bucket and access review
- Full security audit
- Performance budget review

### Annual
- Registry integrity audit
- External service contract review
- Architecture review

## Budget Targets

| Metric | Target | Current |
|--------|---------|---------|
| Lighthouse Performance | ≥55 | TBD |
| Lighthouse Accessibility | ≥85 | TBD |
| Lighthouse Best Practices | ≥90 | TBD |
| Lighthouse SEO | ≥90 | TBD |
| LCP (Largest Contentful Paint) | ≤1.8s | TBD |
| CLS (Cumulative Layout Shift) | ≤0.1 | TBD |
| INP (Interaction to Next Paint) | ≤200ms | TBD |
| WCAG Compliance | 2.2 AA | TBD |
| High/Critical Vulnerabilities | 0 | TBD |
| Bundle Size (main) | <300KB | TBD |

## Audit History

Reports are timestamped and archived in git history. To compare:

```bash
git log -p -- docs/audits/
```

## CI Integration

Audits run automatically in CI:

- `.github/workflows/security.yml` - Security scans
- `.github/workflows/web_quality.yml` - Performance and accessibility
- `.github/workflows/e2e.yml` - End-to-end tests
- `.github/workflows/release_gate.yml` - Release quality gate

## Emergency Response

If high/critical vulnerabilities are found:

1. Check `docs/audits/security/vulnerability-report.md`
2. Review affected packages in `deps.md`
3. Apply patches or upgrade dependencies
4. Re-run `make audit:deps`
5. Commit and push fix
6. Monitor CI for green build

## References

- [NPM Audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Knip](https://github.com/webpro/knip)
- [Depcheck](https://github.com/depcheck/depcheck)
- [Madge](https://github.com/pahen/madge)
