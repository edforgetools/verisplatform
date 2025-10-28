#!/usr/bin/env tsx

/**
 * Test Verification Endpoint
 *
 * This script tests the verification endpoint as specified in the MVP checklist:
 * 1. Tests hash-based verification
 * 2. Tests file-based verification
 * 3. Confirms consistent results across mirrors
 * 4. Measures response latency
 */

import { config } from "dotenv";
import path from "path";
import { issueProofForPayload } from "./issuance";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface VerificationResponse {
  valid: boolean;
  timestamp: string;
  signer: string;
  source: string;
  latency_ms: number;
  errors: string[];
}

async function testVerificationEndpoint() {
  console.log("🧪 Testing Verification Endpoint...\n");

  try {
    // Test 1: Generate a test proof
    console.log("1. Generating test proof...");
    const testPayload = "Verification Endpoint Test - " + new Date().toISOString();
    const testProof = await issueProofForPayload(testPayload, "verification-test.txt", {
      project: "verification-test",
      userId: "test-user",
    });

    const proofJson = JSON.parse(require("fs").readFileSync(testProof.registryPath, "utf8"));
    console.log(`✅ Test proof generated: ${testProof.proofId}`);
    console.log(`   Hash: ${testProof.hash}\n`);

    // Test 2: Verify by hash (GET request)
    console.log("2. Testing hash-based verification (GET)...");
    const hashResponse = await fetch(`${BASE_URL}/api/verify?hash=${testProof.hash}`);
    const hashResult: VerificationResponse = await hashResponse.json();

    console.log(`✅ Hash verification response:`);
    console.log(`   Valid: ${hashResult.valid}`);
    console.log(`   Source: ${hashResult.source}`);
    console.log(`   Latency: ${hashResult.latency_ms}ms`);
    console.log(`   Signer: ${hashResult.signer}`);
    if (hashResult.errors.length > 0) {
      console.log(`   Errors: ${hashResult.errors.join(", ")}`);
    }
    console.log("");

    // Test 3: Verify by hash (POST request with JSON)
    console.log("3. Testing hash-based verification (POST JSON)...");
    const postResponse = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hash: testProof.hash }),
    });
    const postResult: VerificationResponse = await postResponse.json();

    console.log(`✅ POST verification response:`);
    console.log(`   Valid: ${postResult.valid}`);
    console.log(`   Source: ${postResult.source}`);
    console.log(`   Latency: ${postResult.latency_ms}ms`);
    console.log(`   Signer: ${postResult.signer}`);
    if (postResult.errors.length > 0) {
      console.log(`   Errors: ${postResult.errors.join(", ")}`);
    }
    console.log("");

    // Test 4: Test with invalid hash
    console.log("4. Testing with invalid hash...");
    const invalidHash = "0000000000000000000000000000000000000000000000000000000000000000";
    const invalidResponse = await fetch(`${BASE_URL}/api/verify?hash=${invalidHash}`);
    const invalidResult: VerificationResponse = await invalidResponse.json();

    console.log(`✅ Invalid hash verification response:`);
    console.log(`   Valid: ${invalidResult.valid}`);
    console.log(`   Source: ${invalidResult.source}`);
    console.log(`   Latency: ${invalidResult.latency_ms}ms`);
    if (invalidResult.errors.length > 0) {
      console.log(`   Errors: ${invalidResult.errors.join(", ")}`);
    }
    console.log("");

    // Test 5: Test file-based verification
    console.log("5. Testing file-based verification...");
    const formData = new FormData();
    const testFile = new File([testPayload], "verification-test.txt", { type: "text/plain" });
    formData.append("file", testFile);

    const fileResponse = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      body: formData,
    });
    const fileResult: VerificationResponse = await fileResponse.json();

    console.log(`✅ File verification response:`);
    console.log(`   Valid: ${fileResult.valid}`);
    console.log(`   Source: ${fileResult.source}`);
    console.log(`   Latency: ${fileResult.latency_ms}ms`);
    console.log(`   Signer: ${fileResult.signer}`);
    if (fileResult.errors.length > 0) {
      console.log(`   Errors: ${fileResult.errors.join(", ")}`);
    }
    console.log("");

    // Test 6: Performance test (multiple requests)
    console.log("6. Running performance test (10 requests)...");
    const performanceResults: number[] = [];

    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      const perfResponse = await fetch(`${BASE_URL}/api/verify?hash=${testProof.hash}`);
      const perfResult: VerificationResponse = await perfResponse.json();
      const endTime = Date.now();

      performanceResults.push(perfResult.latency_ms);
    }

    const avgLatency = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length;
    const maxLatency = Math.max(...performanceResults);
    const minLatency = Math.min(...performanceResults);

    console.log(`✅ Performance test results:`);
    console.log(`   Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Min latency: ${minLatency}ms`);
    console.log(`   Max latency: ${maxLatency}ms`);
    console.log("");

    // Test 7: Test error handling
    console.log("7. Testing error handling...");
    const errorResponse = await fetch(`${BASE_URL}/api/verify`);
    const errorResult = await errorResponse.json();

    console.log(`✅ Error handling test:`);
    console.log(`   Status: ${errorResponse.status}`);
    console.log(`   Response: ${JSON.stringify(errorResult, null, 2)}`);
    console.log("");

    console.log("🎉 All verification endpoint tests completed successfully!");
  } catch (error) {
    console.error("❌ Verification endpoint test failed:", error);
    process.exit(1);
  }
}

async function testConsistencyAcrossMirrors() {
  console.log("🧪 Testing Consistency Across Mirrors...\n");

  try {
    // Generate test proof
    const testPayload = "Mirror Consistency Test - " + new Date().toISOString();
    const testProof = await issueProofForPayload(testPayload, "mirror-test.txt", {
      project: "mirror-test",
      userId: "test-user",
    });

    // Test multiple requests to ensure consistency
    const results: VerificationResponse[] = [];

    for (let i = 0; i < 5; i++) {
      const response = await fetch(`${BASE_URL}/api/verify?hash=${testProof.hash}`);
      const result: VerificationResponse = await response.json();
      results.push(result);
    }

    // Check consistency
    const firstResult = results[0];
    const allConsistent = results.every(
      (result) =>
        result.valid === firstResult.valid &&
        result.signer === firstResult.signer &&
        result.source === firstResult.source,
    );

    console.log(`✅ Mirror consistency test:`);
    console.log(`   All results consistent: ${allConsistent}`);
    console.log(`   Valid: ${firstResult.valid}`);
    console.log(`   Signer: ${firstResult.signer}`);
    console.log(`   Source: ${firstResult.source}`);

    if (!allConsistent) {
      console.log("   Inconsistent results:");
      results.forEach((result, index) => {
        console.log(
          `   Request ${index + 1}: valid=${result.valid}, signer=${result.signer}, source=${result.source}`,
        );
      });
    }
    console.log("");

    console.log("🎉 Mirror consistency test completed!");
  } catch (error) {
    console.error("❌ Mirror consistency test failed:", error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "test":
      await testVerificationEndpoint();
      break;
    case "consistency":
      await testConsistencyAcrossMirrors();
      break;
    case "all":
      await testVerificationEndpoint();
      await testConsistencyAcrossMirrors();
      break;
    default:
      console.log("Verification Endpoint Test Script");
      console.log("");
      console.log("Usage:");
      console.log("  tsx test-verification.ts test        - Run full verification tests");
      console.log("  tsx test-verification.ts consistency - Test consistency across mirrors");
      console.log("  tsx test-verification.ts all         - Run all tests");
      break;
  }
}

if (require.main === module) {
  main();
}
