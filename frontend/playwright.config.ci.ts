import { defineConfig, devices } from "@playwright/test";

/**
 * CI-specific Playwright configuration
 * Uses external server (started by workflow), no webServer
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Sequential in CI for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker in CI
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No webServer - rely on external server started by workflow
});

