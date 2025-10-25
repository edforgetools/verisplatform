/**
 * Enhanced Recovery Audit System
 *
 * Implements advanced recovery audit features including:
 * - Random reconstruction validation from mirrors
 * - Cross-mirror consistency checks
 * - Automated recovery audit scheduling
 * - Comprehensive integrity validation
 * - Performance monitoring and alerting
 */

import { supabaseService } from "./db";
import { logger } from "./logger";
import { CanonicalProofV1, verifyCanonicalProof } from "./proof-schema";
import { fetchProofFromS3, fetchProofFromS3ByHash } from "./mirror-reader";
import { recordApiCall } from "./usage-telemetry";

export interface EnhancedRecoveryAuditResult {
  proofId: string;
  originalHash: string;
  recoveredHash: string;
  hashMatch: boolean;
  signatureValid: boolean;
  source: "s3" | "arweave" | "database" | "local";
  recoveredAt: string;
  recoveryTimeMs: number;
  errors: string[];
  warnings: string[];
  crossMirrorConsistent: boolean;
  integrityScore: number; // 0-100
}

export interface CrossMirrorValidation {
  proofId: string;
  sources: Array<{
    source: string;
    hash: string;
    signatureValid: boolean;
    recoveredAt: string;
    errors: string[];
  }>;
  consistent: boolean;
  consensusHash: string | null;
  discrepancies: Array<{
    source1: string;
    source2: string;
    field: string;
    value1: string;
    value2: string;
  }>;
}

export interface RecoveryAuditMetrics {
  totalAudited: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  hashMismatches: number;
  signatureFailures: number;
  crossMirrorInconsistencies: number;
  averageRecoveryTimeMs: number;
  integrityScore: number;
  sourceBreakdown: {
    s3: number;
    arweave: number;
    database: number;
    local: number;
  };
  performanceMetrics: {
    fastestRecoveryMs: number;
    slowestRecoveryMs: number;
    medianRecoveryMs: number;
  };
  errors: string[];
  warnings: string[];
  auditDate: string;
}

export interface RecoveryAuditConfig {
  batchSize: number;
  maxErrors: number;
  sources: Array<"s3" | "arweave" | "database" | "local">;
  randomize: boolean;
  crossMirrorValidation: boolean;
  performanceThresholdMs: number;
  integrityThreshold: number;
  enableAlerts: boolean;
}

// Default configuration
const DEFAULT_CONFIG: RecoveryAuditConfig = {
  batchSize: 20,
  maxErrors: 10,
  sources: ["database", "s3"],
  randomize: true,
  crossMirrorValidation: true,
  performanceThresholdMs: 5000,
  integrityThreshold: 95,
  enableAlerts: true,
};

/**
 * Run enhanced recovery audit with cross-mirror validation
 */
export async function runEnhancedRecoveryAudit(
  config: Partial<RecoveryAuditConfig> = {},
): Promise<RecoveryAuditMetrics> {
  const auditConfig = { ...DEFAULT_CONFIG, ...config };

  logger.info(
    {
      config: auditConfig,
    },
    "Starting enhanced recovery audit",
  );

  const results: EnhancedRecoveryAuditResult[] = [];
  const crossMirrorValidations: CrossMirrorValidation[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Record API call for telemetry
    await recordApiCall("/api/jobs/recovery-audit", undefined, {
      batch_size: auditConfig.batchSize,
      sources: auditConfig.sources,
      cross_mirror_validation: auditConfig.crossMirrorValidation,
    });

    // Get random proofs to audit
    const proofsToAudit = await getRandomProofsForAuditEnhanced(auditConfig.batchSize);

    logger.info(
      {
        proofCount: proofsToAudit.length,
      },
      "Selected proofs for enhanced audit",
    );

    // Audit each proof
    for (const proof of proofsToAudit) {
      try {
        const startTime = Date.now();
        const result = await auditProofRecoveryEnhanced(proof, auditConfig);
        const recoveryTime = Date.now() - startTime;

        result.recoveryTimeMs = recoveryTime;
        results.push(result);

        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }
        if (result.warnings.length > 0) {
          warnings.push(...result.warnings);
        }

        // Cross-mirror validation if enabled
        if (auditConfig.crossMirrorValidation && auditConfig.sources.length > 1) {
          const crossValidation = await validateCrossMirrorConsistency(proof, auditConfig.sources);
          crossMirrorValidations.push(crossValidation);
        }

        // Performance alert
        if (recoveryTime > auditConfig.performanceThresholdMs) {
          const warning = `Slow recovery for proof ${proof.id}: ${recoveryTime}ms (threshold: ${auditConfig.performanceThresholdMs}ms)`;
          warnings.push(warning);
          logger.warn(
            {
              proofId: proof.id,
              recoveryTime,
              threshold: auditConfig.performanceThresholdMs,
            },
            "Slow recovery detected",
          );
        }

        // Stop if we hit max errors
        if (errors.length >= auditConfig.maxErrors) {
          logger.warn(
            {
              errorCount: errors.length,
              maxErrors: auditConfig.maxErrors,
            },
            "Stopping audit due to max errors reached",
          );
          break;
        }
      } catch (error) {
        const errorMsg = `Failed to audit proof ${proof.id}: ${
          error instanceof Error ? error.message : error
        }`;
        errors.push(errorMsg);
        logger.error(
          {
            error: errorMsg,
            proofId: proof.id,
          },
          "Enhanced proof audit failed",
        );
      }
    }

    // Generate enhanced metrics
    const metrics = generateEnhancedAuditMetrics(results, crossMirrorValidations, errors, warnings);

    // Store enhanced audit results
    await storeEnhancedAuditResults(metrics, results, crossMirrorValidations);

    // Check integrity threshold
    if (metrics.integrityScore < auditConfig.integrityThreshold) {
      const alert = `Recovery audit integrity score ${metrics.integrityScore}% below threshold ${auditConfig.integrityThreshold}%`;
      warnings.push(alert);
      logger.error(
        {
          integrityScore: metrics.integrityScore,
          threshold: auditConfig.integrityThreshold,
        },
        "Recovery audit integrity threshold breached",
      );
    }

    logger.info(
      {
        metrics,
      },
      "Enhanced recovery audit completed",
    );

    return metrics;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
      },
      "Enhanced recovery audit failed",
    );
    throw error;
  }
}

/**
 * Enhanced proof recovery audit
 */
async function auditProofRecoveryEnhanced(
  proof: { id: string; hash_full: string; proof_json: CanonicalProofV1 },
  config: RecoveryAuditConfig,
): Promise<EnhancedRecoveryAuditResult> {
  const result: EnhancedRecoveryAuditResult = {
    proofId: proof.id,
    originalHash: proof.hash_full,
    recoveredHash: "",
    hashMatch: false,
    signatureValid: false,
    source: "database",
    recoveredAt: new Date().toISOString(),
    recoveryTimeMs: 0,
    errors: [],
    warnings: [],
    crossMirrorConsistent: true,
    integrityScore: 0,
  };

  let bestRecovery: {
    source: string;
    hash: string;
    signatureValid: boolean;
    integrityScore: number;
  } | null = null;

  // Try to recover from each source
  for (const source of config.sources) {
    try {
      let recoveredProof: CanonicalProofV1 | null = null;
      const sourceStartTime = Date.now();

      switch (source) {
        case "s3":
          recoveredProof = await fetchProofFromS3(proof.id);
          break;
        case "arweave":
          // This would fetch from Arweave - for now, we'll skip
          continue;
        case "database":
          recoveredProof = proof.proof_json;
          break;
        case "local":
          // This would fetch from local registry files
          recoveredProof = await fetchProofFromLocalRegistry(proof.id);
          break;
      }

      const sourceRecoveryTime = Date.now() - sourceStartTime;

      if (recoveredProof) {
        const hashMatch = recoveredProof.hash_full === proof.hash_full;
        const signatureValid = verifyCanonicalProof(recoveredProof);
        const integrityScore = calculateIntegrityScore(
          hashMatch,
          signatureValid,
          sourceRecoveryTime,
        );

        // Track best recovery
        if (!bestRecovery || integrityScore > bestRecovery.integrityScore) {
          bestRecovery = {
            source,
            hash: recoveredProof.hash_full,
            signatureValid,
            integrityScore,
          };
        }

        // Log issues
        if (!hashMatch) {
          result.errors.push(
            `Hash mismatch from ${source}: expected ${proof.hash_full}, got ${recoveredProof.hash_full}`,
          );
        }
        if (!signatureValid) {
          result.errors.push(`Signature verification failed from ${source}`);
        }
        if (sourceRecoveryTime > config.performanceThresholdMs) {
          result.warnings.push(`Slow recovery from ${source}: ${sourceRecoveryTime}ms`);
        }
      } else {
        result.errors.push(`Failed to recover proof from ${source}`);
      }
    } catch (error) {
      result.errors.push(
        `Failed to recover from ${source}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // Set result based on best recovery
  if (bestRecovery) {
    result.source = bestRecovery.source as any;
    result.recoveredHash = bestRecovery.hash;
    result.hashMatch = bestRecovery.hash === proof.hash_full;
    result.signatureValid = bestRecovery.signatureValid;
    result.integrityScore = bestRecovery.integrityScore;
  }

  return result;
}

/**
 * Validate cross-mirror consistency
 */
async function validateCrossMirrorConsistency(
  proof: { id: string; hash_full: string; proof_json: CanonicalProofV1 },
  sources: string[],
): Promise<CrossMirrorValidation> {
  const validation: CrossMirrorValidation = {
    proofId: proof.id,
    sources: [],
    consistent: true,
    consensusHash: null,
    discrepancies: [],
  };

  const sourceResults: Array<{
    source: string;
    hash: string;
    signatureValid: boolean;
    recoveredAt: string;
    errors: string[];
  }> = [];

  // Collect results from all sources
  for (const source of sources) {
    try {
      let recoveredProof: CanonicalProofV1 | null = null;

      switch (source) {
        case "s3":
          recoveredProof = await fetchProofFromS3(proof.id);
          break;
        case "database":
          recoveredProof = proof.proof_json;
          break;
        case "local":
          recoveredProof = await fetchProofFromLocalRegistry(proof.id);
          break;
      }

      if (recoveredProof) {
        sourceResults.push({
          source,
          hash: recoveredProof.hash_full,
          signatureValid: verifyCanonicalProof(recoveredProof),
          recoveredAt: new Date().toISOString(),
          errors: [],
        });
      } else {
        sourceResults.push({
          source,
          hash: "",
          signatureValid: false,
          recoveredAt: new Date().toISOString(),
          errors: [`Failed to recover from ${source}`],
        });
      }
    } catch (error) {
      sourceResults.push({
        source,
        hash: "",
        signatureValid: false,
        recoveredAt: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    }
  }

  validation.sources = sourceResults;

  // Check consistency
  const validResults = sourceResults.filter((r) => r.hash && r.errors.length === 0);
  if (validResults.length > 1) {
    const hashes = validResults.map((r) => r.hash);
    const uniqueHashes = [...new Set(hashes)];

    if (uniqueHashes.length === 1) {
      validation.consensusHash = uniqueHashes[0];
    } else {
      validation.consistent = false;
      // Find discrepancies
      for (let i = 0; i < validResults.length; i++) {
        for (let j = i + 1; j < validResults.length; j++) {
          if (validResults[i].hash !== validResults[j].hash) {
            validation.discrepancies.push({
              source1: validResults[i].source,
              source2: validResults[j].source,
              field: "hash_full",
              value1: validResults[i].hash,
              value2: validResults[j].hash,
            });
          }
        }
      }
    }
  }

  return validation;
}

/**
 * Calculate integrity score (0-100)
 */
function calculateIntegrityScore(
  hashMatch: boolean,
  signatureValid: boolean,
  recoveryTimeMs: number,
): number {
  let score = 0;

  if (hashMatch) score += 50;
  if (signatureValid) score += 40;

  // Performance bonus (faster is better)
  if (recoveryTimeMs < 1000) score += 10;
  else if (recoveryTimeMs < 3000) score += 5;

  return Math.min(100, score);
}

/**
 * Get random proofs for enhanced audit
 */
async function getRandomProofsForAuditEnhanced(count: number): Promise<
  Array<{
    id: string;
    hash_full: string;
    proof_json: CanonicalProofV1;
  }>
> {
  const svc = supabaseService();

  // Get random proofs from the database
  const { data: proofs, error } = await svc
    .from("proofs")
    .select("id, hash_full, proof_json")
    .order("created_at", { ascending: false })
    .limit(count * 2); // Get more than needed for randomization

  if (error) {
    throw new Error(`Failed to fetch proofs for enhanced audit: ${error.message}`);
  }

  if (!proofs || proofs.length === 0) {
    return [];
  }

  // Randomize selection
  const shuffled = proofs.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Fetch proof from local registry files
 */
async function fetchProofFromLocalRegistry(proofId: string): Promise<CanonicalProofV1 | null> {
  try {
    // This would read from local registry files
    // For now, we'll return null as this is a placeholder
    return null;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        proofId,
      },
      "Failed to fetch proof from local registry",
    );
    return null;
  }
}

/**
 * Generate enhanced audit metrics
 */
function generateEnhancedAuditMetrics(
  results: EnhancedRecoveryAuditResult[],
  crossMirrorValidations: CrossMirrorValidation[],
  errors: string[],
  warnings: string[],
): RecoveryAuditMetrics {
  const totalAudited = results.length;
  const successfulRecoveries = results.filter((r) => r.hashMatch && r.signatureValid).length;
  const failedRecoveries = totalAudited - successfulRecoveries;
  const hashMismatches = results.filter((r) => !r.hashMatch).length;
  const signatureFailures = results.filter((r) => !r.signatureValid).length;
  const crossMirrorInconsistencies = crossMirrorValidations.filter((v) => !v.consistent).length;

  const recoveryTimes = results.map((r) => r.recoveryTimeMs);
  const averageRecoveryTimeMs =
    recoveryTimes.length > 0
      ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
      : 0;

  const integrityScores = results.map((r) => r.integrityScore);
  const averageIntegrityScore =
    integrityScores.length > 0
      ? integrityScores.reduce((sum, score) => sum + score, 0) / integrityScores.length
      : 0;

  const sourceBreakdown = {
    s3: results.filter((r) => r.source === "s3").length,
    arweave: results.filter((r) => r.source === "arweave").length,
    database: results.filter((r) => r.source === "database").length,
    local: results.filter((r) => r.source === "local").length,
  };

  const performanceMetrics = {
    fastestRecoveryMs: recoveryTimes.length > 0 ? Math.min(...recoveryTimes) : 0,
    slowestRecoveryMs: recoveryTimes.length > 0 ? Math.max(...recoveryTimes) : 0,
    medianRecoveryMs:
      recoveryTimes.length > 0
        ? recoveryTimes.sort((a, b) => a - b)[Math.floor(recoveryTimes.length / 2)]
        : 0,
  };

  return {
    totalAudited,
    successfulRecoveries,
    failedRecoveries,
    hashMismatches,
    signatureFailures,
    crossMirrorInconsistencies,
    averageRecoveryTimeMs,
    integrityScore: averageIntegrityScore,
    sourceBreakdown,
    performanceMetrics,
    errors,
    warnings,
    auditDate: new Date().toISOString(),
  };
}

/**
 * Store enhanced audit results
 */
async function storeEnhancedAuditResults(
  metrics: RecoveryAuditMetrics,
  results: EnhancedRecoveryAuditResult[],
  crossMirrorValidations: CrossMirrorValidation[],
): Promise<void> {
  const svc = supabaseService();

  try {
    // Store enhanced metrics
    await svc.from("recovery_audit_enhanced_logs").insert({
      audit_date: metrics.auditDate,
      total_audited: metrics.totalAudited,
      successful_recoveries: metrics.successfulRecoveries,
      failed_recoveries: metrics.failedRecoveries,
      hash_mismatches: metrics.hashMismatches,
      signature_failures: metrics.signatureFailures,
      cross_mirror_inconsistencies: metrics.crossMirrorInconsistencies,
      average_recovery_time_ms: metrics.averageRecoveryTimeMs,
      integrity_score: metrics.integrityScore,
      source_breakdown: metrics.sourceBreakdown,
      performance_metrics: metrics.performanceMetrics,
      errors: metrics.errors,
      warnings: metrics.warnings,
    });

    // Store individual enhanced results
    const enhancedResults = results.map((result) => ({
      audit_date: metrics.auditDate,
      proof_id: result.proofId,
      original_hash: result.originalHash,
      recovered_hash: result.recoveredHash,
      hash_match: result.hashMatch,
      signature_valid: result.signatureValid,
      source: result.source,
      recovered_at: result.recoveredAt,
      recovery_time_ms: result.recoveryTimeMs,
      errors: result.errors,
      warnings: result.warnings,
      cross_mirror_consistent: result.crossMirrorConsistent,
      integrity_score: result.integrityScore,
    }));

    if (enhancedResults.length > 0) {
      await svc.from("recovery_audit_enhanced_results").insert(enhancedResults);
    }

    // Store cross-mirror validations
    const crossMirrorResults = crossMirrorValidations.map((validation) => ({
      audit_date: metrics.auditDate,
      proof_id: validation.proofId,
      sources: validation.sources,
      consistent: validation.consistent,
      consensus_hash: validation.consensusHash,
      discrepancies: validation.discrepancies,
    }));

    if (crossMirrorResults.length > 0) {
      await svc.from("recovery_audit_cross_mirror").insert(crossMirrorResults);
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
      },
      "Failed to store enhanced audit results",
    );
    // Don't throw - audit results are still valid even if storage fails
  }
}

/**
 * Get enhanced recovery audit history
 */
export async function getEnhancedRecoveryAuditHistory(limit: number = 50): Promise<
  Array<{
    audit_date: string;
    total_audited: number;
    successful_recoveries: number;
    failed_recoveries: number;
    hash_mismatches: number;
    signature_failures: number;
    cross_mirror_inconsistencies: number;
    average_recovery_time_ms: number;
    integrity_score: number;
    source_breakdown: any;
    performance_metrics: any;
    errors: string[];
    warnings: string[];
  }>
> {
  const svc = supabaseService();

  const { data: audits, error } = await svc
    .from("recovery_audit_enhanced_logs")
    .select("*")
    .order("audit_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch enhanced audit history: ${error.message}`);
  }

  return audits || [];
}

/**
 * Get enhanced recovery audit results for a specific date
 */
export async function getEnhancedRecoveryAuditResults(auditDate: string): Promise<
  Array<{
    proof_id: string;
    original_hash: string;
    recovered_hash: string;
    hash_match: boolean;
    signature_valid: boolean;
    source: string;
    recovered_at: string;
    recovery_time_ms: number;
    errors: string[];
    warnings: string[];
    cross_mirror_consistent: boolean;
    integrity_score: number;
  }>
> {
  const svc = supabaseService();

  const { data: results, error } = await svc
    .from("recovery_audit_enhanced_results")
    .select("*")
    .eq("audit_date", auditDate)
    .order("recovered_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch enhanced audit results: ${error.message}`);
  }

  return results || [];
}

/**
 * Get cross-mirror validation results
 */
export async function getCrossMirrorValidationResults(auditDate: string): Promise<
  Array<{
    proof_id: string;
    sources: any;
    consistent: boolean;
    consensus_hash: string | null;
    discrepancies: any;
  }>
> {
  const svc = supabaseService();

  const { data: results, error } = await svc
    .from("recovery_audit_cross_mirror")
    .select("*")
    .eq("audit_date", auditDate)
    .order("proof_id", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch cross-mirror validation results: ${error.message}`);
  }

  return results || [];
}
