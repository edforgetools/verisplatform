# Branch Protection Rules

This document outlines the recommended branch protection rules for the Veris repository to ensure CI hygiene and prevent merge failures.

## Required Status Checks

The following status checks must pass before merging:

### Core CI Checks

- `typecheck` - TypeScript type checking
- `lint` - ESLint code quality checks
- `test` - Unit test suite
- `build` - Build verification
- `e2e` - End-to-end tests

### Security Checks

- `gitleaks` - Secret detection
- `dependency-check` - Dependency security audit
- `codeql` - CodeQL security analysis

### Preview Tests

- `e2e-preview` - E2E tests against preview deployment

## Branch Protection Configuration

### Main Branch (`main`)

- Require a pull request before merging
- Require approvals: 1
- Dismiss stale PR approvals when new commits are pushed
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require conversation resolution before merging
- Restrict pushes that create files larger than 100MB

### Develop Branch (`develop`)

- Require a pull request before merging
- Require approvals: 1
- Dismiss stale PR approvals when new commits are pushed
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require conversation resolution before merging

## Required Status Checks Configuration

### Required Checks

```
typecheck
lint
test
build
e2e
gitleaks
dependency-check
codeql
```

### Optional Checks (for PRs)

```
e2e-preview
```

## Setting Up Branch Protection

1. Go to repository Settings → Branches
2. Add rule for `main` branch
3. Configure the following:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1)
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Restrict pushes that create files larger than 100MB
4. Select all required status checks from the list above
5. Repeat for `develop` branch with same settings

## Emergency Override

In case of emergency, repository administrators can:

1. Temporarily disable branch protection rules
2. Force push to protected branches
3. Bypass required status checks

**Note**: All emergency overrides should be documented and reviewed post-incident.

## Monitoring and Alerts

- Failed CI checks will block PR merges automatically
- Security issues will trigger alerts to repository administrators
- Daily security scans will run automatically
- CodeQL analysis results will be available in the Security tab

## Best Practices

1. **Always run tests locally** before pushing
2. **Keep PRs small** to reduce CI time and complexity
3. **Address security issues immediately** when they arise
4. **Use draft PRs** for work in progress
5. **Request reviews early** to get feedback before CI passes
6. **Monitor CI performance** and optimize slow tests
