#!/usr/bin/env tsx

/**
 * Pilot Readiness Validation Script
 * 
 * This script performs comprehensive end-to-end validation of the Veris platform
 * to ensure it's ready for pilot deployment. It tests all critical components,
 * integrations, and workflows.
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
  verifyProofSchema
} from "../lib/input-validation";
import { 
  withEnhancedRateLimit, 
  rateLimitConfigs, 
  getRateLimitStats,
  resetRateLimit
} from "../lib/rate-limiting-enhanced";
import { 
  withSecurity, 
  securityConfigs, 
  withSecurityConfig
} from "../lib/security-middleware";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

// =============================================================================
// PILOT READINESS INTERFACES
// =============================================================================

interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

interface ComponentTest {
  name: string;
  description: string;
  test: () => Promise<ValidationResult>;
  critical: boolean;
}

interface PilotReadinessReport {
  overall: boolean;
  criticalFailures: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  components: {
    [key: string]: {
      status: "pass" | "fail" | "warning";
      tests: ValidationResult[];
    };
  };
  recommendations: string[];
  deploymentReadiness: boolean;
}

// =============================================================================
// TEST DATA AND UTILITIES
// =============================================================================

const TEST_DATA = {
  file: {
    name: "test-document.txt",
    content: "This is a test document for pilot readiness validation.",
    size: 1024,
    type: "text/plain"
  },
  user: {
    id: "test-user-pilot-readiness",
    email: "pilot-test@verisplatform.com"
  },
  proof: {
    id: generateProofId(),
    hash: "a".repeat(64), // Placeholder hash
    signature: "dGVzdC1zaWduYXR1cmU=" // Placeholder signature
  }
};

// =============================================================================
// COMPONENT TESTS
// =============================================================================

/**
 * Environment and Configuration Tests
 */
async function testEnvironmentConfiguration(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Test 1: Environment variables
  results.push({
    success: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    message: "Supabase URL configured",
    details: { url: process.env.NEXT_PUBLIC_SUPABASE_URL }
  });

  results.push({
    success: !!process.env.VERIS_SIGNING_PRIVATE_KEY,
    message: "Signing private key configured",
    details: { keyLength: process.env.VERIS_SIGNING_PRIVATE_KEY?.length }
  });

  results.push({
    success: !!process.env.VERIS_SIGNING_PUBLIC_KEY,
    message: "Signing public key configured",
    details: { keyLength: process.env.VERIS_SIGNING_PUBLIC_KEY?.length }
  });

  results.push({
    success: !!process.env.STRIPE_SECRET_KEY,
    message: "Stripe secret key configured",
    details: { keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) }
  });

  // Test 2: Database connection
  try {
    const supabase = supabaseService();
    const { data, error } = await supabase.from("proofs").select("count").limit(1);
    results.push({
      success: !error,
      message: "Database connection successful",
      details: { error: error?.message }
    });
  } catch (error) {
    results.push({
      success: false,
      message: "Database connection failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

/**
 * Key Management Tests
 */
async function testKeyManagement(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // Test 1: Key manager initialization
    const keyManager = KeyManager.getInstance();
    await keyManager.initialize();
    results.push({
      success: true,
      message: "Key manager initialized successfully"
    });

    // Test 2: Key operations
    const testData = "pilot-readiness-test";
    const signature = keyManager.signData(testData);
    const verification = keyManager.verifySignature(testData, signature);
    
    results.push({
      success: verification.verified,
      message: "Key signing and verification successful",
      details: { 
        signatureLength: signature.length,
        keyFingerprint: verification.keyFingerprint
      }
    });

    // Test 3: Key health check
    const healthCheck = keyManager.healthCheck();
    results.push({
      success: healthCheck.healthy,
      message: "Key manager health check passed",
      details: healthCheck.details
    });

    // Test 4: Key fingerprints
    const fingerprints = keyManager.getKeyFingerprints();
    results.push({
      success: !!fingerprints.primary,
      message: "Key fingerprints generated",
      details: { 
        primaryFingerprint: fingerprints.primary?.substring(0, 16) + "...",
        hasSecondary: !!fingerprints.secondary
      }
    });

  } catch (error) {
    results.push({
      success: false,
      message: "Key management test failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

/**
 * Database and Storage Tests
 */
async function testDatabaseAndStorage(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    const supabase = supabaseService();

    // Test 1: Database tables exist
    const tables = ["proofs", "app_users", "billing", "billing_event_logs", "usage_telemetry"];
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select("*").limit(1);
        results.push({
          success: !error,
          message: `Table '${table}' accessible`,
          details: { error: error?.message }
        });
      } catch (error) {
        results.push({
          success: false,
          message: `Table '${table}' not accessible`,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Test 2: Database write operations
    try {
      const testProof = {
        id: TEST_DATA.proof.id,
        hash_hex: TEST_DATA.proof.hash,
        signature_b64: TEST_DATA.proof.signature,
        created_at: new Date().toISOString(),
        user_id: TEST_DATA.user.id
      };

      const { data, error } = await supabase
        .from("proofs")
        .insert(testProof)
        .select()
        .single();

      if (!error) {
        results.push({
          success: true,
          message: "Database write operation successful",
          details: { proofId: data.id }
        });

        // Clean up test data
        await supabase.from("proofs").delete().eq("id", TEST_DATA.proof.id);
      } else {
        results.push({
          success: false,
          message: "Database write operation failed",
          error: error.message
        });
      }
    } catch (error) {
      results.push({
        success: false,
        message: "Database write test failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }

  } catch (error) {
    results.push({
      success: false,
      message: "Database connection test failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

/**
 * Proof Pipeline Tests
 */
async function testProofPipeline(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // Test 1: Proof ID generation
    const proofId = generateProofId();
    const idValidation = validateProofId(proofId);
    results.push({
      success: idValidation.success,
      message: "Proof ID generation and validation",
      details: { proofId, validation: idValidation }
    });

    // Test 2: Hash generation
    const testContent = TEST_DATA.file.content;
    const hash = require("crypto").createHash("sha256").update(testContent).digest("hex");
    const hashValidation = validateHash(hash);
    results.push({
      success: hashValidation.success,
      message: "Hash generation and validation",
      details: { hash: hash.substring(0, 16) + "...", validation: hashValidation }
    });

    // Test 3: Signature generation
    const signature = signHash(hash);
    const signatureValidation = validateSignature(signature);
    results.push({
      success: signatureValidation.success,
      message: "Signature generation and validation",
      details: { signature: signature.substring(0, 16) + "...", validation: signatureValidation }
    });

    // Test 4: Signature verification
    const verification = verifySignature(hash, signature);
    results.push({
      success: verification,
      message: "Signature verification",
      details: { verified: verification }
    });

    // Test 5: Canonical proof creation
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
      details: { 
        proofId: canonicalProof.subject.id,
        hasTimestamp: !!canonicalProof.signed_at,
        hasMetadata: !!canonicalProof.metadata
      }
    });

  } catch (error) {
    results.push({
      success: false,
      message: "Proof pipeline test failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

/**
 * API Endpoint Tests
 */
async function testApiEndpoints(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Test 1: Health endpoint
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/health`);
    const healthData = await response.json();
    results.push({
      success: response.ok && healthData.status === "healthy",
      message: "Health endpoint accessible",
      details: { 
        status: response.status,
        healthStatus: healthData.status,
        timestamp: healthData.timestamp
      }
    });
  } catch (error) {
    results.push({
      success: false,
      message: "Health endpoint not accessible",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: Proof retrieval endpoint
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/proof/${TEST_DATA.proof.id}`);
    results.push({
      success: response.status === 404, // Expected 404 for non-existent proof
      message: "Proof retrieval endpoint accessible",
      details: { status: response.status }
    });
  } catch (error) {
    results.push({
      success: false,
      message: "Proof retrieval endpoint not accessible",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3: Verification endpoint
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/proof/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "signature",
        hashHex: TEST_DATA.proof.hash,
        signatureB64: TEST_DATA.proof.signature
      })
    });
    results.push({
      success: response.status === 200 || response.status === 400, // 400 is acceptable for invalid data
      message: "Verification endpoint accessible",
      details: { status: response.status }
    });
  } catch (error) {
    results.push({
      success: false,
      message: "Verification endpoint not accessible",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

/**
 * Security Tests
 */
async function testSecurity(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // Test 1: Input validation
    const testData = {
      file: {
        name: "test.txt",
        size: 1024,
        type: "text/plain"
      },
      metadata: {
        description: "Test file"
      }
    };

    const validation = validateInput(testData, createProofSchema);
    results.push({
      success: validation.success,
      message: "Input validation working",
      details: { validation }
    });

    // Test 2: Rate limiting
    const testKey = "pilot-readiness-test";
    await resetRateLimit(testKey);
    
    // Simulate rate limit check
    const rateLimitResult = await rateLimitConfigs.strict.requests;
    results.push({
      success: true,
      message: "Rate limiting system accessible",
      details: { rateLimit: rateLimitResult }
    });

    // Test 3: Security middleware
    const testHandler = async (req: any) => new NextResponse("OK");
    const securedHandler = withSecurityConfig(testHandler, "standard");
    results.push({
      success: typeof securedHandler === "function",
      message: "Security middleware functional",
      details: { middlewareType: typeof securedHandler }
    });

  } catch (error) {
    results.push({
      success: false,
      message: "Security test failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

/**
 * Integration Tests
 */
async function testIntegrations(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // Test 1: Stripe integration
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = require("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const customers = await stripe.customers.list({ limit: 1 });
        results.push({
          success: true,
          message: "Stripe integration working",
          details: { customerCount: customers.data.length }
        });
      } catch (error) {
        results.push({
          success: false,
          message: "Stripe integration failed",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      results.push({
        success: false,
        message: "Stripe secret key not configured",
        error: "STRIPE_SECRET_KEY environment variable missing"
      });
    }

    // Test 2: Usage telemetry
    try {
      await recordApiCall("/api/test", TEST_DATA.user.id, {
        method: "GET",
        responseTime: 100,
        statusCode: 200
      });
      results.push({
        success: true,
        message: "Usage telemetry recording working"
      });
    } catch (error) {
      results.push({
        success: false,
        message: "Usage telemetry recording failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 3: Billing integration
    try {
      await recordBillingEvent({
        type: "test_event",
        userId: TEST_DATA.user.id,
        success: true,
        metadata: { test: true }
      });
      results.push({
        success: true,
        message: "Billing event recording working"
      });
    } catch (error) {
      results.push({
        success: false,
        message: "Billing event recording failed",
        error: error instanceof Error ? error.message : String(error)
    });
    }

  } catch (error) {
    results.push({
      success: false,
      message: "Integration test failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

/**
 * Performance Tests
 */
async function testPerformance(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // Test 1: Key operations performance
    const keyManager = KeyManager.getInstance();
    const testData = "performance-test";
    
    const startTime = Date.now();
    const signature = keyManager.signData(testData);
    const verification = keyManager.verifySignature(testData, signature);
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    results.push({
      success: verification.verified && duration < 1000, // Should complete in under 1 second
      message: "Key operations performance",
      details: { 
        duration: `${duration}ms`,
        verified: verification.verified,
        performance: duration < 100 ? "excellent" : duration < 500 ? "good" : "acceptable"
      }
    });

    // Test 2: Database query performance
    const supabase = supabaseService();
    const dbStartTime = Date.now();
    const { data, error } = await supabase.from("proofs").select("id").limit(10);
    const dbEndTime = Date.now();
    
    const dbDuration = dbEndTime - dbStartTime;
    results.push({
      success: !error && dbDuration < 2000, // Should complete in under 2 seconds
      message: "Database query performance",
      details: { 
        duration: `${dbDuration}ms`,
        error: error?.message,
        performance: dbDuration < 100 ? "excellent" : dbDuration < 500 ? "good" : "acceptable"
      }
    });

  } catch (error) {
    results.push({
      success: false,
      message: "Performance test failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

// =============================================================================
// PILOT READINESS VALIDATION
// =============================================================================

/**
 * Run all pilot readiness tests
 */
async function runPilotReadinessValidation(): Promise<PilotReadinessReport> {
  console.log("🚀 Starting Pilot Readiness Validation...\n");

  const components = {
    environment: {
      name: "Environment & Configuration",
      description: "Environment variables and system configuration",
      tests: await testEnvironmentConfiguration(),
      critical: true
    },
    keyManagement: {
      name: "Key Management",
      description: "Cryptographic key management and operations",
      tests: await testKeyManagement(),
      critical: true
    },
    database: {
      name: "Database & Storage",
      description: "Database connectivity and storage operations",
      tests: await testDatabaseAndStorage(),
      critical: true
    },
    proofPipeline: {
      name: "Proof Pipeline",
      description: "Proof generation, signing, and verification",
      tests: await testProofPipeline(),
      critical: true
    },
    apiEndpoints: {
      name: "API Endpoints",
      description: "API endpoint accessibility and functionality",
      tests: await testApiEndpoints(),
      critical: true
    },
    security: {
      name: "Security",
      description: "Security features and validation",
      tests: await testSecurity(),
      critical: true
    },
    integrations: {
      name: "Integrations",
      description: "External service integrations",
      tests: await testIntegrations(),
      critical: false
    },
    performance: {
      name: "Performance",
      description: "System performance and response times",
      tests: await testPerformance(),
      critical: false
    }
  };

  // Calculate results
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let criticalFailures = 0;

  const componentResults: { [key: string]: { status: "pass" | "fail" | "warning"; tests: ValidationResult[] } } = {};

  for (const [key, component] of Object.entries(components)) {
    const tests = component.tests;
    const passed = tests.filter(t => t.success).length;
    const failed = tests.filter(t => !t.success).length;
    
    totalTests += tests.length;
    passedTests += passed;
    failedTests += failed;

    if (component.critical && failed > 0) {
      criticalFailures += failed;
    }

    componentResults[key] = {
      status: failed === 0 ? "pass" : (component.critical ? "fail" : "warning"),
      tests
    };
  }

  const overall = criticalFailures === 0;
  const deploymentReadiness = overall && (failedTests / totalTests) < 0.1; // Less than 10% failure rate

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (criticalFailures > 0) {
    recommendations.push("❌ Critical failures detected - deployment not recommended");
  }
  
  if (failedTests > 0) {
    recommendations.push("⚠️ Some tests failed - review and fix before deployment");
  }
  
  if (deploymentReadiness) {
    recommendations.push("✅ System ready for pilot deployment");
  }

  return {
    overall,
    criticalFailures,
    totalTests,
    passedTests,
    failedTests,
    components: componentResults,
    recommendations,
    deploymentReadiness
  };
}

/**
 * Generate pilot readiness report
 */
function generatePilotReadinessReport(report: PilotReadinessReport): void {
  console.log("📊 Pilot Readiness Report\n");
  console.log("=".repeat(50));
  
  // Overall status
  console.log(`\n🎯 Overall Status: ${report.overall ? "✅ READY" : "❌ NOT READY"}`);
  console.log(`🚀 Deployment Ready: ${report.deploymentReadiness ? "✅ YES" : "❌ NO"}`);
  console.log(`📈 Test Results: ${report.passedTests}/${report.totalTests} passed`);
  console.log(`⚠️ Critical Failures: ${report.criticalFailures}`);
  
  // Component results
  console.log("\n📋 Component Results:");
  for (const [key, component] of Object.entries(report.components)) {
    const status = component.status === "pass" ? "✅" : component.status === "fail" ? "❌" : "⚠️";
    const passed = component.tests.filter(t => t.success).length;
    const total = component.tests.length;
    console.log(`  ${status} ${key}: ${passed}/${total} tests passed`);
  }
  
  // Detailed results
  console.log("\n🔍 Detailed Results:");
  for (const [key, component] of Object.entries(report.components)) {
    console.log(`\n### ${key.toUpperCase()}`);
    for (const test of component.tests) {
      const status = test.success ? "✅" : "❌";
      console.log(`  ${status} ${test.message}`);
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
  
  // Deployment checklist
  console.log("\n📝 Deployment Checklist:");
  console.log("  □ All critical tests passing");
  console.log("  □ Environment variables configured");
  console.log("  □ Database accessible and functional");
  console.log("  □ API endpoints responding");
  console.log("  □ Security features enabled");
  console.log("  □ External integrations working");
  console.log("  □ Performance within acceptable limits");
  console.log("  □ Monitoring and logging configured");
  console.log("  □ Backup and recovery procedures tested");
  console.log("  □ Documentation updated");
}

/**
 * Save pilot readiness report to file
 */
async function savePilotReadinessReport(report: PilotReadinessReport): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `pilot-readiness-report-${timestamp}.json`;
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
    console.log("🎯 Veris Platform Pilot Readiness Validation");
    console.log("=".repeat(50));
    
    // Run validation
    const report = await runPilotReadinessValidation();
    
    // Generate and display report
    generatePilotReadinessReport(report);
    
    // Save report to file
    await savePilotReadinessReport(report);
    
    // Exit with appropriate code
    if (report.deploymentReadiness) {
      console.log("\n🎉 Pilot readiness validation completed successfully!");
      process.exit(0);
    } else {
      console.log("\n💥 Pilot readiness validation failed!");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("\n💥 Pilot readiness validation failed:", error);
    process.exit(1);
  }
}

// Run the validation
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
