/**
 * Schema Migration Utilities
 *
 * Provides utilities for migrating proofs between schema versions
 * with backward compatibility and validation
 */

import { logger } from "./logger";
import { CanonicalProofV1 } from "./proof-schema";
import { validateProofAgainstVersion, validateProofAgainstLatest } from "./schema-version-control";

export interface MigrationResult {
  success: boolean;
  migratedProof: any;
  warnings: string[];
  errors: string[];
  fromVersion: string;
  toVersion: string;
}

export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  transform: (proof: any) => any;
  validate: (proof: any) => boolean;
  description: string;
}

/**
 * Schema migration rules
 */
const MIGRATION_RULES: MigrationRule[] = [
  {
    fromVersion: "1.0",
    toVersion: "1.1",
    transform: (proof: any) => {
      // Transform v1.0 to v1.1
      const migrated = { ...proof };

      // Add enhanced metadata structure if not present
      if (!migrated.metadata) {
        migrated.metadata = {};
      }

      // Add visibility if not present
      if (!migrated.metadata.visibility) {
        migrated.metadata.visibility = "public";
      }

      // Add tags array if not present
      if (!migrated.metadata.tags) {
        migrated.metadata.tags = [];
      }

      return migrated;
    },
    validate: (proof: any) => {
      // Validate that the migrated proof conforms to v1.1
      const validation = validateProofAgainstVersion(proof, "1.1");
      return validation.valid;
    },
    description: "Migrate from v1.0 to v1.1 with enhanced metadata structure",
  },
];

/**
 * Migrate a proof from one schema version to another
 */
export function migrateProof(proof: any, fromVersion: string, toVersion: string): MigrationResult {
  const result: MigrationResult = {
    success: false,
    migratedProof: null,
    warnings: [],
    errors: [],
    fromVersion,
    toVersion,
  };

  try {
    // Find the appropriate migration rule
    const rule = MIGRATION_RULES.find(
      (r) => r.fromVersion === fromVersion && r.toVersion === toVersion,
    );

    if (!rule) {
      result.errors.push(`No migration rule found from ${fromVersion} to ${toVersion}`);
      return result;
    }

    // Validate the source proof
    const sourceValidation = validateProofAgainstVersion(proof, fromVersion);
    if (!sourceValidation.valid) {
      result.errors.push(
        `Source proof is invalid for version ${fromVersion}: ${sourceValidation.errors.join(", ")}`,
      );
      return result;
    }

    // Apply the migration transformation
    const migratedProof = rule.transform(proof);

    // Validate the migrated proof
    const migratedValidation = rule.validate(migratedProof);
    if (!migratedValidation) {
      result.errors.push(`Migrated proof is invalid for version ${toVersion}`);
      return result;
    }

    // Check for any warnings
    if (sourceValidation.warnings.length > 0) {
      result.warnings.push(...sourceValidation.warnings);
    }

    result.success = true;
    result.migratedProof = migratedProof;

    logger.info(
      {
        fromVersion,
        toVersion,
        proofId: proof.id || "unknown",
      },
      "Proof migrated successfully",
    );

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown migration error");

    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        fromVersion,
        toVersion,
        proofId: proof.id || "unknown",
      },
      "Proof migration failed",
    );

    return result;
  }
}

/**
 * Migrate a proof to the latest schema version
 */
export function migrateProofToLatest(proof: any, currentVersion: string): MigrationResult {
  const latestVersion = "1.1"; // This would be dynamically determined

  if (currentVersion === latestVersion) {
    return {
      success: true,
      migratedProof: proof,
      warnings: [],
      errors: [],
      fromVersion: currentVersion,
      toVersion: latestVersion,
    };
  }

  return migrateProof(proof, currentVersion, latestVersion);
}

/**
 * Get available migration paths from a source version
 */
export function getAvailableMigrations(fromVersion: string): Array<{
  toVersion: string;
  description: string;
  available: boolean;
}> {
  const availableMigrations = MIGRATION_RULES.filter(
    (rule) => rule.fromVersion === fromVersion,
  ).map((rule) => ({
    toVersion: rule.toVersion,
    description: rule.description,
    available: true,
  }));

  return availableMigrations;
}

/**
 * Check if a migration is available between two versions
 */
export function isMigrationAvailable(fromVersion: string, toVersion: string): boolean {
  return MIGRATION_RULES.some(
    (rule) => rule.fromVersion === fromVersion && rule.toVersion === toVersion,
  );
}

/**
 * Get migration compatibility matrix
 */
export function getMigrationCompatibilityMatrix(): Record<string, string[]> {
  const matrix: Record<string, string[]> = {};

  MIGRATION_RULES.forEach((rule) => {
    if (!matrix[rule.fromVersion]) {
      matrix[rule.fromVersion] = [];
    }
    matrix[rule.fromVersion].push(rule.toVersion);
  });

  return matrix;
}

/**
 * Validate backward compatibility between schema versions
 */
export function validateBackwardCompatibility(
  fromVersion: string,
  toVersion: string,
): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check if migration is available
  if (!isMigrationAvailable(fromVersion, toVersion)) {
    issues.push(`No migration path available from ${fromVersion} to ${toVersion}`);
    recommendations.push("Consider implementing a migration rule for this version combination");
  }

  // Check for breaking changes
  if (fromVersion === "1.0" && toVersion === "1.1") {
    // v1.1 is backward compatible with v1.0
    recommendations.push("v1.1 is backward compatible with v1.0 - no breaking changes");
  }

  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * Batch migrate multiple proofs
 */
export async function batchMigrateProofs(
  proofs: Array<{ id: string; proof: any; version: string }>,
  targetVersion: string,
): Promise<{
  successful: number;
  failed: number;
  results: Array<{
    proofId: string;
    success: boolean;
    errors: string[];
    warnings: string[];
  }>;
}> {
  const results: Array<{
    proofId: string;
    success: boolean;
    errors: string[];
    warnings: string[];
  }> = [];

  let successful = 0;
  let failed = 0;

  for (const { id, proof, version } of proofs) {
    const migrationResult = migrateProof(proof, version, targetVersion);

    results.push({
      proofId: id,
      success: migrationResult.success,
      errors: migrationResult.errors,
      warnings: migrationResult.warnings,
    });

    if (migrationResult.success) {
      successful++;
    } else {
      failed++;
    }
  }

  logger.info(
    {
      totalProofs: proofs.length,
      successful,
      failed,
      targetVersion,
    },
    "Batch migration completed",
  );

  return {
    successful,
    failed,
    results,
  };
}
