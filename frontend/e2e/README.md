# E2E Tests

This directory contains end-to-end tests for the Veris platform using Playwright.

## Test Files

### `e2e-flow.spec.ts`

Comprehensive E2E flow test that covers the complete user journey:

1. **Checkout** → Stripe session creation
2. **Webhook** → Subscription activation
3. **Issuance** → File upload and proof creation
4. **S3 Write** → Registry upload
5. **Verification** → Proof validation

### `happy-path.spec.ts`

Tests the basic user journey and navigation flow.

### `integrity.spec.ts`

Tests the integrity page functionality and API responses.

## Running Tests

### Local Development

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests in UI mode
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Debug tests
pnpm test:e2e:debug
```

### Against Preview Deployments

```bash
# Run tests against preview deployment
pnpm test:e2e:preview
```

### Specific Test Files

```bash
# Run only the E2E flow test
npx playwright test e2e-flow.spec.ts

# Run only happy path tests
npx playwright test happy-path.spec.ts
```

## Test Configuration

### Local Tests (`playwright.config.ts`)

- Base URL: `http://localhost:3000`
- Runs against local development server
- Uses mocked external services

### Preview Tests (`playwright.config.preview.ts`)

- Base URL: Preview deployment URL
- Runs against actual preview deployments
- Tests real integrations

## Test Utilities

### `TestHelpers` Class

Provides common utilities for E2E tests:

- `mockFileUpload()` - Mock file uploads
- `mockStripeCheckout()` - Mock Stripe checkout flow
- `mockSupabaseAuth()` - Mock authentication
- `mockBillingStatus()` - Mock billing status
- `waitForProofCreation()` - Wait for proof creation
- `waitForVerification()` - Wait for verification
- `extractProofId()` - Extract proof ID from URL
- `takeScreenshot()` - Take screenshots for documentation

## CI Integration

### GitHub Actions

- **CI Workflow**: Runs all E2E tests on every PR
- **Preview Workflow**: Runs E2E tests against preview deployments
- **Security Workflow**: Includes security scanning

### Required Status Checks

All E2E tests must pass before merging:

- `e2e` - Local E2E tests
- `e2e-preview` - Preview deployment tests

## Test Data

### Mock Data

Tests use mocked data to avoid dependencies on external services:

- Stripe checkout sessions
- Supabase authentication
- File uploads
- API responses

### Test Files

Temporary test files are created in `test-results/temp/` and cleaned up after tests.

## Debugging

### Failed Tests

1. Check test results in `test-results/`
2. View screenshots and videos for failed tests
3. Use `pnpm test:e2e:debug` for interactive debugging
4. Check browser console for errors

### Common Issues

- **Timeout errors**: Increase timeout in test configuration
- **Network errors**: Check if local server is running
- **Element not found**: Verify selectors and page state
- **Mock failures**: Check mock implementations

## Best Practices

1. **Use descriptive test names** that explain the scenario
2. **Mock external services** to avoid flaky tests
3. **Take screenshots** for documentation and debugging
4. **Clean up test data** after tests complete
5. **Use page object model** for complex interactions
6. **Write atomic tests** that don't depend on each other
7. **Test error scenarios** in addition to happy paths

## Environment Variables

### Required for CI

- `CI=true` - Enables CI-specific behavior
- `PREVIEW_URL` - URL for preview deployment tests

### Optional

- `PLAYWRIGHT_DEBUG` - Enable debug mode
- `PLAYWRIGHT_HEADLESS` - Run in headless mode

## Maintenance

### Updating Tests

1. Update selectors when UI changes
2. Update mock data when APIs change
3. Add new tests for new features
4. Remove obsolete tests

### Performance

- Keep tests fast and focused
- Use parallel execution where possible
- Optimize wait conditions
- Monitor test execution time
