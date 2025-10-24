import { FullConfig } from "@playwright/test";

async function globalTeardown(config: FullConfig) {
  console.log("🧹 Starting global teardown for E2E tests");

  // Clean up any temporary files or resources
  const fs = await import("fs");
  const path = await import("path");

  try {
    // Clean up temporary test files
    const tempDir = path.join(process.cwd(), "test-results", "temp");
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
      console.log(`✅ Cleaned up ${files.length} temporary files`);
    }

    // Clean up screenshots directory if it's empty
    const screenshotsDir = path.join(process.cwd(), "test-results", "screenshots");
    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir);
      if (files.length === 0) {
        fs.rmdirSync(screenshotsDir);
        console.log("✅ Cleaned up empty screenshots directory");
      }
    }
  } catch (error) {
    console.warn("⚠️ Warning during cleanup:", error);
  }

  console.log("✅ Global teardown completed successfully");
}

export default globalTeardown;
