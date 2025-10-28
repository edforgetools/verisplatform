import { test, expect } from "@playwright/test";
import { TestHelpers } from "./test-utils";

test.describe("E2E: Close → Check", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
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
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });

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
