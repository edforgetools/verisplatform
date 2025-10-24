import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting global setup for E2E tests");

  // Check if we're testing against a preview deployment
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";
  console.log(`📍 Base URL: ${baseURL}`);

  // Launch browser to check if the site is accessible
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the site to be ready
    await page.goto(baseURL, { waitUntil: "networkidle", timeout: 30000 });
    console.log("✅ Site is accessible and ready for testing");
  } catch (error) {
    console.error("❌ Site is not accessible:", error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log("✅ Global setup completed successfully");
}

export default globalSetup;
