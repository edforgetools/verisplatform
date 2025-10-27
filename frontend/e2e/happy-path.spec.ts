import { test, expect } from "@playwright/test";
import { TestHelpers } from "./test-utils";

test.describe("Happy Path E2E Tests", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Mock external services
    await helpers.mockSupabaseAuth();
    await helpers.mockBillingStatus();
    await helpers.mockStripeCheckout();
  });

  test("complete user journey: sign up -> checkout -> create proof -> view -> verify", async ({
    page,
  }) => {
    // Step 1: Navigate to home page
    await page.goto("/");
    await expect(page).toHaveTitle(/Veris/);
    await expect(page.locator("h1")).toContainText("Verifiable Proof of Delivery");

    // Step 2: Navigate to billing page to start checkout flow
    await page.click('a[href="/billing"]');
    await expect(page).toHaveURL("/billing");
    await expect(page.locator("h1")).toContainText("Billing & Subscriptions");

    // Step 3: Start checkout process (mock redirect)
    await page.click('button:has-text("Start Pro Trial")');

    // Wait for checkout session creation and redirect
    await page.waitForTimeout(1000); // Allow time for API call

    // Verify we're in checkout flow (mocked)
    await expect(page.url()).toContain("checkout.stripe.com");

    // Step 4: Navigate to demo page to create a proof
    await page.goto("/demo");
    await expect(page).toHaveURL("/demo");
    await expect(page.locator("h1")).toContainText("Veris Demo");

    // Step 5: Create a proof by uploading a file
    const fileInput = page.locator('input[type="file"]');
    await helpers.mockFileUpload('input[type="file"]', "Test file content for E2E testing");

    // Verify file was selected
    await expect(fileInput).toHaveValue(/test-file\.txt/);

    // Submit the form to create proof
    await page.click('button:has-text("Create Proof")');

    // Wait for proof creation to complete
    await helpers.waitForProofCreation();

    // Verify success message appears
    await expect(page.locator("text=Proof created successfully!")).toBeVisible();

    // Step 6: Click "View proof" link to navigate to proof page
    await page.click('a:has-text("View proof")');

    // Wait for navigation to proof page
    await page.waitForURL(/\/proof\/[^\/]+/);

    // Verify we're on the proof page
    const proofUrl = page.url();
    expect(proofUrl).toMatch(/\/proof\/[^\/]+/);

    // Extract proof ID from URL
    const proofId = await helpers.extractProofId();
    expect(proofId).toBeTruthy();

    // Step 7: Verify the proof by navigating to verify page
    await page.goto("/verify");
    await expect(page).toHaveURL("/verify");
    await expect(page.locator("h1")).toContainText("Verify Proof");

    // Step 8: Enter the proof ID and verify
    const proofInput = page.locator('input[placeholder*="proof ID"]');
    await proofInput.fill(proofId);

    // Click verify button
    await page.click('button:has-text("Verify")');

    // Wait for verification to complete
    await page.waitForTimeout(2000); // Allow time for verification

    // Verify we see verification results
    await expect(page.locator("text=Verification Successful")).toBeVisible();

    // Step 9: Verify all verification checks passed
    await expect(page.locator("text=Hash Match: Pass")).toBeVisible();
    await expect(page.locator("text=Signature Valid: Pass")).toBeVisible();

    // Step 10: Take final screenshot for documentation
    await helpers.takeScreenshot("happy-path-complete");
  });

  test("demo flow: create proof and verify with file upload", async ({ page }) => {
    // Navigate directly to demo page
    await page.goto("/demo");
    await expect(page.locator("h1")).toContainText("Veris Demo");

    // Upload a test file
    await helpers.mockFileUpload('input[type="file"]', "Demo test file content");

    // Create proof
    await page.click('button:has-text("Create Proof")');
    await helpers.waitForProofCreation();

    // Verify success
    await expect(page.locator("text=Proof created successfully!")).toBeVisible();

    // Get the proof link
    const proofLink = page.locator('a:has-text("View proof")');
    await expect(proofLink).toBeVisible();

    // Navigate to proof page
    await proofLink.click();
    await page.waitForURL(/\/proof\/[^\/]+/);

    // Verify we can see proof details
    await expect(page.locator("text=Proof Details")).toBeVisible();

    // Navigate to verify page
    await page.goto("/verify");

    // Upload the same file for verification
    await helpers.mockFileUpload('input[type="file"]', "Demo test file content");

    // Get proof ID from URL and enter it
    const proofId = await helpers.extractProofId();
    const proofInput = page.locator('input[placeholder*="proof ID"]');
    await proofInput.fill(proofId);

    // Verify
    await page.click('button:has-text("Verify")');
    await page.waitForTimeout(2000);

    // Should show successful verification
    await expect(page.locator("text=Verification Successful")).toBeVisible();
  });

  test("billing page displays correctly", async ({ page }) => {
    await page.goto("/billing");

    // Check page elements
    await expect(page.locator("h1")).toContainText("Billing & Subscriptions");
    await expect(page.locator("text=Pro")).toBeVisible();
    await expect(page.locator("text=Team")).toBeVisible();
    await expect(page.locator("text=$9")).toBeVisible();
    await expect(page.locator("text=$39")).toBeVisible();

    // Check that buttons are clickable
    await expect(page.locator('button:has-text("Start Pro Trial")')).toBeEnabled();
    await expect(page.locator('button:has-text("Start Team Trial")')).toBeEnabled();
  });

  test("navigation works correctly", async ({ page }) => {
    // Test navigation from home page
    await page.goto("/");

    // Click demo link and wait for navigation
    await page.click('a[href="/demo"]');
    await page.waitForURL("/demo");
    await expect(page).toHaveURL("/demo");

    // Click verify link and wait for navigation
    await page.click('a[href="/verify"]');
    await page.waitForURL("/verify");
    await expect(page).toHaveURL("/verify");

    // Click billing link and wait for navigation
    await page.click('a[href="/billing"]');
    await page.waitForURL("/billing");
    await expect(page).toHaveURL("/billing");

    // Click home link and wait for navigation
    await page.click('a[href="/"]');
    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });

  test("verify page handles different input scenarios", async ({ page }) => {
    await page.goto("/verify");

    // Test with no inputs (should show error)
    await page.click('button:has-text("Verify")');
    await expect(page.locator("text=Please provide either a file or proof ID")).toBeVisible();

    // Test with proof ID only
    const proofInput = page.locator('input[placeholder*="proof ID"]');
    await proofInput.fill("test-proof-id");
    await page.click('button:has-text("Verify")');

    // Should attempt verification (may fail due to invalid ID, but should not show input error)
    await page.waitForTimeout(1000);

    // Test with file only
    await proofInput.clear();
    await helpers.mockFileUpload('input[type="file"]', "Test verification file");
    await page.click('button:has-text("Verify")');

    // Should attempt verification
    await page.waitForTimeout(1000);
  });
});
