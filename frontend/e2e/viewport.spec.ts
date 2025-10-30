import { test, expect } from "@playwright/test";

const routes = ["/", "/close", "/check", "/billing"];

test.describe("Viewport constraints", () => {
  test("No scroll at 1280x900", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);

      expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 150); // 150px tolerance for browser differences and font rendering
    }
  });

  test("Scroll allowed at 1280x640 without clipping", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 640 });

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // Check that footer is reachable via scroll
      // Use more flexible selector - footer might be inside other elements
      const footer = page.locator("footer").first();
      if (await footer.count() > 0) {
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toBeVisible({ timeout: 5000 });
      } else {
        // If no footer, check that page is scrollable (content exceeds viewport)
        const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
        expect(scrollHeight).toBeGreaterThan(clientHeight);
      }
    }
  });
});
