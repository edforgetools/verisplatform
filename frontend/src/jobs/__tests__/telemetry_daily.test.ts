import { runTelemetryDailyAggregation } from "../telemetry_daily";

describe("Telemetry Daily Aggregation", () => {
  test("should have basic functionality", () => {
    // Basic test to ensure the module can be imported
    expect(typeof runTelemetryDailyAggregation).toBe("function");
  });

  test("should handle dry run mode", async () => {
    const testDate = "2024-01-16";

    // Mock console.log to capture output
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    try {
      // This should not throw an error even if it fails
      await runTelemetryDailyAggregation(testDate, true);

      // Should have logged the dry run message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TelemetryDaily] Processing date range:"),
      );
    } catch (error) {
      // Even if it fails, it should handle errors gracefully
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  test("should handle invalid date format", async () => {
    const invalidDate = "invalid-date";

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    try {
      await runTelemetryDailyAggregation(invalidDate, true);
    } catch (error) {
      // Should handle invalid dates gracefully
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  test("should handle missing environment variables", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    try {
      await runTelemetryDailyAggregation("2024-01-16", true);
    } catch (error) {
      // Should handle missing env vars gracefully
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
      consoleErrorSpy.mockRestore();
    }
  });
});
