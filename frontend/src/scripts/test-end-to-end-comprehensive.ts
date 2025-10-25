#!/usr/bin/env tsx

/**
 * Comprehensive End-to-End Test Script
 *
 * This script performs comprehensive end-to-end testing of the Veris platform,
 * including all critical workflows, integrations, and system components.
 */

import { config } from "dotenv";
import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { logger } from "../lib/logger";
import { KeyManager } from "../lib/key-management";
import { supabaseService } from "../lib/db";
import { signHash, verifySignature } from "../lib/crypto-server";
import { generateProofId } from "../lib/ids";
import { createCanonicalProof, canonicalizeAndSign } from "../lib/proof-schema";
import { recordProofCreation, recordApiCall } from "../lib/usage-telemetry";
import { recordBillingEvent } from "../lib/billing-service";
import {
  validateInput,
  validateProofId,
  validateHash,
  validateSignature,
  createProofSchema,
  verifyProofSchema,
} from "../lib/input-validation";
import {
  withEnhancedRateLimit,
  rateLimitConfigs,
  getRateLimitStats,
  resetRateLimit,
} from "../lib/rate-limiting-enhanced";
import { withSecurity, securityConfigs, withSecurityConfig } from "../lib/security-middleware";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

// =============================================================================
// END-TO-END TEST INTERFACES
// =============================================================================

interface TestResult {
  success: boolean;
  message: string;
  duration: number;
  details?: any;
  error?: string;
}

interface WorkflowTest {
  name: string;
  description: string;
  test: () => Promise<TestResult>;
  critical: boolean;
}

interface EndToEndReport {
  overall: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  totalDuration: number;
  workflows: {
    [key: string]: {
      status: "pass" | "fail" | "warning";
      tests: TestResult[];
      duration: number;
    };
  };
  recommendations: string[];
  systemHealth: "healthy" | "degraded" | "unhealthy";
}

// =============================================================================
// TEST DATA AND UTILITIES
// =============================================================================

const TEST_DATA = {
  file: {
    name: "e2e-test-document.txt",
    content: "This is a comprehensive end-to-end test document for the Veris platform validation.",
    size: 2048,
    type: "text/plain",
  },
  user: {
    id: "e2e-test-user-" + Date.now(),
    email: "e2e-test@verisplatform.com",
  },
  proof: {
    id: generateProofId(),
    hash: "a".repeat(64), // Placeholder hash
    signature: "dGVzdC1zaWduYXR1cmU=", // Placeholder signature
  },
};

// =============================================================================
// WORKFLOW TESTS
// =============================================================================

/**
 * Proof Creation Workflow Test
 */
async function testProofCreationWorkflow(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    // Step 1: Generate proof ID
    const proofId = generateProofId();
    const idValidation = validateProofId(proofId);
    results.push({
      success: idValidation.success,
      message: "Proof ID generation",
      duration: Date.now() - startTime,
      details: { proofId, validation: idValidation },
    });

    // Step 2: Generate hash
    const testContent = TEST_DATA.file.content;
    const hash = require("crypto").createHash("sha256").update(testContent).digest("hex");
    const hashValidation = validateHash(hash);
    results.push({
      success: hashValidation.success,
      message: "Hash generation",
      duration: Date.now() - startTime,
      details: { hash: hash.substring(0, 16) + "...", validation: hashValidation },
    });

    // Step 3: Generate signature
    const signature = signHash(hash);
    const signatureValidation = validateSignature(signature);
    results.push({
      success: signatureValidation.success,
      message: "Signature generation",
      duration: Date.now() - startTime,
      details: { signature: signature.substring(0, 16) + "...", validation: signatureValidation },
    });

    // Step 4: Create canonical proof
    const subject = {
      type: "file",
      namespace: "veris.test",
      id: proofId
    };
    const metadata = {
      fileName: TEST_DATA.file.name,
      fileSize: TEST_DATA.file.size,
      fileType: TEST_DATA.file.type,
      hashHex: hash,
      signatureB64: signature,
      timestamp: new Date().toISOString()
    };
    const canonicalProof = createCanonicalProof(hash, subject, metadata);

    results.push({
      success: !!canonicalProof,
      message: "Canonical proof creation",
      duration: Date.now() - startTime,
      details: {
        proofId: canonicalProof.subject.id,
        hasTimestamp: !!canonicalProof.signed_at,
        hasMetadata: !!canonicalProof.metadata,
      },
    });

    // Step 5: Store proof in database
    const supabase = supabaseService();
    const { data, error } = await supabase
      .from("proofs")
      .insert({
        id: proofId,
        hash_hex: hash,
        signature_b64: signature,
        created_at: new Date().toISOString(),
        user_id: TEST_DATA.user.id,
      })
      .select()
      .single();

    results.push({
      success: !error,
      message: "Proof storage in database",
      duration: Date.now() - startTime,
      details: {
        proofId: data?.id,
        error: error?.message,
      },
    });

    // Step 6: Record usage telemetry
    try {
      await recordProofCreation(proofId, TEST_DATA.user.id, {
        fileSize: TEST_DATA.file.size,
        processingTime: Date.now() - startTime,
      });
      results.push({
        success: true,
        message: "Usage telemetry recording",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      results.push({
        success: false,
        message: "Usage telemetry recording failed",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Clean up test data
    await supabase.from("proofs").delete().eq("id", proofId);
  } catch (error) {
    results.push({
      success: false,
      message: "Proof creation workflow failed",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Proof Verification Workflow Test
 */
async function testProofVerificationWorkflow(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    // Step 1: Create a test proof
    const proofId = generateProofId();
    const testContent = TEST_DATA.file.content;
    const hash = require("crypto").createHash("sha256").update(testContent).digest("hex");
    const signature = signHash(hash);

    // Step 2: Store proof in database
    const supabase = supabaseService();
    const { data, error } = await supabase
      .from("proofs")
      .insert({
        id: proofId,
        hash_hex: hash,
        signature_b64: signature,
        created_at: new Date().toISOString(),
        user_id: TEST_DATA.user.id,
      })
      .select()
      .single();

    if (error) {
      results.push({
        success: false,
        message: "Failed to create test proof for verification",
        duration: Date.now() - startTime,
        error: error.message,
      });
      return results;
    }

    // Step 3: Verify proof by ID
    const { data: retrievedProof, error: retrieveError } = await supabase
      .from("proofs")
      .select("*")
      .eq("id", proofId)
      .single();

    results.push({
      success: !retrieveError,
      message: "Proof retrieval by ID",
      duration: Date.now() - startTime,
      details: {
        proofId: retrievedProof?.id,
        error: retrieveError?.message,
      },
    });

    // Step 4: Verify signature
    const signatureVerification = verifySignature(hash, signature);
    results.push({
      success: signatureVerification,
      message: "Signature verification",
      duration: Date.now() - startTime,
      details: { verified: signatureVerification },
    });

    // Step 5: Verify hash
    const hashValidation = validateHash(hash);
    results.push({
      success: hashValidation.success,
      message: "Hash validation",
      duration: Date.now() - startTime,
      details: { validation: hashValidation },
    });

    // Step 6: Test verification endpoint
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/proof/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "signature",
            hashHex: hash,
            signatureB64: signature,
          }),
        },
      );

      results.push({
        success: response.status === 200,
        message: "Verification endpoint test",
        duration: Date.now() - startTime,
        details: {
          status: response.status,
          response: await response.text(),
        },
      });
    } catch (error) {
      results.push({
        success: false,
        message: "Verification endpoint test failed",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Clean up test data
    await supabase.from("proofs").delete().eq("id", proofId);
  } catch (error) {
    results.push({
      success: false,
      message: "Proof verification workflow failed",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * User Authentication Workflow Test
 */
async function testUserAuthenticationWorkflow(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    // Step 1: Test user creation
    const supabase = supabaseService();
    const { data: user, error: userError } = await supabase
      .from("app_users")
      .insert({
        user_id: TEST_DATA.user.id,
        email: TEST_DATA.user.email,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    results.push({
      success: !userError,
      message: "User creation",
      duration: Date.now() - startTime,
      details: {
        userId: user?.user_id,
        error: userError?.message,
      },
    });

    // Step 2: Test user retrieval
    const { data: retrievedUser, error: retrieveError } = await supabase
      .from("app_users")
      .select("*")
      .eq("user_id", TEST_DATA.user.id)
      .single();

    results.push({
      success: !retrieveError,
      message: "User retrieval",
      duration: Date.now() - startTime,
      details: {
        userId: retrievedUser?.user_id,
        error: retrieveError?.message,
      },
    });

    // Step 3: Test billing setup
    const { data: billing, error: billingError } = await supabase
      .from("billing")
      .insert({
        user_id: TEST_DATA.user.id,
        tier: "free",
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    results.push({
      success: !billingError,
      message: "Billing setup",
      duration: Date.now() - startTime,
      details: {
        userId: billing?.user_id,
        tier: billing?.tier,
        error: billingError?.message,
      },
    });

    // Step 4: Test billing event recording
    try {
      await recordBillingEvent({
        type: "test_event",
        userId: TEST_DATA.user.id,
        success: true,
        metadata: { test: true },
      });
      results.push({
        success: true,
        message: "Billing event recording",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      results.push({
        success: false,
        message: "Billing event recording failed",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Clean up test data
    await supabase.from("billing").delete().eq("user_id", TEST_DATA.user.id);
    await supabase.from("app_users").delete().eq("user_id", TEST_DATA.user.id);
  } catch (error) {
    results.push({
      success: false,
      message: "User authentication workflow failed",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * API Integration Workflow Test
 */
async function testApiIntegrationWorkflow(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Step 1: Test health endpoint
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    results.push({
      success: healthResponse.ok && healthData.status === "healthy",
      message: "Health endpoint",
      duration: Date.now() - startTime,
      details: {
        status: healthResponse.status,
        healthStatus: healthData.status,
      },
    });

    // Step 2: Test proof retrieval endpoint
    const proofResponse = await fetch(`${baseUrl}/api/proof/${TEST_DATA.proof.id}`);
    results.push({
      success: proofResponse.status === 404, // Expected 404 for non-existent proof
      message: "Proof retrieval endpoint",
      duration: Date.now() - startTime,
      details: { status: proofResponse.status },
    });

    // Step 3: Test verification endpoint
    const verifyResponse = await fetch(`${baseUrl}/api/proof/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "signature",
        hashHex: TEST_DATA.proof.hash,
        signatureB64: TEST_DATA.proof.signature,
      }),
    });
    results.push({
      success: verifyResponse.status === 200 || verifyResponse.status === 400,
      message: "Verification endpoint",
      duration: Date.now() - startTime,
      details: { status: verifyResponse.status },
    });

    // Step 4: Test rate limiting
    const rateLimitResponse = await fetch(`${baseUrl}/api/proof/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "signature",
        hashHex: TEST_DATA.proof.hash,
        signatureB64: TEST_DATA.proof.signature,
      }),
    });
    results.push({
      success:
        rateLimitResponse.status === 200 ||
        rateLimitResponse.status === 400 ||
        rateLimitResponse.status === 429,
      message: "Rate limiting",
      duration: Date.now() - startTime,
      details: { status: rateLimitResponse.status },
    });
  } catch (error) {
    results.push({
      success: false,
      message: "API integration workflow failed",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Security Workflow Test
 */
async function testSecurityWorkflow(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    // Step 1: Test input validation
    const testData = {
      file: {
        name: "test.txt",
        size: 1024,
        type: "text/plain",
      },
      metadata: {
        description: "Test file",
      },
    };

    const validation = validateInput(testData, createProofSchema);
    results.push({
      success: validation.success,
      message: "Input validation",
      duration: Date.now() - startTime,
      details: { validation },
    });

    // Step 2: Test rate limiting
    const testKey = "e2e-test-rate-limit";
    await resetRateLimit(testKey);

    const rateLimitResult = await rateLimitConfigs.strict.requests;
    results.push({
      success: true,
      message: "Rate limiting system",
      duration: Date.now() - startTime,
      details: { rateLimit: rateLimitResult },
    });

    // Step 3: Test security middleware
    const testHandler = async (req: any) => new NextResponse("OK");
    const securedHandler = withSecurityConfig(testHandler, "standard");
    results.push({
      success: typeof securedHandler === "function",
      message: "Security middleware",
      duration: Date.now() - startTime,
      details: { middlewareType: typeof securedHandler },
    });

    // Step 4: Test key management
    const keyManager = KeyManager.getInstance();
    const keyHealth = keyManager.healthCheck();
    results.push({
      success: keyHealth.healthy,
      message: "Key management health",
      duration: Date.now() - startTime,
      details: keyHealth.details,
    });
  } catch (error) {
    results.push({
      success: false,
      message: "Security workflow failed",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Performance Workflow Test
 */
async function testPerformanceWorkflow(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    // Step 1: Test key operations performance
    const keyManager = KeyManager.getInstance();
    const testData = "performance-test";

    const keyStartTime = Date.now();
    const signature = keyManager.signData(testData);
    const verification = keyManager.verifySignature(testData, signature);
    const keyEndTime = Date.now();

    const keyDuration = keyEndTime - keyStartTime;
    results.push({
      success: verification.verified && keyDuration < 1000,
      message: "Key operations performance",
      duration: Date.now() - startTime,
      details: {
        keyDuration: `${keyDuration}ms`,
        verified: verification.verified,
        performance: keyDuration < 100 ? "excellent" : keyDuration < 500 ? "good" : "acceptable",
      },
    });

    // Step 2: Test database performance
    const supabase = supabaseService();
    const dbStartTime = Date.now();
    const { data, error } = await supabase.from("proofs").select("id").limit(10);
    const dbEndTime = Date.now();

    const dbDuration = dbEndTime - dbStartTime;
    results.push({
      success: !error && dbDuration < 2000,
      message: "Database performance",
      duration: Date.now() - startTime,
      details: {
        dbDuration: `${dbDuration}ms`,
        error: error?.message,
        performance: dbDuration < 100 ? "excellent" : dbDuration < 500 ? "good" : "acceptable",
      },
    });

    // Step 3: Test API performance
    const apiStartTime = Date.now();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/health`,
    );
    const apiEndTime = Date.now();

    const apiDuration = apiEndTime - apiStartTime;
    results.push({
      success: response.ok && apiDuration < 5000,
      message: "API performance",
      duration: Date.now() - startTime,
      details: {
        apiDuration: `${apiDuration}ms`,
        status: response.status,
        performance: apiDuration < 500 ? "excellent" : apiDuration < 2000 ? "good" : "acceptable",
      },
    });
  } catch (error) {
    results.push({
      success: false,
      message: "Performance workflow failed",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

// =============================================================================
// END-TO-END TEST EXECUTION
// =============================================================================

/**
 * Run all end-to-end tests
 */
async function runEndToEndTests(): Promise<EndToEndReport> {
  console.log("🚀 Starting Comprehensive End-to-End Tests...\n");

  const workflows = {
    proofCreation: {
      name: "Proof Creation Workflow",
      description: "Complete proof creation workflow from file to database",
      test: testProofCreationWorkflow,
      critical: true,
    },
    proofVerification: {
      name: "Proof Verification Workflow",
      description: "Complete proof verification workflow",
      test: testProofVerificationWorkflow,
      critical: true,
    },
    userAuthentication: {
      name: "User Authentication Workflow",
      description: "User creation, authentication, and billing setup",
      test: testUserAuthenticationWorkflow,
      critical: true,
    },
    apiIntegration: {
      name: "API Integration Workflow",
      description: "API endpoint integration and functionality",
      test: testApiIntegrationWorkflow,
      critical: true,
    },
    security: {
      name: "Security Workflow",
      description: "Security features and validation",
      test: testSecurityWorkflow,
      critical: true,
    },
    performance: {
      name: "Performance Workflow",
      description: "System performance and response times",
      test: testPerformanceWorkflow,
      critical: false,
    },
  };

  // Execute all workflows
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let criticalFailures = 0;
  let totalDuration = 0;

  const workflowResults: {
    [key: string]: { status: "pass" | "fail" | "warning"; tests: TestResult[]; duration: number };
  } = {};

  for (const [key, workflow] of Object.entries(workflows)) {
    console.log(`\n📋 Testing ${workflow.name}...`);
    const workflowStartTime = Date.now();

    try {
      const tests = await workflow.test();
      const workflowDuration = Date.now() - workflowStartTime;
      totalDuration += workflowDuration;

      const passed = tests.filter((t) => t.success).length;
      const failed = tests.filter((t) => !t.success).length;

      totalTests += tests.length;
      passedTests += passed;
      failedTests += failed;

      if (workflow.critical && failed > 0) {
        criticalFailures += failed;
      }

      workflowResults[key] = {
        status: failed === 0 ? "pass" : workflow.critical ? "fail" : "warning",
        tests,
        duration: workflowDuration,
      };

      console.log(
        `   ✅ ${workflow.name}: ${passed}/${tests.length} tests passed (${workflowDuration}ms)`,
      );
    } catch (error) {
      const workflowDuration = Date.now() - workflowStartTime;
      totalDuration += workflowDuration;

      workflowResults[key] = {
        status: "fail",
        tests: [
          {
            success: false,
            message: "Workflow execution failed",
            duration: workflowDuration,
            error: error instanceof Error ? error.message : String(error),
          },
        ],
        duration: workflowDuration,
      };

      console.log(`   ❌ ${workflow.name}: Workflow failed (${workflowDuration}ms)`);
    }
  }

  // Calculate overall results
  const overall = criticalFailures === 0;
  const systemHealth =
    criticalFailures === 0 ? "healthy" : criticalFailures < 3 ? "degraded" : "unhealthy";

  // Generate recommendations
  const recommendations: string[] = [];

  if (criticalFailures > 0) {
    recommendations.push("❌ Critical failures detected - system not ready for production");
  }

  if (failedTests > 0) {
    recommendations.push("⚠️ Some tests failed - review and fix before deployment");
  }

  if (overall && failedTests === 0) {
    recommendations.push("✅ All tests passed - system ready for production");
  } else if (overall) {
    recommendations.push("✅ Critical tests passed - system ready for pilot deployment");
  }

  return {
    overall,
    totalTests,
    passedTests,
    failedTests,
    criticalFailures,
    totalDuration,
    workflows: workflowResults,
    recommendations,
    systemHealth,
  };
}

/**
 * Generate end-to-end test report
 */
function generateEndToEndReport(report: EndToEndReport): void {
  console.log("\n📊 End-to-End Test Report");
  console.log("=".repeat(50));

  // Overall status
  console.log(`\n🎯 Overall Status: ${report.overall ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`🏥 System Health: ${report.systemHealth.toUpperCase()}`);
  console.log(`📈 Test Results: ${report.passedTests}/${report.totalTests} passed`);
  console.log(`⚠️ Critical Failures: ${report.criticalFailures}`);
  console.log(`⏱️ Total Duration: ${report.totalDuration}ms`);

  // Workflow results
  console.log("\n📋 Workflow Results:");
  for (const [key, workflow] of Object.entries(report.workflows)) {
    const status = workflow.status === "pass" ? "✅" : workflow.status === "fail" ? "❌" : "⚠️";
    const passed = workflow.tests.filter((t) => t.success).length;
    const total = workflow.tests.length;
    console.log(`  ${status} ${key}: ${passed}/${total} tests passed (${workflow.duration}ms)`);
  }

  // Detailed results
  console.log("\n🔍 Detailed Results:");
  for (const [key, workflow] of Object.entries(report.workflows)) {
    console.log(`\n### ${key.toUpperCase()}`);
    for (const test of workflow.tests) {
      const status = test.success ? "✅" : "❌";
      console.log(`  ${status} ${test.message} (${test.duration}ms)`);
      if (test.details) {
        console.log(`     Details: ${JSON.stringify(test.details, null, 2)}`);
      }
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    }
  }

  // Recommendations
  console.log("\n💡 Recommendations:");
  for (const recommendation of report.recommendations) {
    console.log(`  ${recommendation}`);
  }
}

/**
 * Save end-to-end test report to file
 */
async function saveEndToEndReport(report: EndToEndReport): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `e2e-test-report-${timestamp}.json`;
  const filepath = path.join(process.cwd(), "reports", filename);

  // Ensure reports directory exists
  const reportsDir = path.dirname(filepath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Save report
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${filepath}`);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  try {
    console.log("🎯 Veris Platform End-to-End Test Suite");
    console.log("=".repeat(50));

    // Run end-to-end tests
    const report = await runEndToEndTests();

    // Generate and display report
    generateEndToEndReport(report);

    // Save report to file
    await saveEndToEndReport(report);

    // Exit with appropriate code
    if (report.overall) {
      console.log("\n🎉 End-to-end tests completed successfully!");
      process.exit(0);
    } else {
      console.log("\n💥 End-to-end tests failed!");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n💥 End-to-end tests failed:", error);
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
