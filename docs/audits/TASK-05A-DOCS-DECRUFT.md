# Task 05A: Documentation Decruft

**Phase:** 5A - Documentation Cleanup
**Duration:** 2-3 hours
**Risk:** Low
**Dependencies:** Phase 0 complete

## Rationale

The repository contains extensive documentation, but much of it is outdated, redundant, or no longer relevant. Cleaning up documentation:

- Reduces confusion for new developers
- Improves discoverability of current information
- Reduces maintenance burden
- Clarifies what's active vs. archived
- Establishes clear information architecture

## Current State Analysis

From the glob results, we have:

### Active Documentation (Keep & Update)
- `README.md` (root) - Main entry point
- `frontend/README.md` - Frontend-specific docs
- `docs/README.md` - Documentation index
- `docs/api.md` - API documentation
- `docs/env.md` - Environment setup
- `docs/csp-security.md` - Security configuration
- `docs/vercel-setup.md` - Deployment guide
- `frontend/CREDENTIALS_GUIDE.md` - Credentials management
- `frontend/e2e/README.md` - E2E testing guide
- `frontend/docs/rate-limiting-and-monitoring.md` - Rate limiting docs
- `packages/sdk-js/README.md` - SDK documentation

### Already Archived (Good!)
- `docs/archive/` - Multiple archived docs already organized

### Candidates for Archival
- `CURSOR_BUILD_PLAN.md` - Build plan, archive after completion
- `IMPLEMENTATION_STATUS.md` - Status doc, consolidate and archive
- `NEXT_STEPS_FOR_CURSOR.md` - Outdated instructions, archive
- `docs/CHANGELOG.md` - Move to root or automate
- `frontend/src/lib/entitlements.md` - Embedded doc, convert to JSDoc
- `docs/manual_verification_report.md` - One-time report, archive
- `docs/MVP_v1.8_AUDIT_DEVIATIONS.md` - Historical, archive
- `docs/MVP_v1.8_FIXES_APPLIED.md` - Historical, archive

### Test Artifacts (Clean Up)
- `frontend/test-results/**/*.md` - Temporary test output, gitignore
- `frontend/playwright-report/data/*.md` - Temporary report data, gitignore

## Steps

### 1. Audit All Documentation

Create comprehensive inventory:

```bash
# Generate documentation map
cat > docs/audits/docs-inventory.txt << 'EOF'
# Documentation Inventory - $(date +%Y-%m-%d)

## Active Documentation
EOF

# Find all markdown files
find . -name "*.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/test-results/*" \
  -not -path "*/playwright-report/*" \
  | sort >> docs/audits/docs-inventory.txt

# Add metadata
echo "" >> docs/audits/docs-inventory.txt
echo "Total markdown files: $(find . -name '*.md' -not -path '*/node_modules/*' -not -path '*/.next/*' | wc -l)" >> docs/audits/docs-inventory.txt
```

### 2. Archive Outdated Build Plans

```bash
# Create build plans archive
mkdir -p docs/archive/build-plans

# Move outdated plans
mv CURSOR_BUILD_PLAN.md docs/archive/build-plans/CURSOR_BUILD_PLAN_$(date +%Y%m).md
mv IMPLEMENTATION_STATUS.md docs/archive/build-plans/IMPLEMENTATION_STATUS_$(date +%Y%m).md
mv NEXT_STEPS_FOR_CURSOR.md docs/archive/build-plans/NEXT_STEPS_FOR_CURSOR_$(date +%Y%m).md

# Create index
cat > docs/archive/build-plans/README.md << 'EOF'
# Build Plans Archive

Historical build plans and implementation status documents.

## Files

- `CURSOR_BUILD_PLAN_*.md` - AI-generated build plans
- `IMPLEMENTATION_STATUS_*.md` - Implementation progress snapshots
- `NEXT_STEPS_FOR_CURSOR_*.md` - AI collaboration instructions

These documents are kept for historical reference but are no longer actively maintained.

For current status, see:
- [Main README](../../../README.md)
- [CHANGELOG](../../CHANGELOG.md)
- [Project Board](https://github.com/edforgetools/verisplatform/projects)
EOF
```

### 3. Archive Historical Audit Reports

```bash
# Create reports archive
mkdir -p docs/archive/reports

# Move historical reports
mv docs/manual_verification_report.md docs/archive/reports/
mv docs/MVP_v1.8_AUDIT_DEVIATIONS.md docs/archive/reports/
mv docs/MVP_v1.8_FIXES_APPLIED.md docs/archive/reports/

# Create index
cat > docs/archive/reports/README.md << 'EOF'
# Historical Reports Archive

One-time audit and verification reports from MVP development.

## Files

- `manual_verification_report.md` - Manual verification results
- `MVP_v1.8_AUDIT_DEVIATIONS.md` - MVP 1.8 audit findings
- `MVP_v1.8_FIXES_APPLIED.md` - MVP 1.8 remediation

These are historical snapshots. For current audit reports, see:
- [docs/audits/](../../audits/)
EOF
```

### 4. Move CHANGELOG to Root

```bash
# Move changelog to conventional location
mv docs/CHANGELOG.md CHANGELOG.md

# Update references in docs/README.md if needed
sed -i.bak 's|docs/CHANGELOG.md|../CHANGELOG.md|g' docs/README.md 2>/dev/null || true
rm docs/README.md.bak 2>/dev/null || true
```

### 5. Update .gitignore for Test Artifacts

```diff
--- a/frontend/.gitignore
+++ b/frontend/.gitignore
@@ -1,5 +1,10 @@
 .next
 node_modules
 .env*
 !.env.example

+# Test artifacts
+test-results/
+playwright-report/
+.playwright/
+lighthouse-*.html
```

### 6. Create Documentation Index

Update `docs/README.md` with clear structure:

```markdown
# Veris Documentation

## Quick Start

- [Main README](../README.md) - Project overview and setup
- [Environment Setup](./env.md) - Configure environment variables
- [Vercel Deployment](./vercel-setup.md) - Deploy to production
- [Credentials Guide](../frontend/CREDENTIALS_GUIDE.md) - Manage secrets and keys

## Development

- [Frontend README](../frontend/README.md) - Frontend development guide
- [E2E Testing](../frontend/e2e/README.md) - End-to-end testing with Playwright
- [SDK Documentation](../packages/sdk-js/README.md) - JavaScript SDK usage

## Operations

- [API Reference](./api.md) - REST API endpoints
- [Rate Limiting](../frontend/docs/rate-limiting-and-monitoring.md) - Rate limiting configuration
- [CSP Security](./csp-security.md) - Content Security Policy setup
- [Audit Reports](./audits/README.md) - Automated audit reports and tooling

## Reference

- [CHANGELOG](../CHANGELOG.md) - Version history and release notes
- [Archived Documentation](./archive/) - Historical documents

## External Links

- [GitHub Repository](https://github.com/edforgetools/verisplatform)
- [Issue Tracker](https://github.com/edforgetools/verisplatform/issues)
- [Veris Website](https://veris.example.com) (TBD)

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) (TBD)

## License

See [LICENSE](../LICENSE) (TBD)
```

### 7. Convert Embedded Markdown to JSDoc

For `frontend/src/lib/entitlements.md`, convert to inline documentation:

```bash
# Read the content
cat frontend/src/lib/entitlements.md

# Add as JSDoc comment at top of entitlements.ts
# Then delete the markdown file
rm frontend/src/lib/entitlements.md
```

### 8. Create Documentation Maintenance Guide

```bash
cat > docs/DOCUMENTATION_GUIDE.md << 'EOF'
# Documentation Maintenance Guide

## Principles

1. **Single Source of Truth** - No duplicate information
2. **Clear Hierarchy** - Easy to navigate
3. **Up-to-date** - Review quarterly
4. **Discoverable** - Linked from README
5. **Versioned** - Archive old versions

## Structure

```
/
├── README.md                 # Project overview
├── CHANGELOG.md              # Release history
├── CONTRIBUTING.md           # How to contribute
├── LICENSE                   # License terms
├── docs/
│   ├── README.md             # Documentation index
│   ├── api.md                # API reference
│   ├── env.md                # Environment setup
│   ├── csp-security.md       # Security config
│   ├── vercel-setup.md       # Deployment guide
│   ├── audits/               # Automated audit reports
│   │   ├── README.md
│   │   └── TASK-*.md
│   └── archive/              # Historical documents
│       ├── build-plans/
│       ├── reports/
│       └── ...
├── frontend/
│   ├── README.md             # Frontend guide
│   ├── CREDENTIALS_GUIDE.md  # Credentials management
│   ├── e2e/README.md         # E2E testing
│   └── docs/                 # Frontend-specific docs
└── packages/sdk-js/
    └── README.md             # SDK documentation
```

## Document Types

### README.md Files
- Project/module overview
- Quick start instructions
- Links to detailed docs
- Updated with each major change

### Guide Documents (*.md in docs/)
- Step-by-step instructions
- Configuration examples
- Troubleshooting tips
- Updated as features change

### API Documentation (api.md)
- Endpoint specifications
- Request/response examples
- Authentication details
- Auto-generated preferred (Swagger/OpenAPI)

### Audit Reports (docs/audits/)
- Auto-generated
- Timestamped
- Version controlled
- See [docs/audits/README.md](./audits/README.md)

### Archived Documents (docs/archive/)
- Historical reference only
- Include archival date in filename
- Index file in each directory
- Never deleted, only moved here

## Maintenance Schedule

### On Every PR
- Update affected documentation
- Check links aren't broken
- Verify code examples work

### Monthly
- Review top-level README
- Check all links in docs/README.md
- Update outdated screenshots

### Quarterly
- Full documentation audit
- Archive obsolete documents
- Reorganize if needed
- Check external links

### On Release
- Update CHANGELOG.md
- Version API documentation
- Update version numbers in examples
- Announce documentation changes

## Best Practices

### Writing Style
- Use active voice
- Be concise
- Use code examples
- Include troubleshooting
- Link to related docs

### Code Examples
- Working and tested
- Include full context
- Show expected output
- Use realistic data

### Images and Diagrams
- SVG preferred for diagrams
- PNG for screenshots
- Alt text for accessibility
- Compress before committing

### Links
- Use relative links within repo
- Verify external links periodically
- Use descriptive link text
- Avoid "click here"

## Tools

- [markdown-link-check](https://github.com/tcort/markdown-link-check) - Verify links
- [markdownlint](https://github.com/DavidAnson/markdownlint) - Linting
- [doctoc](https://github.com/thlorenz/doctoc) - Generate table of contents

## References

- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [CommonMark Spec](https://commonmark.org/)
- [Write the Docs](https://www.writethedocs.org/)
EOF
```

### 9. Clean Up Test Artifacts

```bash
# Remove committed test artifacts if any
git rm -r --cached frontend/test-results/ 2>/dev/null || true
git rm -r --cached frontend/playwright-report/ 2>/dev/null || true

# Clean local copies
rm -rf frontend/test-results/*.md
rm -rf frontend/playwright-report/data/*.md
```

### 10. Commit Documentation Cleanup

```bash
git add .
git commit -m "docs: decruft and reorganize documentation

- Archive outdated build plans and status docs
- Archive historical audit reports
- Move CHANGELOG to root (conventional location)
- Update .gitignore for test artifacts
- Create documentation index and maintenance guide
- Remove redundant and embedded markdown files
- Establish clear documentation hierarchy

See docs/DOCUMENTATION_GUIDE.md for maintenance procedures"
```

## Validation

```bash
# Verify all active docs are accessible from docs/README.md
cat docs/README.md | grep -o '\[.*\](.*)' | wc -l
# Expected: 10+ links

# Verify archived docs have indexes
ls docs/archive/*/README.md
# Expected: build-plans/README.md, reports/README.md

# Verify test artifacts are gitignored
git check-ignore frontend/test-results/
# Expected: frontend/test-results/

# Check for broken links (optional, requires markdown-link-check)
npx markdown-link-check docs/README.md
npx markdown-link-check README.md

# Verify CHANGELOG moved
test -f CHANGELOG.md && echo "✅ CHANGELOG.md exists" || echo "❌ CHANGELOG.md missing"

# Count active vs archived docs
echo "Active docs: $(find docs -name '*.md' -not -path '*/archive/*' | wc -l)"
echo "Archived docs: $(find docs/archive -name '*.md' | wc -l)"
```

## Rollback

```bash
# Restore from git history
git checkout HEAD~1 -- docs/
git checkout HEAD~1 -- CURSOR_BUILD_PLAN.md
git checkout HEAD~1 -- IMPLEMENTATION_STATUS.md
git checkout HEAD~1 -- NEXT_STEPS_FOR_CURSOR.md

# Or full revert
git revert HEAD
```

## Acceptance Criteria

- [ ] Outdated build plans moved to `docs/archive/build-plans/`
- [ ] Historical reports moved to `docs/archive/reports/`
- [ ] Each archive directory has README.md index
- [ ] CHANGELOG moved to root
- [ ] `docs/README.md` updated with clear structure
- [ ] `DOCUMENTATION_GUIDE.md` created
- [ ] Test artifacts added to `.gitignore`
- [ ] No broken links in top-level docs
- [ ] All active docs discoverable from `docs/README.md`
- [ ] Commit made with clear message
- [ ] CI passes (no broken references)

## Documentation Reduction Summary

### Before
- Total markdown files: ~60
- Scattered across multiple locations
- No clear hierarchy
- Duplicate information
- Many outdated files

### After
- Active documentation: ~15 files
- Archived documentation: ~20 files
- Clear structure in `docs/README.md`
- No duplication
- Maintenance guide established

## Estimated Cost

- **Time:** 2-3 hours
- **Risk:** Low (archival preserves history)
- **Reversibility:** High (git revert)
- **Dependencies:** Phase 0 complete

## Next Steps

Continue with [TASK-05-DECRUFT.md](./TASK-05-DECRUFT.md) for code cleanup.

## Notes

- Keep all archived files in git history for reference
- Do not delete anything permanently
- Update links in code comments if needed
- Consider automating link checking in CI
- Review quarterly to prevent accumulation

## References

- [Write the Docs Best Practices](https://www.writethedocs.org/guide/writing/docs-principles/)
- [GitHub Documentation Guide](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions)
- [Documentation System](https://documentation.divio.com/)
