#!/usr/bin/env tsx

/**
 * Contract Tests for Verification Endpoint
 *
 * This script implements contract tests as specified in the MVP checklist:
 * 1. Spin local api at BASE
 * 2. Run same verify calls against MIRROR_BASE (mock mirror server reading same storage)
 * 3. Expect identical JSON responses
 */

import { config } from "dotenv";
import path from "path";
import { issueProofForPayload } from "./issuance";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const MIRROR_BASE_URL = process.env.MIRROR_BASE_URL || "http://localhost:3001"; // Mock mirror server

interface VerificationResponse {
  valid: boolean;
  signer: string;
  issued_at: string;
  latency_ms: number;
  errors: string[];
}

interface ContractTestResult {
  testName: string;
  passed: boolean;
  mainResponse: VerificationResponse;
  mirrorResponse: VerificationResponse;
  differences: string[];
}

/**
 * Compare two verification responses for contract compliance
 */
function compareResponses(main: VerificationResponse, mirror: VerificationResponse): string[] {
  const differences: string[] = [];

  if (main.valid !== mirror.valid) {
    differences.push(`valid: main=${main.valid}, mirror=${mirror.valid}`);
  }

  if (main.signer !== mirror.signer) {
    differences.push(`signer: main="${main.signer}", mirror="${mirror.signer}"`);
  }

  if (main.issued_at !== mirror.issued_at) {
    differences.push(`issued_at: main="${main.issued_at}", mirror="${mirror.issued_at}"`);
  }

  // Errors array comparison (order doesn't matter)
  const mainErrors = main.errors.sort();
  const mirrorErrors = mirror.errors.sort();
  if (JSON.stringify(mainErrors) !== JSON.stringify(mirrorErrors)) {
    differences.push(
      `errors: main=[${mainErrors.join(", ")}], mirror=[${mirrorErrors.join(", ")}]`,
    );
  }

  return differences;
}

/**
 * Test verification against both main and mirror endpoints
 */
async function testContractVerification(
  testName: string,
  testFunction: (baseUrl: string) => Promise<VerificationResponse>,
): Promise<ContractTestResult> {
  console.log(`Testing: ${testName}`);

  try {
    // Test against main endpoint
    const mainResponse = await testFunction(BASE_URL);
    console.log(
      `  Main response: valid=${mainResponse.valid}, latency=${mainResponse.latency_ms}ms`,
    );

    // Test against mirror endpoint
    const mirrorResponse = await testFunction(MIRROR_BASE_URL);
    console.log(
      `  Mirror response: valid=${mirrorResponse.valid}, latency=${mirrorResponse.latency_ms}ms`,
    );

    // Compare responses
    const differences = compareResponses(mainResponse, mirrorResponse);
    const passed = differences.length === 0;

    if (passed) {
      console.log(`  ✅ Contract test PASSED`);
    } else {
      console.log(`  ❌ Contract test FAILED`);
      differences.forEach((diff) => console.log(`    Difference: ${diff}`));
    }

    return {
      testName,
      passed,
      mainResponse,
      mirrorResponse,
      differences,
    };
  } catch (error) {
    console.log(`  ❌ Contract test ERROR: ${error instanceof Error ? error.message : error}`);
    return {
      testName,
      passed: false,
      mainResponse: {
        valid: false,
        signer: "",
        issued_at: "",
        latency_ms: 0,
        errors: ["Test error"],
      },
      mirrorResponse: {
        valid: false,
        signer: "",
        issued_at: "",
        latency_ms: 0,
        errors: ["Test error"],
      },
      differences: [`Test error: ${error instanceof Error ? error.message : error}`],
    };
  }
}

/**
 * Run contract tests against main and mirror endpoints
 */
async function runContractTests() {
  console.log("🧪 Running Contract Tests for Verification Endpoint...\n");
  console.log(`Main endpoint: ${BASE_URL}`);
  console.log(`Mirror endpoint: ${MIRROR_BASE_URL}\n`);

  const results: ContractTestResult[] = [];

  try {
    // Generate test proof
    console.log("1. Generating test proof...");
    const testPayload = "Contract Test Proof - " + new Date().toISOString();
    const testProof = await issueProofForPayload(testPayload, "contract-test.txt", {
      project: "contract-test",
      userId: "test-user",
    });

    const proofJson = JSON.parse(require("fs").readFileSync(testProof.registryPath, "utf8"));
    console.log(`✅ Test proof generated: ${testProof.proofId}`);
    console.log(`   Hash: ${testProof.hash}\n`);

    // Test 1: Hash-based verification (GET)
    const test1 = await testContractVerification(
      "Hash-based verification (GET)",
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/verify?hash=${testProof.hash}`);
        return await response.json();
      },
    );
    results.push(test1);
    console.log("");

    // Test 2: Hash-based verification (POST JSON)
    const test2 = await testContractVerification(
      "Hash-based verification (POST JSON)",
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash: testProof.hash }),
        });
        return await response.json();
      },
    );
    results.push(test2);
    console.log("");

    // Test 3: File-based verification
    const test3 = await testContractVerification("File-based verification", async (baseUrl) => {
      const formData = new FormData();
      const testFile = new File([testPayload], "contract-test.txt", { type: "text/plain" });
      formData.append("file", testFile);

      const response = await fetch(`${baseUrl}/api/verify`, {
        method: "POST",
        body: formData,
      });
      return await response.json();
    });
    results.push(test3);
    console.log("");

    // Test 4: Invalid hash verification
    const test4 = await testContractVerification("Invalid hash verification", async (baseUrl) => {
      const invalidHash = "0000000000000000000000000000000000000000000000000000000000000000";
      const response = await fetch(`${baseUrl}/api/verify?hash=${invalidHash}`);
      return await response.json();
    });
    results.push(test4);
    console.log("");

    // Test 5: Missing hash parameter
    const test5 = await testContractVerification("Missing hash parameter", async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/verify`);
      return await response.json();
    });
    results.push(test5);
    console.log("");

    // Test 6: Multiple requests for consistency
    console.log("6. Testing consistency across multiple requests...");
    const consistencyResults: ContractTestResult[] = [];

    for (let i = 0; i < 3; i++) {
      const test = await testContractVerification(`Consistency test ${i + 1}`, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/verify?hash=${testProof.hash}`);
        return await response.json();
      });
      consistencyResults.push(test);
    }

    const allConsistent = consistencyResults.every((result) => result.passed);
    console.log(`   Consistency across requests: ${allConsistent ? "PASSED" : "FAILED"}\n`);

    // Summary
    console.log("📊 Contract Test Summary:");
    console.log("========================");

    const passedTests = results.filter((r) => r.passed).length;
    const totalTests = results.length;

    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (passedTests === totalTests) {
      console.log(
        "🎉 All contract tests PASSED! Main and mirror endpoints return identical responses.",
      );
    } else {
      console.log("❌ Some contract tests FAILED. Main and mirror endpoints have differences.");
      console.log("\nFailed tests:");
      results
        .filter((r) => !r.passed)
        .forEach((result) => {
          console.log(`  - ${result.testName}`);
          result.differences.forEach((diff) => console.log(`    ${diff}`));
        });
    }
  } catch (error) {
    console.error("❌ Contract test suite failed:", error);
    process.exit(1);
  }
}

/**
 * Test mirror server availability
 */
async function testMirrorAvailability() {
  console.log("🔍 Testing mirror server availability...\n");

  try {
    const response = await fetch(`${MIRROR_BASE_URL}/api/verify`);
    console.log(`✅ Mirror server is accessible (status: ${response.status})`);
    return true;
  } catch (error) {
    console.log(
      `❌ Mirror server is not accessible: ${error instanceof Error ? error.message : error}`,
    );
    console.log(`   This is expected if no mirror server is running.`);
    console.log(`   To test with a real mirror, set MIRROR_BASE_URL environment variable.`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "test":
      await runContractTests();
      break;
    case "availability":
      await testMirrorAvailability();
      break;
    case "all":
      const mirrorAvailable = await testMirrorAvailability();
      console.log("");
      if (mirrorAvailable) {
        await runContractTests();
      } else {
        console.log("Skipping contract tests due to mirror server unavailability.");
      }
      break;
    default:
      console.log("Contract Verification Test Script");
      console.log("");
      console.log("Usage:");
      console.log("  tsx test-contract-verification.ts test        - Run contract tests");
      console.log("  tsx test-contract-verification.ts availability - Test mirror availability");
      console.log("  tsx test-contract-verification.ts all         - Run all tests");
      console.log("");
      console.log("Environment variables:");
      console.log("  NEXT_PUBLIC_SITE_URL - Main endpoint URL (default: http://localhost:3000)");
      console.log("  MIRROR_BASE_URL      - Mirror endpoint URL (default: http://localhost:3001)");
      break;
  }
}

if (require.main === module) {
  main();
}
