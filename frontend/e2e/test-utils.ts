import { Page, expect } from "@playwright/test";

/**
 * Test utilities for E2E tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for navigation to complete and verify URL
   */
  async waitForNavigation(urlPattern: string | RegExp) {
    await this.page.waitForURL(urlPattern);
  }

  /**
   * Wait for toast notification to appear
   */
  async waitForToast(message?: string) {
    const toast = this.page.locator('[data-testid="toast"]').first();
    if (message) {
      await expect(toast).toContainText(message);
    } else {
      await expect(toast).toBeVisible();
    }
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoadingToComplete() {
    await this.page.waitForSelector('[data-testid="loading"]', { state: "hidden" }).catch(() => {
      // Loading indicator might not exist, that's fine
    });
  }

  /**
   * Mock file upload by setting input files directly
   */
  async mockFileUpload(selector: string, fileContent: string = "Test file content") {
    // Create a temporary file for upload
    const fs = await import("fs");
    const path = await import("path");
    const tempDir = path.join(process.cwd(), "test-results", "temp");

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, "test-file.txt");
    fs.writeFileSync(tempFile, fileContent);

    await this.page.setInputFiles(selector, tempFile);
  }

  /**
   * Mock Stripe checkout redirect
   */
  async mockStripeCheckout() {
    await this.page.route("**/api/stripe/create-checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://checkout.stripe.com/test-success",
        }),
      });
    });

    // Mock the redirect to success page
    await this.page.route("**/checkout.stripe.com/test-success", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1>Checkout Success</h1></body></html>",
      });
    });
  }

  /**
   * Mock Supabase authentication
   */
  async mockSupabaseAuth() {
    await this.page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: {
              id: "test-user-id",
              email: "test@example.com",
            },
          },
        }),
      });
    });
  }

  /**
   * Mock billing status check
   */
  async mockBillingStatus(tier: string | null = null, status: string = "active") {
    await this.page.route("**/billing", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tier,
            status,
            stripe_subscription_id: tier ? "sub_test123" : null,
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Wait for proof creation to complete
   */
  async waitForProofCreation() {
    await this.page.waitForSelector("text=Proof created successfully!", { timeout: 10000 });
  }

  /**
   * Wait for verification to complete
   */
  async waitForVerification() {
    await this.page.waitForSelector('[data-testid="verification-result"]', { timeout: 10000 });
  }

  /**
   * Extract proof ID from URL or response
   */
  async extractProofId(): Promise<string> {
    const url = this.page.url();
    const match = url.match(/\/proof\/([^\/]+)/);
    return match ? match[1] : "";
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }
}
