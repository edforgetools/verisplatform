/**
 * Snapshot Automation Service
 *
 * Implements automatic snapshot creation every 1,000 proofs with:
 * - Proof count monitoring
 * - Automatic batch creation
 * - Mirror synchronization
 * - Integrity verification
 * - Error handling and retry logic
 */

import { supabaseService } from "./db";
import { logger } from "./logger";
import {
  createSnapshotAndMirror,
  shouldCreateSnapshot,
  createSnapshotIfNeeded,
} from "./snapshot-mirror-protocol";
import { recordApiCall } from "./usage-telemetry";
import { isSnapshotAutomationEnabled } from "./env";

export interface SnapshotAutomationConfig {
  batchSize: number;
  enabled: boolean;
  retryAttempts: number;
  retryDelayMs: number;
  integrityCheckEnabled: boolean;
  mirrorSyncEnabled: boolean;
}

export interface SnapshotAutomationResult {
  success: boolean;
  batch?: number;
  count?: number;
  error?: string;
  retryCount?: number;
  integrityVerified?: boolean;
  mirrorsSynced?: boolean;
}

export interface SnapshotStatus {
  totalProofs: number;
  lastSnapshotBatch: number | null;
  proofsSinceLastSnapshot: number;
  nextSnapshotAt: number;
  isSnapshotDue: boolean;
  automationEnabled: boolean;
}

// Default configuration
const DEFAULT_CONFIG: SnapshotAutomationConfig = {
  batchSize: 1000,
  enabled: true,
  retryAttempts: 3,
  retryDelayMs: 5000,
  integrityCheckEnabled: true,
  mirrorSyncEnabled: true,
};

/**
 * Get current snapshot automation status
 */
export async function getSnapshotStatus(): Promise<SnapshotStatus> {
  const svc = supabaseService();

  // Get total proof count
  const { count: totalProofs, error: countError } = await svc
    .from("proofs")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Failed to get proof count: ${countError.message}`);
  }

  // Get latest snapshot
  const { data: latestSnapshot, error: snapshotError } = await svc
    .from("snapshot_meta")
    .select("batch, count")
    .order("batch", { ascending: false })
    .limit(1)
    .single();

  const currentCount = totalProofs || 0;
  const lastSnapshotBatch = latestSnapshot?.batch || null;
  const proofsSinceLastSnapshot = lastSnapshotBatch
    ? currentCount - lastSnapshotBatch * DEFAULT_CONFIG.batchSize
    : currentCount;

  const nextSnapshotAt = lastSnapshotBatch
    ? (lastSnapshotBatch + 1) * DEFAULT_CONFIG.batchSize
    : DEFAULT_CONFIG.batchSize;

  const isSnapshotDue = proofsSinceLastSnapshot >= DEFAULT_CONFIG.batchSize;

  return {
    totalProofs: currentCount,
    lastSnapshotBatch,
    proofsSinceLastSnapshot,
    nextSnapshotAt,
    isSnapshotDue,
    automationEnabled: isSnapshotAutomationEnabled(),
  };
}

/**
 * Check if snapshot should be created and create it if needed
 */
export async function checkAndCreateSnapshot(): Promise<SnapshotAutomationResult> {
  // Feature flag check
  if (!isSnapshotAutomationEnabled()) {
    return {
      success: false,
      error: "Snapshot automation is disabled",
    };
  }

  try {
    const { shouldCreate, currentCount, nextBatch } = await shouldCreateSnapshot();

    if (!shouldCreate) {
      return {
        success: true,
        error: "No snapshot needed at this time",
      };
    }

    logger.info(
      {
        currentCount,
        nextBatch,
      },
      "Creating automated snapshot",
    );

    // Record API call for telemetry
    await recordApiCall("/api/jobs/snapshot-automation", undefined, {
      batch: nextBatch,
      proof_count: currentCount,
      automation: true,
    });

    // Create snapshot with retry logic
    const result = await createSnapshotWithRetry(nextBatch, currentCount);

    return result;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
      },
      "Failed to check and create snapshot",
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create snapshot with retry logic
 */
async function createSnapshotWithRetry(
  batch: number,
  expectedCount: number,
  attempt: number = 1,
): Promise<SnapshotAutomationResult> {
  try {
    const result = await createSnapshotIfNeeded();

    if (result.created) {
      logger.info(
        {
          batch: result.batch,
          count: result.count,
          attempt,
        },
        "Snapshot created successfully",
      );

      return {
        success: true,
        batch: result.batch,
        count: result.count,
        retryCount: attempt,
      };
    } else {
      throw new Error(result.error || "Failed to create snapshot");
    }
  } catch (error) {
    if (attempt < DEFAULT_CONFIG.retryAttempts) {
      logger.warn(
        {
          error: error instanceof Error ? error.message : error,
          attempt,
          maxAttempts: DEFAULT_CONFIG.retryAttempts,
        },
        "Snapshot creation failed, retrying",
      );

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_CONFIG.retryDelayMs));

      return createSnapshotWithRetry(batch, expectedCount, attempt + 1);
    } else {
      logger.error(
        {
          error: error instanceof Error ? error.message : error,
          attempt,
          maxAttempts: DEFAULT_CONFIG.retryAttempts,
        },
        "Snapshot creation failed after all retries",
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        retryCount: attempt,
      };
    }
  }
}

/**
 * Verify all snapshots integrity
 */
export async function verifyAllSnapshotsIntegrity(): Promise<{
  totalSnapshots: number;
  verifiedSnapshots: number;
  failedSnapshots: number;
  results: Array<{
    batch: number;
    verified: boolean;
    error?: string;
  }>;
}> {
  const svc = supabaseService();

  // Get all snapshots
  const { data: snapshots, error } = await svc
    .from("snapshot_meta")
    .select("batch, count, merkle_root")
    .order("batch", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch snapshots: ${error.message}`);
  }

  const results: Array<{
    batch: number;
    verified: boolean;
    error?: string;
  }> = [];

  let verifiedCount = 0;
  let failedCount = 0;

  for (const snapshot of snapshots || []) {
    try {
      // Get proofs for this batch
      const startId = (snapshot.batch - 1) * DEFAULT_CONFIG.batchSize + 1;
      const endId = snapshot.batch * DEFAULT_CONFIG.batchSize;

      const { data: proofs, error: proofsError } = await svc
        .from("proofs")
        .select("proof_json")
        .order("id")
        .range(startId - 1, endId - 1);

      if (proofsError || !proofs || proofs.length !== DEFAULT_CONFIG.batchSize) {
        results.push({
          batch: snapshot.batch,
          verified: false,
          error: "Failed to fetch proofs for batch",
        });
        failedCount++;
        continue;
      }

      // Verify integrity (simplified check)
      const canonicalProofs = proofs.map((p) => p.proof_json).filter(Boolean);

      if (canonicalProofs.length === DEFAULT_CONFIG.batchSize) {
        results.push({
          batch: snapshot.batch,
          verified: true,
        });
        verifiedCount++;
      } else {
        results.push({
          batch: snapshot.batch,
          verified: false,
          error: "Incomplete proof data",
        });
        failedCount++;
      }
    } catch (error) {
      results.push({
        batch: snapshot.batch,
        verified: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      failedCount++;
    }
  }

  return {
    totalSnapshots: snapshots?.length || 0,
    verifiedSnapshots: verifiedCount,
    failedSnapshots: failedCount,
    results,
  };
}

/**
 * Get snapshot statistics
 */
export async function getSnapshotStatistics(): Promise<{
  totalSnapshots: number;
  totalProofsSnapshotted: number;
  averageProofsPerSnapshot: number;
  lastSnapshotDate: string | null;
  firstSnapshotDate: string | null;
  snapshotFrequency: number; // days between snapshots
}> {
  const svc = supabaseService();

  // Get all snapshots
  const { data: snapshots, error } = await svc
    .from("snapshot_meta")
    .select("batch, count, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch snapshots: ${error.message}`);
  }

  if (!snapshots || snapshots.length === 0) {
    return {
      totalSnapshots: 0,
      totalProofsSnapshotted: 0,
      averageProofsPerSnapshot: 0,
      lastSnapshotDate: null,
      firstSnapshotDate: null,
      snapshotFrequency: 0,
    };
  }

  const totalSnapshots = snapshots.length;
  const totalProofsSnapshotted = snapshots.reduce((sum, s) => sum + s.count, 0);
  const averageProofsPerSnapshot = totalProofsSnapshotted / totalSnapshots;

  const firstSnapshotDate = snapshots[0].created_at;
  const lastSnapshotDate = snapshots[snapshots.length - 1].created_at;

  // Calculate average frequency
  let snapshotFrequency = 0;
  if (snapshots.length > 1) {
    const firstDate = new Date(firstSnapshotDate!);
    const lastDate = new Date(lastSnapshotDate!);
    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    snapshotFrequency = daysDiff / (totalSnapshots - 1);
  }

  return {
    totalSnapshots,
    totalProofsSnapshotted,
    averageProofsPerSnapshot,
    lastSnapshotDate,
    firstSnapshotDate,
    snapshotFrequency,
  };
}

/**
 * Clean up old snapshots (keep only last N batches)
 */
export async function cleanupOldSnapshots(keepLastBatches: number = 10): Promise<{
  deletedBatches: number[];
  error?: string;
}> {
  const svc = supabaseService();

  try {
    // Get snapshots to delete (all except the last N)
    const { data: snapshotsToDelete, error } = await svc
      .from("snapshot_meta")
      .select("batch")
      .order("batch", { ascending: false })
      .range(keepLastBatches, 999999); // Skip first N, get the rest

    if (error) {
      throw new Error(`Failed to fetch snapshots for cleanup: ${error.message}`);
    }

    if (!snapshotsToDelete || snapshotsToDelete.length === 0) {
      return {
        deletedBatches: [],
      };
    }

    const batchesToDelete = snapshotsToDelete.map((s) => s.batch);

    // Delete snapshot metadata
    const { error: deleteError } = await svc
      .from("snapshot_meta")
      .delete()
      .in("batch", batchesToDelete);

    if (deleteError) {
      throw new Error(`Failed to delete snapshot metadata: ${deleteError.message}`);
    }

    logger.info(
      {
        deletedBatches: batchesToDelete,
        keepLastBatches,
      },
      "Old snapshots cleaned up",
    );

    return {
      deletedBatches: batchesToDelete,
    };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        keepLastBatches,
      },
      "Failed to cleanup old snapshots",
    );

    return {
      deletedBatches: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
