#!/usr/bin/env tsx

/**
 * Load Test for Rate Limiting
 *
 * This script tests the rate limiting functionality by making rapid requests
 * to the API and verifying that 429 responses are returned after the threshold.
 */

import fetch from "node-fetch";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const RATE_LIMIT_THRESHOLD = 60; // requests per minute
const TEST_DURATION_MS = 65000; // 65 seconds to exceed 1 minute window
const REQUEST_INTERVAL_MS = 1000; // 1 request per second

interface TestResult {
  requestNumber: number;
  timestamp: string;
  status: number;
  responseTime: number;
  success: boolean;
  rateLimited: boolean;
}

async function makeRequest(requestNumber: number): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/api/proof/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Invalid request to trigger validation error (faster than processing)
        file: null,
        user_id: "test-user",
      }),
    });

    const responseTime = Date.now() - startTime;
    const rateLimited = response.status === 429;

    return {
      requestNumber,
      timestamp: new Date().toISOString(),
      status: response.status,
      responseTime,
      success: response.ok,
      rateLimited,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      requestNumber,
      timestamp: new Date().toISOString(),
      status: 0,
      responseTime,
      success: false,
      rateLimited: false,
    };
  }
}

async function runLoadTest(): Promise<void> {
  console.log("🚀 Starting rate limit load test...");
  console.log(`📊 Target: ${RATE_LIMIT_THRESHOLD} requests per minute`);
  console.log(`⏱️  Duration: ${TEST_DURATION_MS / 1000} seconds`);
  console.log(`🔄 Interval: ${REQUEST_INTERVAL_MS}ms between requests`);
  console.log("");

  const results: TestResult[] = [];
  const startTime = Date.now();
  let requestNumber = 1;

  // Make requests at regular intervals
  const interval = setInterval(async () => {
    if (Date.now() - startTime >= TEST_DURATION_MS) {
      clearInterval(interval);
      await analyzeResults(results);
      return;
    }

    const result = await makeRequest(requestNumber);
    results.push(result);

    const status = result.rateLimited
      ? "🔴 RATE LIMITED"
      : result.success
      ? "🟢 SUCCESS"
      : `🟡 ${result.status}`;

    console.log(
      `Request ${requestNumber.toString().padStart(3)}: ${status} (${result.responseTime}ms)`,
    );
    requestNumber++;
  }, REQUEST_INTERVAL_MS);

  // Wait for test to complete
  await new Promise((resolve) => setTimeout(resolve, TEST_DURATION_MS + 1000));
}

async function analyzeResults(results: TestResult[]): Promise<void> {
  console.log("\n📈 Test Results Analysis:");
  console.log("=".repeat(50));

  const totalRequests = results.length;
  const successfulRequests = results.filter((r) => r.success).length;
  const rateLimitedRequests = results.filter((r) => r.rateLimited).length;
  const failedRequests = results.filter((r) => !r.success && !r.rateLimited).length;

  console.log(`📊 Total Requests: ${totalRequests}`);
  console.log(`🟢 Successful: ${successfulRequests}`);
  console.log(`🔴 Rate Limited: ${rateLimitedRequests}`);
  console.log(`🟡 Other Failures: ${failedRequests}`);

  // Find when rate limiting started
  const firstRateLimited = results.find((r) => r.rateLimited);
  if (firstRateLimited) {
    console.log(`\n🚨 First rate limit at request #${firstRateLimited.requestNumber}`);
    console.log(`⏰ Time to rate limit: ${firstRateLimited.requestNumber} seconds`);
  } else {
    console.log("\n⚠️  No rate limiting detected - this might indicate an issue");
  }

  // Calculate success rate
  const successRate = (successfulRequests / totalRequests) * 100;
  const rateLimitRate = (rateLimitedRequests / totalRequests) * 100;

  console.log(`\n📊 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`📊 Rate Limit Rate: ${rateLimitRate.toFixed(1)}%`);

  // Check if rate limiting is working as expected
  if (rateLimitedRequests > 0) {
    console.log("\n✅ Rate limiting is working correctly!");
    console.log("   The system correctly returned 429 responses after the threshold.");
  } else {
    console.log("\n❌ Rate limiting may not be working correctly.");
    console.log("   Expected to see 429 responses after 60 requests per minute.");
  }

  // Show response time statistics
  const responseTimes = results.map((r) => r.responseTime);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxResponseTime = Math.max(...responseTimes);
  const minResponseTime = Math.min(...responseTimes);

  console.log(`\n⏱️  Response Time Stats:`);
  console.log(`   Average: ${avgResponseTime.toFixed(1)}ms`);
  console.log(`   Min: ${minResponseTime}ms`);
  console.log(`   Max: ${maxResponseTime}ms`);

  console.log("\n🏁 Load test completed!");
}

// Run the test
if (require.main === module) {
  runLoadTest().catch(console.error);
}

export { runLoadTest };
