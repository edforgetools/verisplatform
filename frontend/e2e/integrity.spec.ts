/**
 * E2E tests for integrity page
 */

import { test, expect } from "@playwright/test";

test.describe("Integrity Page", () => {
  test("renders integrity page with expected fields", async ({ page }) => {
    // Mock the API responses
    await page.route("**/api/integrity/latest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          batch: 1,
          merkle_root: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          s3_url:
            "https://test-bucket.s3.us-east-1.amazonaws.com/registry/snapshots/1.manifest.json",
          arweave_txid: "test-arweave-txid",
          schema_version: 1,
          created_at: "2024-01-01T00:00:00.000Z",
        }),
      });
    });

    await page.route("**/api/integrity/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "healthy",
          total_proofs: 1500,
          checks: {
            signing_key_present: true,
            database_accessible: true,
            snapshot_exists: true,
            snapshot_recent: true,
            arweave_published: true,
            snapshot_count_correct: true,
          },
          issues: [],
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
      });
    });

    await page.goto("/integrity");

    // Check page title and main heading
    await expect(page).toHaveTitle(/Integrity/);
    await expect(page.locator("h1")).toContainText("Registry Integrity");

    // Check system health section
    await expect(page.locator("text=System Health")).toBeVisible();
    await expect(page.locator("text=HEALTHY")).toBeVisible();
    await expect(page.locator("text=Total Proofs:")).toBeVisible();
    await expect(page.locator("text=1,500")).toBeVisible();

    // Check health checks
    await expect(page.locator("text=Health Checks:")).toBeVisible();
    await expect(page.locator("text=Signing Key Present")).toBeVisible();
    await expect(page.locator("text=Database Accessible")).toBeVisible();
    await expect(page.locator("text=Snapshot Exists")).toBeVisible();

    // Check latest snapshot section
    await expect(page.locator("text=Latest Snapshot")).toBeVisible();
    await expect(page.locator("text=Batch:")).toBeVisible();
    await expect(page.locator("text=#1")).toBeVisible();
    await expect(page.locator("text=Schema Version:")).toBeVisible();
    await expect(page.locator("text=v1")).toBeVisible();
    await expect(page.locator("text=Merkle Root:")).toBeVisible();

    // Check links
    await expect(page.locator("text=S3 Manifest")).toBeVisible();
    await expect(page.locator("text=Arweave Transaction")).toBeVisible();

    // Check verification commands
    await expect(page.locator("text=Verification Commands:")).toBeVisible();
    await expect(page.locator("text=curl")).toBeVisible();
    await expect(page.locator("text=openssl")).toBeVisible();

    // Check transparency notice
    await expect(page.locator("text=Transparency Notice")).toBeVisible();
    await expect(page.locator("text=support@verisplatform.com")).toBeVisible();
  });

  test("handles no snapshots available", async ({ page }) => {
    // Mock API responses for no snapshots
    await page.route("**/api/integrity/latest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          batch: null,
          merkle_root: null,
          s3_url: null,
          arweave_txid: null,
          schema_version: 1,
          message: "No snapshots available yet",
        }),
      });
    });

    await page.route("**/api/integrity/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "healthy",
          total_proofs: 500,
          checks: {
            signing_key_present: true,
            database_accessible: true,
            snapshot_exists: true,
            snapshot_recent: true,
            arweave_published: true,
            snapshot_count_correct: true,
          },
          issues: [],
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
      });
    });

    await page.goto("/integrity");

    // Check that no snapshot message is displayed
    await expect(page.locator("text=No snapshots available yet")).toBeVisible();
    await expect(
      page.locator("text=Snapshots are created automatically every 1,000 proofs"),
    ).toBeVisible();
  });

  test("handles unhealthy system status", async ({ page }) => {
    // Mock API responses for unhealthy system
    await page.route("**/api/integrity/latest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          batch: 1,
          merkle_root: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          s3_url:
            "https://test-bucket.s3.us-east-1.amazonaws.com/registry/snapshots/1.manifest.json",
          arweave_txid: null,
          schema_version: 1,
          created_at: "2024-01-01T00:00:00.000Z",
        }),
      });
    });

    await page.route("**/api/integrity/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "unhealthy",
          total_proofs: 1500,
          checks: {
            signing_key_present: true,
            database_accessible: true,
            snapshot_exists: true,
            snapshot_recent: false,
            arweave_published: false,
            snapshot_count_correct: true,
          },
          issues: ["Latest snapshot is 48 hours old", "Latest snapshot not published to Arweave"],
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
      });
    });

    await page.goto("/integrity");

    // Check unhealthy status
    await expect(page.locator("text=UNHEALTHY")).toBeVisible();

    // Check issues are displayed
    await expect(page.locator("text=Issues:")).toBeVisible();
    await expect(page.locator("text=Latest snapshot is 48 hours old")).toBeVisible();
    await expect(page.locator("text=Latest snapshot not published to Arweave")).toBeVisible();
  });

  test("handles API errors gracefully", async ({ page }) => {
    // Mock API error responses
    await page.route("**/api/integrity/latest", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.route("**/api/integrity/health", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/integrity");

    // Check error message is displayed
    await expect(page.locator("text=Error")).toBeVisible();
    await expect(page.locator("text=Failed to fetch integrity data")).toBeVisible();
  });
});
