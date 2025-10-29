import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { TestHelpers } from "./test-utils";

test.describe("Evidence pack export", () => {
  test("export contains all required files", async ({ page }) => {
    // Create and accept proof (reuse helpers)
    const proofId = await createAndAcceptProof(page);

    // Navigate to proof detail
    await page.goto(`/proof/${proofId}`);

    // Download evidence pack
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Export Evidence Pack")');
    const download = await downloadPromise;

    // Verify ZIP contents
    const buffer = await download.createReadStream();
    const zip = await JSZip.loadAsync(buffer);

    // Check required files
    expect(zip.file("receipt.json")).toBeTruthy();
    expect(zip.file("receipt.pdf")).toBeTruthy();
    expect(zip.file("acceptance.log.jsonl")).toBeTruthy();
    expect(zip.file("mapping/stripe.json")).toBeTruthy();
    expect(zip.file("mapping/paypal.json")).toBeTruthy();
    expect(zip.file("mapping/generic.json")).toBeTruthy();
    expect(zip.file("VERIFICATION_INSTRUCTIONS.txt")).toBeTruthy();

    // Validate receipt.json structure
    const receiptJson = await zip.file("receipt.json")!.async("string");
    const receipt = JSON.parse(receiptJson);

    expect(receipt.evidence_pack_version).toBe("1.0.0");
    expect(receipt.proof).toBeDefined();
    expect(receipt.delivery).toBeDefined();
    expect(receipt.acceptance).toBeDefined();
    expect(receipt.verification_instructions).toBeDefined();
  });
});

// Helper function to create and accept a proof
async function createAndAcceptProof(page: any): Promise<string> {
  const helpers = new TestHelpers(page);

  // Create proof
  await page.goto("/close");
  await helpers.mockFileUpload('input[type="file"]', "Test delivery file content");

  // Wait for API response - set up promise BEFORE clicking
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/close") && response.status() === 200,
    { timeout: 20000 },
  );

  await page.click('button:has-text("Close Delivery")');

  // Wait for the API response to complete
  try {
    const response = await responsePromise;
    const responseData = await response.json();
    expect(responseData.proof_json).toBeTruthy();
  } catch (error) {
    // If response wait fails, continue anyway - UI might have updated
    console.log("Response wait failed, continuing:", error);
  }

  // Wait for success banner
  await expect(page.getByRole("alert").filter({ hasText: "Delivery Closed" })).toBeVisible({
    timeout: 10000,
  });

  // Wait for proof_json section to render (Summary/JSON buttons)
  await expect(
    page.locator('button:has-text("Summary"), button:has-text("JSON")').first(),
  ).toBeVisible({
    timeout: 15000,
  });

  // Extract proof ID from JSON
  await page.getByRole("button", { name: "JSON" }).click();
  const jsonText = await page.locator("pre").textContent();
  expect(jsonText).toBeTruthy();
  const record = JSON.parse(jsonText!);
  const proofId = record.proof_json?.proof_id || record.proof_json?.record_id;
  expect(proofId).toBeTruthy();

  // Close JSON view to see sign-off controls
  await page.getByRole("button", { name: "JSON" }).click();

  // Issue and send
  await page.click('button:has-text("Issue Proof")');
  await page.click('button:has-text("Send Sign-Off Request")');
  await page.fill('input[name="recipient_email"]', "recipient@example.com");
  await page.click('button:has-text("Send")');

  const signOffUrl = await page.locator('[data-testid="signoff-url"]').textContent();
  await page.goto(signOffUrl!);

  // Accept
  await page.check('input[type="checkbox"]');
  await page.click('button:has-text("Accept and Record")');
  await expect(page.locator("text=/accepted/i")).toBeVisible();

  return proofId!;
}
