# Branch Protection Configuration

**Applied on:** $(date)

## Main Branch Protection Rules

The following protections should be enabled via GitHub settings:

### Required
- ✅ Require pull request reviews before merging (1 reviewer)
- ✅ Require status checks to pass before merging
  - e2e
  - lighthouse (web_quality)
  - accessibility (web_quality)
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging

### Optional but Recommended
- ⚠️ Require signed commits
- ⚠️ Require linear history
- ⚠️ Include administrators

### Not Recommended
- ❌ Allow force pushes
- ❌ Allow deletions

## How to Apply

**HUMAN ACTION REQUIRED:**

```bash
# Using GitHub CLI
gh api repos/edforgetools/verisplatform/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["e2e","lighthouse","accessibility"]}' \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field enforce_admins=true \
  --field restrictions=null
```

Or configure via GitHub UI:
Settings → Branches → Branch protection rules → Add rule

## Verification

```bash
gh api repos/edforgetools/verisplatform/branches/main/protection
```
