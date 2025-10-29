import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("Sign-off flow", () => {
  test("complete sign-off acceptance", async ({ page }) => {
    // 1. Create proof
    await page.goto("/close");

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    const fixturesDir = path.join(process.cwd(), "test-fixtures");
    const samplePath = path.join(fixturesDir, "sample.pdf");
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
    if (!fs.existsSync(samplePath)) {
      fs.writeFileSync(samplePath, "Sample PDF placeholder for E2E tests\n");
    }
    await fileInput.setInputFiles(samplePath);

    await page.click('button:has-text("Close Delivery")');

    // Wait for proof creation and sign-off flow to appear
    await page.waitForSelector('[data-testid="proof-id"]');
    const proofId = await page.locator('[data-testid="proof-id"]').textContent();

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
    // Create proof first (reuse from above or create helper)
    await page.goto("/close");
    const fileInput = page.locator('input[type="file"]');
    const fixturesDir = path.join(process.cwd(), "test-fixtures");
    const samplePath = path.join(fixturesDir, "sample.pdf");
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
    if (!fs.existsSync(samplePath)) {
      fs.writeFileSync(samplePath, "Sample PDF placeholder for E2E tests\n");
    }
    await fileInput.setInputFiles(samplePath);
    await page.click('button:has-text("Close Delivery")');
    await page.waitForSelector('[data-testid="proof-id"]');

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
