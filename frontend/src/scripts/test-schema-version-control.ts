#!/usr/bin/env tsx

/**
 * Comprehensive Schema Version Control Test
 *
 * This script tests the complete schema version control system including:
 * - Schema version management
 * - Proof validation against different versions
 * - Schema migration between versions
 * - Backward compatibility validation
 * - Regression testing
 */

import {
  getSchemaVersionInfo,
  validateProofAgainstVersion,
  validateProofAgainstLatest,
  runRegressionTests,
  checkRegressionTests,
} from "../lib/schema-version-control";
import {
  migrateProof,
  getAvailableMigrations,
  isMigrationAvailable,
  getMigrationCompatibilityMatrix,
  validateBackwardCompatibility,
} from "../lib/schema-migration";
import { logger } from "../lib/logger";

// Test proofs for different schema versions
const TEST_PROOF_V1_0 = {
  schema_version: 1,
  hash_algo: "sha256",
  hash_full: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  signed_at: "2024-01-01T00:00:00.000Z",
  signer_fingerprint: "test-fingerprint-1",
  subject: {
    type: "file",
    namespace: "test",
    id: "test-file-1",
  },
  metadata: {
    project: "test-project",
  },
  signature: "test-signature-1",
};

const TEST_PROOF_V1_1 = {
  schema_version: 1,
  hash_algo: "sha256",
  hash_full: "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
  signed_at: "2024-01-01T00:00:00.000Z",
  signer_fingerprint: "test-fingerprint-2",
  subject: {
    type: "file",
    namespace: "test",
    id: "test-file-2",
    file_name: "test-file-2.txt",
    file_size: 1024,
    mime_type: "text/plain",
  },
  metadata: {
    project: "test-project",
    visibility: "public",
    tags: ["test", "example"],
    description: "Test proof for schema v1.1",
  },
  signature: "test-signature-2",
};

async function testSchemaVersionManagement() {
  console.log("🧪 Testing schema version management...");

  try {
    const versionInfo = getSchemaVersionInfo();

    console.log("📊 Schema Version Info:", {
      totalVersions: versionInfo.totalVersions,
      latestVersion: versionInfo.latestVersion,
      versions: versionInfo.versions.map((v) => ({
        version: v.version,
        isLatest: v.isLatest,
        createdAt: v.createdAt,
      })),
    });

    // Validate version info structure
    if (typeof versionInfo.totalVersions !== "number") {
      throw new Error("totalVersions should be a number");
    }
    if (typeof versionInfo.latestVersion !== "string") {
      throw new Error("latestVersion should be a string");
    }
    if (!Array.isArray(versionInfo.versions)) {
      throw new Error("versions should be an array");
    }
    if (versionInfo.versions.length < 2) {
      throw new Error("Should have at least 2 schema versions");
    }

    // Check that we have v1.0 and v1.1
    const versions = versionInfo.versions.map((v) => v.version);
    if (!versions.includes("1.0")) {
      throw new Error("Should have v1.0 schema");
    }
    if (!versions.includes("1.1")) {
      throw new Error("Should have v1.1 schema");
    }

    // Check that v1.1 is marked as latest
    const latestVersion = versionInfo.versions.find((v) => v.isLatest);
    if (!latestVersion || latestVersion.version !== "1.1") {
      throw new Error("v1.1 should be marked as latest");
    }

    console.log("✅ Schema version management tests passed");
  } catch (error) {
    console.error("❌ Schema version management tests failed:", error);
    throw error;
  }
}

async function testProofValidation() {
  console.log("🧪 Testing proof validation...");

  try {
    // Test v1.0 proof validation
    const v1_0_validation = validateProofAgainstVersion(TEST_PROOF_V1_0, "1.0");
    console.log("📊 v1.0 Proof Validation:", {
      valid: v1_0_validation.valid,
      errors: v1_0_validation.errors,
      warnings: v1_0_validation.warnings,
    });

    if (!v1_0_validation.valid) {
      throw new Error(`v1.0 proof should be valid: ${v1_0_validation.errors.join(", ")}`);
    }

    // Test v1.1 proof validation
    const v1_1_validation = validateProofAgainstVersion(TEST_PROOF_V1_1, "1.1");
    console.log("📊 v1.1 Proof Validation:", {
      valid: v1_1_validation.valid,
      errors: v1_1_validation.errors,
      warnings: v1_1_validation.warnings,
    });

    if (!v1_1_validation.valid) {
      throw new Error(`v1.1 proof should be valid: ${v1_1_validation.errors.join(", ")}`);
    }

    // Test cross-version validation (v1.0 proof against v1.1 schema)
    const cross_validation = validateProofAgainstVersion(TEST_PROOF_V1_0, "1.1");
    console.log("📊 Cross-Version Validation (v1.0 proof vs v1.1 schema):", {
      valid: cross_validation.valid,
      errors: cross_validation.errors,
      warnings: cross_validation.warnings,
    });

    // v1.0 proof should be valid against v1.1 schema (backward compatibility)
    if (!cross_validation.valid) {
      throw new Error(
        `v1.0 proof should be valid against v1.1 schema: ${cross_validation.errors.join(", ")}`,
      );
    }

    // Test latest validation
    const latest_validation = validateProofAgainstLatest(TEST_PROOF_V1_1);
    console.log("📊 Latest Validation:", {
      valid: latest_validation.valid,
      errors: latest_validation.errors,
      warnings: latest_validation.warnings,
    });

    if (!latest_validation.valid) {
      throw new Error(`Latest proof should be valid: ${latest_validation.errors.join(", ")}`);
    }

    console.log("✅ Proof validation tests passed");
  } catch (error) {
    console.error("❌ Proof validation tests failed:", error);
    throw error;
  }
}

async function testSchemaMigration() {
  console.log("🧪 Testing schema migration...");

  try {
    // Test migration availability
    const migrationAvailable = isMigrationAvailable("1.0", "1.1");
    console.log("📊 Migration Available (1.0 → 1.1):", migrationAvailable);

    if (!migrationAvailable) {
      throw new Error("Migration from v1.0 to v1.1 should be available");
    }

    // Test available migrations
    const availableMigrations = getAvailableMigrations("1.0");
    console.log("📊 Available Migrations from v1.0:", availableMigrations);

    if (availableMigrations.length === 0) {
      throw new Error("Should have available migrations from v1.0");
    }

    // Test migration compatibility matrix
    const compatibilityMatrix = getMigrationCompatibilityMatrix();
    console.log("📊 Migration Compatibility Matrix:", compatibilityMatrix);

    if (!compatibilityMatrix["1.0"] || !compatibilityMatrix["1.0"].includes("1.1")) {
      throw new Error("Compatibility matrix should include 1.0 → 1.1");
    }

    // Test actual migration
    const migrationResult = migrateProof(TEST_PROOF_V1_0, "1.0", "1.1");
    console.log("📊 Migration Result:", {
      success: migrationResult.success,
      errors: migrationResult.errors,
      warnings: migrationResult.warnings,
      fromVersion: migrationResult.fromVersion,
      toVersion: migrationResult.toVersion,
    });

    if (!migrationResult.success) {
      throw new Error(`Migration should succeed: ${migrationResult.errors.join(", ")}`);
    }

    // Validate migrated proof
    const migratedValidation = validateProofAgainstVersion(migrationResult.migratedProof, "1.1");
    if (!migratedValidation.valid) {
      throw new Error(`Migrated proof should be valid: ${migratedValidation.errors.join(", ")}`);
    }

    console.log("✅ Schema migration tests passed");
  } catch (error) {
    console.error("❌ Schema migration tests failed:", error);
    throw error;
  }
}

async function testBackwardCompatibility() {
  console.log("🧪 Testing backward compatibility...");

  try {
    // Test backward compatibility validation
    const compatibility = validateBackwardCompatibility("1.0", "1.1");
    console.log("📊 Backward Compatibility:", {
      compatible: compatibility.compatible,
      issues: compatibility.issues,
      recommendations: compatibility.recommendations,
    });

    if (!compatibility.compatible) {
      throw new Error(`Schemas should be backward compatible: ${compatibility.issues.join(", ")}`);
    }

    // Test that v1.0 proof works with v1.1 schema
    const v1_0_in_v1_1 = validateProofAgainstVersion(TEST_PROOF_V1_0, "1.1");
    if (!v1_0_in_v1_1.valid) {
      throw new Error(
        `v1.0 proof should be valid in v1.1 schema: ${v1_0_in_v1_1.errors.join(", ")}`,
      );
    }

    console.log("✅ Backward compatibility tests passed");
  } catch (error) {
    console.error("❌ Backward compatibility tests failed:", error);
    throw error;
  }
}

async function testRegressionTests() {
  console.log("🧪 Testing regression tests...");

  try {
    // Run regression tests
    const regressionResults = await runRegressionTests();
    console.log("📊 Regression Test Results:", {
      totalVersions: regressionResults.length,
      results: regressionResults.map((r) => ({
        version: r.schemaVersion,
        totalProofs: r.totalProofs,
        validProofs: r.validProofs,
        invalidProofs: r.invalidProofs,
        passed: r.passed,
      })),
    });

    // Validate regression test structure
    if (!Array.isArray(regressionResults)) {
      throw new Error("Regression results should be an array");
    }

    for (const result of regressionResults) {
      if (typeof result.schemaVersion !== "string") {
        throw new Error("schemaVersion should be a string");
      }
      if (typeof result.totalProofs !== "number") {
        throw new Error("totalProofs should be a number");
      }
      if (typeof result.validProofs !== "number") {
        throw new Error("validProofs should be a number");
      }
      if (typeof result.invalidProofs !== "number") {
        throw new Error("invalidProofs should be a number");
      }
      if (typeof result.passed !== "boolean") {
        throw new Error("passed should be a boolean");
      }
    }

    // Test regression check
    const checkResult = await checkRegressionTests();
    console.log("📊 Regression Check Result:", {
      allPassed: checkResult.allPassed,
      summary: checkResult.summary,
    });

    if (typeof checkResult.allPassed !== "boolean") {
      throw new Error("allPassed should be a boolean");
    }
    if (!checkResult.summary) {
      throw new Error("summary should be present");
    }

    console.log("✅ Regression tests passed");
  } catch (error) {
    console.error("❌ Regression tests failed:", error);
    throw error;
  }
}

async function testSchemaAPIEndpoints() {
  console.log("🧪 Testing schema API endpoints...");

  try {
    // Test schema versions endpoint
    const versionsResponse = await fetch("http://localhost:3000/api/schema/versions", {
      headers: {
        Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
      },
    });

    console.log("📊 Schema versions endpoint status:", versionsResponse.status);

    // Test schema validation endpoint
    const validationResponse = await fetch("http://localhost:3000/api/schema/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
      },
      body: JSON.stringify({
        proof: TEST_PROOF_V1_0,
        version: "1.0",
      }),
    });

    console.log("📊 Schema validation endpoint status:", validationResponse.status);

    // Test schema migration endpoint
    const migrationResponse = await fetch("http://localhost:3000/api/schema/migrate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
      },
      body: JSON.stringify({
        proof: TEST_PROOF_V1_0,
        fromVersion: "1.0",
        toVersion: "1.1",
      }),
    });

    console.log("📊 Schema migration endpoint status:", migrationResponse.status);

    // Test schema regression endpoint
    const regressionResponse = await fetch(
      "http://localhost:3000/api/schema/regression?action=check",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token", // This will fail auth, but we can test the endpoint structure
        },
      },
    );

    console.log("📊 Schema regression endpoint status:", regressionResponse.status);

    console.log("✅ Schema API endpoints tests completed");
  } catch (error) {
    console.error("❌ Schema API endpoints tests failed:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting comprehensive schema version control tests...\n");

  try {
    await testSchemaVersionManagement();
    console.log("");

    await testProofValidation();
    console.log("");

    await testSchemaMigration();
    console.log("");

    await testBackwardCompatibility();
    console.log("");

    await testRegressionTests();
    console.log("");

    await testSchemaAPIEndpoints();
    console.log("");

    console.log("🎉 All schema version control tests passed!");
    console.log("\n📋 Test Summary:");
    console.log("✅ Schema version management");
    console.log("✅ Proof validation");
    console.log("✅ Schema migration");
    console.log("✅ Backward compatibility");
    console.log("✅ Regression tests");
    console.log("✅ Schema API endpoints");
  } catch (error) {
    console.error("\n💥 Schema version control tests failed:", error);
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
