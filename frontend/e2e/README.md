# E2E Tests with Playwright

This directory contains end-to-end tests for the Veris application using Playwright.

## Test Structure

- `happy-path.spec.ts` - Main happy path tests covering the complete user journey
- `test-utils.ts` - Test utilities and helpers for common operations

## Test Flows Covered

1. **Complete User Journey**: Sign up → Checkout → Create Proof → View → Verify
2. **Demo Flow**: Create proof and verify with file upload
3. **Billing Page**: Verify billing page displays correctly
4. **Navigation**: Test navigation between pages
5. **Verify Page**: Test different input scenarios

## Running Tests

### Prerequisites

Make sure the development server is running or will be started automatically:

```bash
pnpm dev
```

### Test Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests with UI (interactive mode)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Debug tests
pnpm test:e2e:debug
```

### Test Configuration

Tests are configured in `playwright.config.ts` with:
- Base URL: `http://localhost:3000`
- Automatic dev server startup
- Screenshot capture on failure
- Trace collection for debugging

## Mock Services

The tests mock external services to ensure reliable testing:

- **Supabase Auth**: Mocked authentication responses
- **Stripe Checkout**: Mocked checkout session creation and redirects
- **Billing Status**: Mocked billing status checks

## Screenshots

Test screenshots are saved to `test-results/screenshots/` for debugging and documentation.

## Test Data

Tests use generated test files and mock data to avoid dependencies on external services.
