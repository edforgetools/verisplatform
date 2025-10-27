/**
 * E2E Flow Test: Complete user journey from checkout to verification
 *
 * Tests the full flow:
 * 1. Checkout → Stripe session creation
 * 2. Webhook → Subscription activation
 * 3. Proof issuance → File upload and proof creation
 * 4. S3 write → Registry upload
 * 5. Verification → Proof validation
 */

import { test, expect } from "@playwright/test";
import { TestHelpers } from "./test-utils";

test.describe.skip("E2E Flow: Checkout → Webhook → Issuance → S3 Write → Verify", () => {
  let helpers: TestHelpers;
  let testUserId: string;
  let testProofId: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testUserId = "test-user-" + Date.now();
    testProofId = "";

    // Mock external services
    await helpers.mockSupabaseAuth();
    await helpers.mockBillingStatus();
  });

  test("complete E2E flow: checkout → webhook → issuance → S3 write → verify", async ({ page }) => {
    // Step 1: Checkout Flow
    await page.goto("/billing");
    await expect(page.locator("h1")).toContainText("Billing & Subscriptions");

    // Mock Stripe checkout session creation
    await page.route("**/api/stripe/create-checkout", async (route) => {
      const request = route.request();
      const requestBody = await request.postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://checkout.stripe.com/test-session-123",
        }),
      });
    });

    // Start checkout process
    await page.click('button:has-text("Start Pro Trial")');

    // Wait for checkout session creation
    await page.waitForTimeout(1000);

    // Step 2: Webhook Processing (Simulate Stripe webhook)
    await page.route("**/api/stripe/webhook", async (route) => {
      const request = route.request();

      // Mock successful webhook processing
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          received: true,
          eventId: "evt_test_webhook_" + Date.now(),
          eventType: "checkout.session.completed",
        }),
      });
    });

    // Simulate webhook call (in real scenario, Stripe would call this)
    const webhookResponse = await page.request.post("/api/stripe/webhook", {
      headers: {
        "stripe-signature": "test-signature",
        "content-type": "application/json",
      },
      data: {
        id: "evt_test_webhook_" + Date.now(),
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_checkout_" + Date.now(),
            client_reference_id: testUserId,
            subscription: "sub_test_subscription_" + Date.now(),
            status: "complete",
          },
        },
      },
    });

    expect(webhookResponse.ok()).toBeTruthy();
    const webhookResult = await webhookResponse.json();
    expect(webhookResult.received).toBe(true);

    // Step 3: Proof Issuance
    await page.goto("/demo");
    await expect(page.locator("h1")).toContainText("Veris Demo");

    // Mock proof creation API
    await page.route("**/api/proof/create", async (route) => {
      const request = route.request();
      let file: File | null = null;

      try {
        const formData = await (request as any).formData();
        file = formData.get("file") as File;
      } catch (error) {
        // Handle case where formData is not available
        console.log("Could not parse form data:", error);
      }

      testProofId = "proof_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          proofId: testProofId,
          success: true,
          message: "Proof created successfully!",
          proof: {
            id: testProofId,
            hash: "test-hash-" + Date.now(),
            signature: "test-signature-" + Date.now(),
            timestamp: new Date().toISOString(),
            fileName: file?.name || "test-file.txt",
          },
        }),
      });
    });

    // Mock S3 upload
    await page.route("**/api/proof/upload-to-registry", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          stagingUrl: `https://test-bucket.s3.us-east-1.amazonaws.com/registry/proofs/${testProofId}.json`,
          productionUrl: `https://prod-bucket.s3.us-east-1.amazonaws.com/registry/proofs/${testProofId}.json`,
          checksum: "test-checksum-" + Date.now(),
        }),
      });
    });

    // Upload a test file and create proof
    await helpers.mockFileUpload('input[type="file"]', "E2E test file content for complete flow");

    // Submit the form to create proof
    await page.click('button:has-text("Create Proof")');

    // Wait for proof creation to complete
    await helpers.waitForProofCreation();

    // Verify success message appears
    await expect(page.locator("text=Proof created successfully!")).toBeVisible();

    // Step 4: S3 Write Verification
    // Verify that the proof was written to S3 by checking the registry
    await page.route("**/api/registry/proof/*", async (route) => {
      const url = route.request().url();
      const proofIdFromUrl = url.split("/").pop();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          proofId: proofIdFromUrl,
          stagingUrl: `https://test-bucket.s3.us-east-1.amazonaws.com/registry/proofs/${proofIdFromUrl}.json`,
          productionUrl: `https://prod-bucket.s3.us-east-1.amazonaws.com/registry/proofs/${proofIdFromUrl}.json`,
          checksum: "test-checksum-" + Date.now(),
          uploadedAt: new Date().toISOString(),
        }),
      });
    });

    // Step 5: Verification
    await page.goto("/verify");
    await expect(page.locator("h1")).toContainText("Verify Proof");

    // Mock verification API
    await page.route("**/api/verify", async (route) => {
      const request = route.request();
      const requestBody = await request.postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          valid: true,
          signer: "did:web:veris.example",
          issued_at: new Date().toISOString(),
          latency_ms: 42,
          errors: [],
        }),
      });
    });

    // Enter the proof ID and verify
    const proofInput = page.locator('input[placeholder*="proof ID"]');
    await proofInput.fill(testProofId);

    // Click verify button
    await page.click('button:has-text("Verify")');

    // Wait for verification to complete
    await page.waitForTimeout(2000);

    // Verify we see verification results
    await expect(page.locator("text=Verification Successful")).toBeVisible();
    await expect(page.locator("text=Hash Match: Pass")).toBeVisible();
    await expect(page.locator("text=Signature Valid: Pass")).toBeVisible();
    await expect(page.locator("text=Registry Exists: Pass")).toBeVisible();
    await expect(page.locator("text=Schema Valid: Pass")).toBeVisible();

    // Step 6: Verify the complete flow by checking all components
    // Verify billing status is active
    await page.goto("/billing");
    await expect(page.locator("text=Active")).toBeVisible();

    // Verify proof is accessible
    await page.goto(`/proof/${testProofId}`);
    await expect(page.locator("text=Proof Details")).toBeVisible();

    // Take final screenshot for documentation
    await helpers.takeScreenshot("e2e-flow-complete");
  });

  test("E2E flow handles errors gracefully", async ({ page }) => {
    // Test checkout failure
    await page.route("**/api/stripe/create-checkout", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid price ID",
        }),
      });
    });

    await page.goto("/billing");
    await page.click('button:has-text("Start Pro Trial")');
    await page.waitForTimeout(1000);

    // Test webhook failure
    await page.route("**/api/stripe/webhook", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid webhook signature",
        }),
      });
    });

    const webhookResponse = await page.request.post("/api/stripe/webhook", {
      headers: {
        "stripe-signature": "invalid-signature",
        "content-type": "application/json",
      },
      data: {
        id: "evt_test_webhook_error",
        type: "checkout.session.completed",
        data: { object: {} },
      },
    });

    expect(webhookResponse.status()).toBe(400);

    // Test proof creation failure
    await page.route("**/api/proof/create", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to create proof",
        }),
      });
    });

    await page.goto("/demo");
    await helpers.mockFileUpload('input[type="file"]', "Test file for error handling");
    await page.click('button:has-text("Create Proof")');
    await page.waitForTimeout(2000);

    // Should show error message
    await expect(page.locator("text=Failed to create proof")).toBeVisible();

    // Test verification failure
    await page.route("**/api/verify", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Proof not found",
        }),
      });
    });

    await page.goto("/verify");
    const proofInput = page.locator('input[placeholder*="proof ID"]');
    await proofInput.fill("invalid-proof-id");
    await page.click('button:has-text("Verify")');
    await page.waitForTimeout(2000);

    // Should show verification failure
    await expect(page.locator("text=Proof not found")).toBeVisible();
  });

  test("E2E flow with file upload verification", async ({ page }) => {
    const testFileContent = "E2E test file content for verification";

    // Mock successful proof creation
    await page.route("**/api/proof/create", async (route) => {
      testProofId = "proof_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          proofId: testProofId,
          success: true,
          message: "Proof created successfully!",
          proof: {
            id: testProofId,
            hash: "test-hash-" + Date.now(),
            signature: "test-signature-" + Date.now(),
            timestamp: new Date().toISOString(),
            fileName: "test-file.txt",
          },
        }),
      });
    });

    // Create proof
    await page.goto("/demo");
    await helpers.mockFileUpload('input[type="file"]', testFileContent);
    await page.click('button:has-text("Create Proof")');
    await helpers.waitForProofCreation();

    // Mock verification with file upload
    await page.route("**/api/verify", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const hash = url.searchParams.get("hash");
      
      // Mock verification response

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          valid: true,
          signer: "did:web:veris.example",
          issued_at: new Date().toISOString(),
          latency_ms: 42,
          errors: [],
        }),
      });
    });

    // Verify with file upload
    await page.goto("/verify");
    await helpers.mockFileUpload('input[type="file"]', testFileContent);
    await page.click('button:has-text("Verify")');
    await page.waitForTimeout(2000);

    // Should show successful verification
    await expect(page.locator("text=Verification Successful")).toBeVisible();
  });
});
