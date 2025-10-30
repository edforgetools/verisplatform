import { test, expect } from "@playwright/test";
import { TestHelpers } from "./test-utils";

test.describe("Sign-off flow", () => {
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

    // Mock /api/proof/[id] for fetching proof details (used by signoff page) - register FIRST
    // Only match /api/proof/{id}, not /api/proof/issue, /api/proof/send, etc.
    await page.route("**/api/proof/*", async (route) => {
      const url = route.request().url();
      // Skip if it's a sub-route like /api/proof/issue, /api/proof/send, /api/proof/accept, /api/proof/decline
      if (
        url.includes("/api/proof/issue") ||
        url.includes("/api/proof/send") ||
        url.includes("/api/proof/accept") ||
        url.includes("/api/proof/decline") ||
        (url.includes("/api/proof/") && url.split("/api/proof/")[1].includes("/"))
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

    // Register specific routes AFTER general route so they override
    // Mock /api/proof/issue to handle proof issuance
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

    // Mock /api/proof/send for sending sign-off requests
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

    // Mock /api/proof/accept for accepting sign-offs - register AFTER general route
    await page.route("**/api/proof/accept", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
        }),
      });
    });

    // Mock /api/proof/decline for declining sign-offs - register AFTER general route
    await page.route("**/api/proof/decline", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
        }),
      });
    });
  });

  test("complete sign-off acceptance", async ({ page }) => {
    const helpers = new TestHelpers(page);

    // 1. Create proof
    await page.goto("/close");

    // Upload file using helper
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

    // Extract proof ID from JSON view (after success)
    await page.getByRole("button", { name: "JSON" }).click();
    const jsonText = await page.locator("pre").textContent();
    expect(jsonText).toBeTruthy();

    // Close JSON view to see sign-off controls
    await page.getByRole("button", { name: "JSON" }).click();

    // 2-3. Navigate directly to sign-off page using proof ID from JSON (bypass UI send)
    await page.getByRole("button", { name: "JSON" }).click();
    const jsonForId = await page.locator("pre").textContent();
    const parsed = JSON.parse(jsonForId!);
    const directProofId =
      parsed.proof_id ||
      parsed.record_id ||
      parsed.proof_json?.proof_id ||
      parsed.proof_json?.record_id;
    await page.getByRole("button", { name: "JSON" }).click();

    // Recipient accepts (simulate in new context)
    await page.goto(`/signoff/${directProofId}`);

    await expect(page.locator('h2:has-text("Delivery Sign-Off Request")')).toBeVisible();

    // Check acceptance box
    await page.check('input[type="checkbox"]');

    // Accept - mock should return immediately, so wait for navigation
    await page.click('button:has-text("Accept and Record")');
    
    // Wait for navigation to accepted page (mock returns success, client navigates)
    await page.waitForURL(
      (url) => url.pathname.includes("/signoff/") && url.pathname.endsWith("/accepted"),
      { timeout: 10000 },
    );

    // Verify confirmation page
    await expect(page.getByRole("heading", { name: "Delivery Accepted" })).toBeVisible({
      timeout: 5000,
    });
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

    // Close JSON view
    await page.getByRole("button", { name: "JSON" }).click();

    // Navigate directly to sign-off page using proof ID from JSON (bypass UI send)
    await page.getByRole("button", { name: "JSON" }).click();
    const jsonForId2 = await page.locator("pre").textContent();
    const parsed2 = JSON.parse(jsonForId2!);
    const directProofId2 =
      parsed2.proof_id ||
      parsed2.record_id ||
      parsed2.proof_json?.proof_id ||
      parsed2.proof_json?.record_id;
    await page.getByRole("button", { name: "JSON" }).click();

    await page.goto(`/signoff/${directProofId2}`);

    // Decline flow
    await page.click('button:has-text("Decline with Reason")');
    await page.fill("textarea", "This file does not match what we agreed upon.");

    // Decline - mock should return immediately, so wait for navigation
    await page.click('button:has-text("Submit Decline")');
    
    // Wait for navigation to declined page
    await page.waitForURL(
      (url) => url.pathname.includes("/signoff/") && url.pathname.endsWith("/declined"),
      { timeout: 10000 },
    );

    await expect(page.getByRole("heading", { name: "Delivery Declined" })).toBeVisible({
      timeout: 5000,
    });
  });
});
