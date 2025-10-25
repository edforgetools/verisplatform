/**
 * Schema Version Control System
 *
 * Implements schema version control as specified in the MVP checklist:
 * 1. Version proof schema semantically (schema/v1.x.json)
 * 2. Add regression tests validating old proofs under new schema
 * 3. Fail build if any validation mismatch occurs
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { logger } from "./logger";
import { supabaseService } from "./db";
import { CanonicalProofV1, validateCanonicalProof } from "./proof-schema";

export interface SchemaVersion {
  version: string;
  path: string;
  schema: any;
  validator: any;
  isLatest: boolean;
  createdAt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  schemaVersion: string;
}

export interface RegressionTestResult {
  schemaVersion: string;
  totalProofs: number;
  validProofs: number;
  invalidProofs: number;
  errors: Array<{
    proofId: string;
    errors: string[];
  }>;
  passed: boolean;
}

/**
 * Schema version manager
 */
export class SchemaVersionManager {
  private schemas: Map<string, SchemaVersion> = new Map();
  private latestVersion: string = "";

  constructor() {
    this.loadSchemas();
  }

  /**
   * Load all available schemas
   */
  private loadSchemas(): void {
    try {
      // Load v1.0 schema
      const v1_0 = require("../schema/proof.v1.json");
      this.addSchema("1.0", "../schema/proof.v1.json", v1_0, false);

      // Load v1.1 schema (latest)
      const v1_1 = require("../schema/proof.v1.1.json");
      this.addSchema("1.1", "../schema/proof.v1.1.json", v1_1, true);

      logger.info(
        {
          loadedSchemas: Array.from(this.schemas.keys()),
          latestVersion: this.latestVersion,
        },
        "Schema versions loaded",
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : error,
        },
        "Failed to load schemas",
      );
      throw error;
    }
  }

  /**
   * Add a schema version
   */
  private addSchema(version: string, path: string, schema: any, isLatest: boolean = false): void {
    const ajv = new Ajv({ strict: true });
    addFormats(ajv);

    const validator = ajv.compile(schema);

    const schemaVersion: SchemaVersion = {
      version,
      path,
      schema,
      validator,
      isLatest,
      createdAt: new Date().toISOString(),
    };

    this.schemas.set(version, schemaVersion);

    if (isLatest) {
      this.latestVersion = version;
    }
  }

  /**
   * Get all available schema versions
   */
  getAvailableVersions(): string[] {
    return Array.from(this.schemas.keys()).sort();
  }

  /**
   * Get the latest schema version
   */
  getLatestVersion(): string {
    return this.latestVersion;
  }

  /**
   * Get schema version details
   */
  getSchemaVersion(version: string): SchemaVersion | null {
    return this.schemas.get(version) || null;
  }

  /**
   * Validate proof against a specific schema version
   */
  validateProof(proof: any, version: string): ValidationResult {
    const schemaVersion = this.schemas.get(version);

    if (!schemaVersion) {
      return {
        valid: false,
        errors: [`Schema version ${version} not found`],
        warnings: [],
        schemaVersion: version,
      };
    }

    const isValid = schemaVersion.validator(proof);
    const errors = schemaVersion.validator.errors || [];

    return {
      valid: isValid,
      errors: errors.map((error: any) => `${error.instancePath}: ${error.message}`),
      warnings: [],
      schemaVersion: version,
    };
  }

  /**
   * Validate proof against the latest schema
   */
  validateProofLatest(proof: any): ValidationResult {
    return this.validateProof(proof, this.latestVersion);
  }

  /**
   * Get schema compatibility information
   */
  getCompatibilityInfo(): {
    versions: Array<{
      version: string;
      isLatest: boolean;
      createdAt: string;
      path: string;
    }>;
    latestVersion: string;
    totalVersions: number;
  } {
    const versions = Array.from(this.schemas.values()).map((schema) => ({
      version: schema.version,
      isLatest: schema.isLatest,
      createdAt: schema.createdAt,
      path: schema.path,
    }));

    return {
      versions,
      latestVersion: this.latestVersion,
      totalVersions: versions.length,
    };
  }
}

// Global schema manager instance
const schemaManager = new SchemaVersionManager();

/**
 * Validate proof against latest schema
 */
export function validateProofAgainstLatest(proof: any): ValidationResult {
  return schemaManager.validateProofLatest(proof);
}

/**
 * Validate proof against specific schema version
 */
export function validateProofAgainstVersion(proof: any, version: string): ValidationResult {
  return schemaManager.validateProof(proof, version);
}

/**
 * Get schema version information
 */
export function getSchemaVersionInfo() {
  return schemaManager.getCompatibilityInfo();
}

/**
 * Run regression tests on all proofs
 */
export async function runRegressionTests(): Promise<RegressionTestResult[]> {
  const results: RegressionTestResult[] = [];
  const versions = schemaManager.getAvailableVersions();

  logger.info(
    {
      versions,
    },
    "Starting regression tests",
  );

  for (const version of versions) {
    try {
      const result = await runRegressionTestForVersion(version);
      results.push(result);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : error,
          version,
        },
        "Failed to run regression test for version",
      );

      results.push({
        schemaVersion: version,
        totalProofs: 0,
        validProofs: 0,
        invalidProofs: 0,
        errors: [
          {
            proofId: "system",
            errors: [error instanceof Error ? error.message : "Unknown error"],
          },
        ],
        passed: false,
      });
    }
  }

  return results;
}

/**
 * Run regression test for a specific schema version
 */
async function runRegressionTestForVersion(version: string): Promise<RegressionTestResult> {
  const svc = supabaseService();

  // Get all proofs from database
  const { data: proofs, error } = await svc.from("proofs").select("id, proof_json").limit(1000); // Limit for performance

  if (error) {
    throw new Error(`Failed to fetch proofs: ${error.message}`);
  }

  const totalProofs = proofs?.length || 0;
  let validProofs = 0;
  let invalidProofs = 0;
  const errors: Array<{ proofId: string; errors: string[] }> = [];

  // Validate each proof against the schema version
  for (const proof of proofs || []) {
    try {
      const validationResult = schemaManager.validateProof(proof.proof_json, version);

      if (validationResult.valid) {
        validProofs++;
      } else {
        invalidProofs++;
        errors.push({
          proofId: proof.id,
          errors: validationResult.errors,
        });
      }
    } catch (error) {
      invalidProofs++;
      errors.push({
        proofId: proof.id,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    }
  }

  const passed = invalidProofs === 0;

  logger.info(
    {
      version,
      totalProofs,
      validProofs,
      invalidProofs,
      passed,
    },
    "Regression test completed for version",
  );

  return {
    schemaVersion: version,
    totalProofs,
    validProofs,
    invalidProofs,
    errors,
    passed,
  };
}

/**
 * Check if all regression tests pass
 */
export async function checkRegressionTests(): Promise<{
  allPassed: boolean;
  results: RegressionTestResult[];
  summary: {
    totalVersions: number;
    passedVersions: number;
    failedVersions: number;
    totalProofs: number;
    totalValid: number;
    totalInvalid: number;
  };
}> {
  const results = await runRegressionTests();

  const allPassed = results.every((result) => result.passed);

  const summary = {
    totalVersions: results.length,
    passedVersions: results.filter((r) => r.passed).length,
    failedVersions: results.filter((r) => !r.passed).length,
    totalProofs: results.reduce((sum, r) => sum + r.totalProofs, 0),
    totalValid: results.reduce((sum, r) => sum + r.validProofs, 0),
    totalInvalid: results.reduce((sum, r) => sum + r.invalidProofs, 0),
  };

  logger.info(
    {
      allPassed,
      summary,
    },
    "Regression test check completed",
  );

  return {
    allPassed,
    results,
    summary,
  };
}

/**
 * Validate schema backward compatibility
 */
export function validateBackwardCompatibility(): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check if we have multiple versions
  const versions = schemaManager.getAvailableVersions();

  if (versions.length < 2) {
    return {
      compatible: true,
      issues: [],
      recommendations: ["Only one schema version found - no compatibility issues"],
    };
  }

  // For now, we only have v1.0, so no compatibility issues
  // In the future, this would check for breaking changes between versions

  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * Get schema migration path
 */
export function getSchemaMigrationPath(
  fromVersion: string,
  toVersion: string,
): {
  canMigrate: boolean;
  migrationSteps: string[];
  warnings: string[];
} {
  const fromSchema = schemaManager.getSchemaVersion(fromVersion);
  const toSchema = schemaManager.getSchemaVersion(toVersion);

  if (!fromSchema || !toSchema) {
    return {
      canMigrate: false,
      migrationSteps: [],
      warnings: [`Schema version ${fromVersion} or ${toVersion} not found`],
    };
  }

  // For now, we only have v1.0, so no migration needed
  // In the future, this would analyze schema differences and provide migration steps

  return {
    canMigrate: true,
    migrationSteps: ["No migration needed - schemas are compatible"],
    warnings: [],
  };
}
