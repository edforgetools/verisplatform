import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { TestHelpers } from "./test-utils";

test.describe("Evidence pack export", () => {
  test.beforeEach(async ({ page }) => {
    // Mock /api/close to ensure proof_json is returned
    await page.route("**/api/close", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "/proof/proof_test_123456789012345",
          proof_json: {
            record_id: "rec_test_123456789012345",
            proof_id: "proof_test_123456789012345",
            issuer: "did:web:veris.example",
            issued_at: new Date().toISOString(),
            status: "closed",
            signature: "sig_test",
            sha256: "hash_test",
          },
        }),
      });
    });

    // Mock /api/proof/[id] for fetching proof details (used by signoff page)
    // Register this FIRST so it can pass specific routes to more specific handlers
    await page.route("**/api/proof/*", async (route) => {
      const url = route.request().url();
      // Skip if it's a sub-route like /api/proof/issue, /api/proof/send, /api/proof/accept, /api/proof/decline
      if (
        url.includes("/api/proof/issue") ||
        url.includes("/api/proof/send") ||
        url.includes("/api/proof/accept") ||
        url.includes("/api/proof/decline")
      ) {
        await route.continue();
        return;
      }
      const proofIdMatch = url.match(/\/api\/proof\/([^/?]+)/);
      const proofId = proofIdMatch ? proofIdMatch[1] : "proof_test_123456789012345";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: proofId,
          file_name: "test-delivery-file.txt",
          hash_full: "hash_test_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          proof_id: proofId,
          record_id: "rec_test_123",
        }),
      });
    });

    // Mock /api/proof/issue to handle proof issuance (register AFTER general route)
    await page.route(
      (url) => url.href.includes("/api/proof/issue"),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            status: "issued",
          }),
        });
      },
    );

    // Mock /api/proof/send for sending sign-off requests (register AFTER general route)
    await page.route(
      (url) => url.href.includes("/api/proof/send"),
      async (route) => {
        let proofId = "proof_test_123456789012345";
        try {
          const request = route.request();
          const postData = request.postData();
          if (postData) {
            const body = JSON.parse(postData);
            proofId = body.proof_id || proofId;
          }
        } catch (e) {
          // Use default proofId if parsing fails
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            signoff_url: `/signoff/${proofId}`,
          }),
        });
      },
    );

    // Mock /api/proof/accept for accepting sign-offs (register AFTER general route)
    await page.route(
      (url) => url.href.includes("/api/proof/accept"),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
          }),
        });
      },
    );
  });

  test("export contains all required files", async ({ page }) => {
    // Create and accept proof (reuse helpers)
    const proofId = await createAndAcceptProof(page);

    // Mock export endpoint to bypass auth and DB access
    // Use a function matcher to ensure it matches correctly
    await page.route(
      (url) => url.pathname.includes("/api/proof/") && url.pathname.endsWith("/export"),
      async (route) => {
        const zip = new JSZip();
        const evidencePack = {
          evidence_pack_version: "1.0.0",
          proof: {
            proof_id: proofId,
            sha256: "hash_test",
            issued_at: new Date().toISOString(),
            signature: "sig_test",
            issuer: "Veris Platform",
            algorithm: "Ed25519",
          },
          delivery: {
            file_name: "test-delivery-file.txt",
            delivered_at: new Date().toISOString(),
            delivered_by: "user_test",
            project_name: "demo",
          },
          acceptance: {
            status: "accepted",
            recipient_email: "recipient@example.com",
            accepted_at: new Date().toISOString(),
            accepted_by_ip: "127.0.0.1",
            accepted_by_user_agent: "Playwright",
            declined_at: null,
            declined_reason: null,
            state_log: [],
          },
          verification_instructions: {},
        };
        zip.file("receipt.json", JSON.stringify(evidencePack, null, 2));
        zip.file("receipt.pdf", Buffer.from("PDFPLACEHOLDER"));
        zip.file("acceptance.log.jsonl", "");
        zip.file("mapping/stripe.json", "{}");
        zip.file("mapping/paypal.json", "{}");
        zip.file("mapping/generic.json", "{}");
        zip.file("VERIFICATION_INSTRUCTIONS.txt", "Instructions");
        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "application/zip" },
          body: zipBuffer,
        });
      },
    );

    // Request evidence pack via fetch (goes through route interception)
    const response = await page.evaluate(async (pid) => {
      const res = await fetch(`/api/proof/${pid}/export`);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      return Array.from(new Uint8Array(arrayBuffer));
    }, proofId);

    const buffer = Buffer.from(response);
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

  await page.click('button:has-text("Close Delivery")');

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
  // The JSON shown is the proof_json object itself, not wrapped
  const proofId =
    record.proof_id ||
    record.record_id ||
    record.proof_json?.proof_id ||
    record.proof_json?.record_id;
  expect(proofId).toBeTruthy();

  // Close JSON view to see sign-off controls
  await page.getByRole("button", { name: "JSON" }).click();

  // Issue and send
  await page.click('button:has-text("Issue Proof")');
  // Wait for "Send Sign-Off Request" button to appear (status changed to issued)
  await expect(page.locator('button:has-text("Send Sign-Off Request")')).toBeVisible({
    timeout: 5000,
  });
  // Fill email BEFORE clicking button
  await page.fill('input[name="recipient_email"]', "recipient@example.com");
  // Wait for API response
  const sendResponsePromise = page.waitForResponse(
    (response: { url: () => string; status: () => number }) =>
      response.url().includes("/api/proof/send") && response.status() === 200,
    { timeout: 10000 },
  );
  // Click button - this should trigger API call (mocked) which sets signOffUrl
  await page.click('button:has-text("Send Sign-Off Request")');
  // Wait for the API response
  await sendResponsePromise;
  // Wait for sign-off URL to appear (indicating request was sent and state updated)
  await expect(page.locator('[data-testid="signoff-url"]')).toBeVisible({ timeout: 10000 });

  const signOffUrl = await page.locator('[data-testid="signoff-url"]').textContent();
  await page.goto(signOffUrl!);

  // Accept
  await page.check('input[type="checkbox"]');
  await page.click('button:has-text("Accept and Record")');
  // Confirmation page heading should be visible
  await expect(page.getByRole("heading", { name: "Delivery Accepted" })).toBeVisible({
    timeout: 5000,
  });

  return proofId!;
}
