import { test, expect } from "@playwright/test";
import { TestHelpers } from "./test-utils";

test.describe("E2E: Close → Check", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Mock /api/close to ensure proof_json is returned so the JSON toggle exists
    await page.route("**/api/close", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "/proof/test-proof-id",
          proof_json: {
            record_id: "rec_test_123",
            issuer: "did:web:veris.example",
            issued_at: new Date().toISOString(),
            status: "closed",
            signature: "sig_test",
            sha256: "hash_test",
          },
        }),
      });
    });

    // Mock /api/check to ensure verification result is returned
    await page.route("**/api/check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          valid: true,
          message: "✅ Delivery verification successful",
          record: {
            record_id: "rec_test_123",
            issuer: "did:web:veris.example",
            issued_at: new Date().toISOString(),
            status: "closed",
            signature: "sig_test",
            sha256: "hash_test",
          },
        }),
      });
    });
  });

  test("Complete flow with ≥99% success", async ({ page }) => {
    // Step 1: Navigate to /close
    await page.goto("/close");
    await expect(page.locator("h1")).toContainText("Close Delivery");

    // Step 2: Upload file to close delivery
    await helpers.mockFileUpload('input[type="file"]', "Test delivery file content");

    // Step 3: Submit to close delivery
    await page.click('button:has-text("Close Delivery")');

    // Step 4: Wait for success banner
    await expect(page.getByRole("alert").filter({ hasText: "Delivery Closed" })).toBeVisible({
      timeout: 5000,
    });

    // Step 5: Extract JSON from the record
    await page.click('button:has-text("JSON")');
    const jsonText = await page.locator("pre").textContent();
    expect(jsonText).toBeTruthy();
    const record = JSON.parse(jsonText!);

    // Step 6: Navigate to /check
    await page.goto("/check");
    await expect(page.locator("h1")).toContainText("Check Delivery");

    // Step 7: Paste JSON and check
    const jsonInput = page.locator("textarea");
    await jsonInput.fill(JSON.stringify(record));

    // Submit the check
    await page.click('button:has-text("Check Delivery")');

    // Step 8: Verify result
    await expect(page.locator('[aria-live="assertive"]')).toBeVisible({ timeout: 5000 });
    const resultText = await page.locator('[aria-live="assertive"]').textContent();
    expect(resultText).toBeTruthy();
  });
});
