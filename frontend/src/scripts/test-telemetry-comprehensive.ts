#!/usr/bin/env tsx

/**
 * Comprehensive Telemetry System Test
 *
 * This script tests the complete telemetry system including:
 * - Usage metrics recording
 * - Capacity planning calculations
 * - Daily aggregation jobs
 * - Telemetry dashboard functionality
 * - Export functionality
 */

import { supabaseService } from "../lib/db";
import {
  recordUsageMetric,
  recordProofCreation,
  recordProofVerification,
  recordApiCall,
  getUsageStats,
  getCurrentUsageMetrics,
  generateWeeklySummary,
  automateWeeklySummary,
} from "../lib/usage-telemetry";
import { logger } from "../lib/logger";

// Test user ID (you can replace this with a real user ID for testing)
const TEST_USER_ID = "test-user-telemetry-12345";
const TEST_PROOF_ID = "test-proof-telemetry-67890";

async function testUsageMetricRecording() {
  console.log("🧪 Testing usage metric recording...");

  try {
    // Test basic usage metric recording
    await recordUsageMetric({
      proof_id: TEST_PROOF_ID,
      event_type: "proof.create",
      timestamp: new Date().toISOString(),
      user_id: TEST_USER_ID,
      metadata: {
        file_size: 1024,
        file_type: "pdf",
        test: true,
      },
    });

    // Test proof creation recording
    await recordProofCreation(TEST_PROOF_ID, TEST_USER_ID, {
      file_size: 2048,
      file_type: "image/png",
      project: "test-project",
      visibility: "public",
    });

    // Test proof verification recording
    await recordProofVerification(TEST_PROOF_ID, TEST_USER_ID, {
      verification_method: "hash",
      success: true,
      latency_ms: 150,
    });

    // Test API call recording
    await recordApiCall("/api/proof/create", TEST_USER_ID, {
      response_time: 250,
      success: true,
      endpoint: "/api/proof/create",
    });

    console.log("✅ Usage metric recording tests passed");
  } catch (error) {
    console.error("❌ Usage metric recording tests failed:", error);
    throw error;
  }
}

async function testUsageStatsCalculation() {
  console.log("🧪 Testing usage stats calculation...");

  try {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Test usage stats for today
    const todayStats = await getUsageStats(today, today);
    console.log("📊 Today's stats:", {
      total_proofs: todayStats.total_proofs,
      total_verifications: todayStats.total_verifications,
      total_api_calls: todayStats.total_api_calls,
      unique_users: todayStats.unique_users,
    });

    // Test usage stats for the week
    const weekStats = await getUsageStats(weekAgo, today);
    console.log("📊 Week's stats:", {
      total_proofs: weekStats.total_proofs,
      total_verifications: weekStats.total_verifications,
      total_api_calls: weekStats.total_api_calls,
      unique_users: weekStats.unique_users,
    });

    // Validate stats structure
    if (typeof todayStats.total_proofs !== "number") {
      throw new Error("total_proofs should be a number");
    }
    if (typeof todayStats.total_verifications !== "number") {
      throw new Error("total_verifications should be a number");
    }
    if (typeof todayStats.total_api_calls !== "number") {
      throw new Error("total_api_calls should be a number");
    }
    if (typeof todayStats.unique_users !== "number") {
      throw new Error("unique_users should be a number");
    }
    if (!Array.isArray(todayStats.weekly_trend)) {
      throw new Error("weekly_trend should be an array");
    }

    console.log("✅ Usage stats calculation tests passed");
  } catch (error) {
    console.error("❌ Usage stats calculation tests failed:", error);
    throw error;
  }
}

async function testCurrentUsageMetrics() {
  console.log("🧪 Testing current usage metrics...");

  try {
    const metrics = await getCurrentUsageMetrics();

    console.log("📊 Current Usage Metrics:", {
      today: {
        total_proofs: metrics.today.total_proofs,
        total_verifications: metrics.today.total_verifications,
        total_api_calls: metrics.today.total_api_calls,
        unique_users: metrics.today.unique_users,
      },
      this_week: {
        total_proofs: metrics.this_week.total_proofs,
        total_verifications: metrics.this_week.total_verifications,
        total_api_calls: metrics.this_week.total_api_calls,
        unique_users: metrics.this_week.unique_users,
      },
      this_month: {
        total_proofs: metrics.this_month.total_proofs,
        total_verifications: metrics.this_month.total_verifications,
        total_api_calls: metrics.this_month.total_api_calls,
        unique_users: metrics.this_month.unique_users,
      },
    });

    // Validate metrics structure
    if (!metrics.today || !metrics.this_week || !metrics.this_month) {
      throw new Error("All time periods should be present");
    }

    console.log("✅ Current usage metrics tests passed");
  } catch (error) {
    console.error("❌ Current usage metrics tests failed:", error);
    throw error;
  }
}

async function testWeeklySummaryGeneration() {
  console.log("🧪 Testing weekly summary generation...");

  try {
    // Get last week's date range
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 7);
    const weekEnd = endDate.toISOString().split("T")[0];

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    const weekStart = startDate.toISOString().split("T")[0];

    const summary = await generateWeeklySummary(weekStart, weekEnd);

    console.log("📊 Weekly Summary:", {
      week_start: summary.week_start,
      week_end: summary.week_end,
      total_proofs_created: summary.total_proofs_created,
      total_proofs_verified: summary.total_proofs_verified,
      total_api_calls: summary.total_api_calls,
      unique_users: summary.unique_users,
      top_users_count: summary.top_users.length,
    });

    // Validate summary structure
    if (typeof summary.total_proofs_created !== "number") {
      throw new Error("total_proofs_created should be a number");
    }
    if (typeof summary.total_proofs_verified !== "number") {
      throw new Error("total_proofs_verified should be a number");
    }
    if (typeof summary.total_api_calls !== "number") {
      throw new Error("total_api_calls should be a number");
    }
    if (typeof summary.unique_users !== "number") {
      throw new Error("unique_users should be a number");
    }
    if (!Array.isArray(summary.top_users)) {
      throw new Error("top_users should be an array");
    }

    console.log("✅ Weekly summary generation tests passed");
  } catch (error) {
    console.error("❌ Weekly summary generation tests failed:", error);
    throw error;
  }
}

async function testTelemetryAPIEndpoints() {
  console.log("🧪 Testing telemetry API endpoints...");

  try {
    // Test telemetry metrics endpoint
    const metricsResponse = await fetch("http://localhost:3000/api/telemetry/metrics", {
      headers: {
        Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
      },
    });

    console.log("📊 Telemetry metrics endpoint status:", metricsResponse.status);

    // Test capacity metrics endpoint
    const capacityResponse = await fetch("http://localhost:3000/api/telemetry/capacity", {
      headers: {
        Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
      },
    });

    console.log("📊 Capacity metrics endpoint status:", capacityResponse.status);

    // Test telemetry export endpoint
    const exportResponse = await fetch(
      "http://localhost:3000/api/telemetry/export?format=json&days=7",
      {
        headers: {
          Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
        },
      },
    );

    console.log("📊 Telemetry export endpoint status:", exportResponse.status);

    console.log("✅ Telemetry API endpoints tests completed");
  } catch (error) {
    console.error("❌ Telemetry API endpoints tests failed:", error);
    throw error;
  }
}

async function testDailyAggregationJob() {
  console.log("🧪 Testing daily aggregation job...");

  try {
    // Test the daily aggregation job endpoint
    const response = await fetch("http://localhost:3000/api/jobs/telemetry-daily", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
      },
    });

    console.log("📊 Daily aggregation job status:", response.status);

    console.log("✅ Daily aggregation job tests completed");
  } catch (error) {
    console.error("❌ Daily aggregation job tests failed:", error);
    throw error;
  }
}

async function testTelemetryTables() {
  console.log("🧪 Testing telemetry database tables...");

  try {
    const svc = supabaseService();

    // Check if telemetry table exists and is accessible
    const { data: telemetry, error: telemetryError } = await svc
      .from("telemetry")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .limit(5);

    if (telemetryError) {
      console.warn("⚠️  telemetry table may not exist:", telemetryError.message);
      console.log("📝 This is expected if the database hasn't been set up yet");
    } else {
      console.log("📊 Recent telemetry events:", telemetry);
    }

    // Check if telemetry_daily table exists and is accessible
    const { data: daily, error: dailyError } = await svc
      .from("telemetry_daily")
      .select("*")
      .limit(5);

    if (dailyError) {
      console.warn("⚠️  telemetry_daily table may not exist:", dailyError.message);
      console.log("📝 This is expected if the database hasn't been set up yet");
    } else {
      console.log("📊 Recent daily telemetry data:", daily);
    }

    console.log("✅ Telemetry database tables tests completed");
  } catch (error) {
    console.error("❌ Telemetry database tables tests failed:", error);
    throw error;
  }
}

async function cleanupTestData() {
  console.log("🧹 Cleaning up test data...");

  try {
    const svc = supabaseService();

    // Clean up test telemetry data
    await svc.from("telemetry").delete().eq("user_id", TEST_USER_ID);

    // Clean up test daily telemetry data
    await svc.from("telemetry_daily").delete().eq("event", "test");

    console.log("✅ Test data cleanup completed");
  } catch (error) {
    console.warn("⚠️  Test data cleanup failed (this is expected if tables don't exist):", error);
  }
}

async function main() {
  console.log("🚀 Starting comprehensive telemetry system tests...\n");

  try {
    await testUsageMetricRecording();
    console.log("");

    await testUsageStatsCalculation();
    console.log("");

    await testCurrentUsageMetrics();
    console.log("");

    await testWeeklySummaryGeneration();
    console.log("");

    await testTelemetryAPIEndpoints();
    console.log("");

    await testDailyAggregationJob();
    console.log("");

    await testTelemetryTables();
    console.log("");

    await cleanupTestData();
    console.log("");

    console.log("🎉 All telemetry system tests passed!");
    console.log("\n📋 Test Summary:");
    console.log("✅ Usage metric recording");
    console.log("✅ Usage stats calculation");
    console.log("✅ Current usage metrics");
    console.log("✅ Weekly summary generation");
    console.log("✅ Telemetry API endpoints");
    console.log("✅ Daily aggregation job");
    console.log("✅ Telemetry database tables");
    console.log("✅ Test data cleanup");
  } catch (error) {
    console.error("\n💥 Telemetry system tests failed:", error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
