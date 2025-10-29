import { test, expect } from "@playwright/test";
import { TestHelpers } from "./test-utils";

test.describe("Sign-off flow", () => {
  test("complete sign-off acceptance", async ({ page }) => {
    const helpers = new TestHelpers(page);

    // 1. Create proof
    await page.goto("/close");

    // Upload file using helper
    await helpers.mockFileUpload('input[type="file"]', "Test delivery file content");

    await page.click('button:has-text("Close Delivery")');

    // Wait for success banner (like close-check.spec.ts does)
    await expect(page.getByRole("alert").filter({ hasText: "Delivery Closed" })).toBeVisible({
      timeout: 10000,
    });

    // Wait for JSON button to be visible (proof_json section renders)
    await page.waitForSelector('button:has-text("JSON")', { timeout: 10000 });

    // Extract proof ID from JSON view (after success)
    await page.click('button:has-text("JSON")');
    const jsonText = await page.locator("pre").textContent();
    expect(jsonText).toBeTruthy();

    // Close JSON view to see sign-off controls
    await page.click('button:has-text("JSON")');

    // 2. Issue proof
    await page.click('button:has-text("Issue Proof")');
    await expect(page.locator("text=/Status: issued/")).toBeVisible();

    // 3. Send sign-off request
    await page.click('button:has-text("Send Sign-Off Request")');
    await page.fill('input[name="recipient_email"]', "recipient@example.com");
    await page.click('button:has-text("Send")');

    const signOffUrl = await page.locator('[data-testid="signoff-url"]').textContent();

    // 4. Recipient accepts (simulate in new context)
    await page.goto(signOffUrl!);

    await expect(page.locator('h2:has-text("Delivery Sign-Off Request")')).toBeVisible();

    // Check acceptance box
    await page.check('input[type="checkbox"]');

    // Accept
    await page.click('button:has-text("Accept and Record")');

    // Verify confirmation page
    await expect(page.locator("text=/accepted/i")).toBeVisible();
  });

  test("decline with reason", async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Create proof first
    await page.goto("/close");
    await helpers.mockFileUpload('input[type="file"]', "Test delivery file content");
    await page.click('button:has-text("Close Delivery")');

    // Wait for success banner
    await expect(page.getByRole("alert").filter({ hasText: "Delivery Closed" })).toBeVisible({
      timeout: 10000,
    });

    // Wait for JSON button to appear
    await page.waitForSelector('button:has-text("JSON")', { timeout: 10000 });

    // Extract proof ID from JSON
    await page.click('button:has-text("JSON")');
    const jsonText = await page.locator("pre").textContent();
    expect(jsonText).toBeTruthy();

    // Close JSON view
    await page.click('button:has-text("JSON")');

    // Issue and send
    await page.click('button:has-text("Issue Proof")');
    await page.click('button:has-text("Send Sign-Off Request")');
    await page.fill('input[name="recipient_email"]', "recipient@example.com");
    await page.click('button:has-text("Send")');

    const signOffUrl = await page.locator('[data-testid="signoff-url"]').textContent();
    await page.goto(signOffUrl!);

    // Decline flow
    await page.click('button:has-text("Decline with Reason")');
    await page.fill("textarea", "This file does not match what we agreed upon.");
    await page.click('button:has-text("Submit Decline")');

    await expect(page.locator("text=/declined/i")).toBeVisible();
  });
});
