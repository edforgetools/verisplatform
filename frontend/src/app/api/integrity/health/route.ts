/**
 * Integrity health endpoint - checks system health and snapshot status
 * GET /api/integrity/health
 */

import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";
import { getKeyFingerprint } from "@/lib/crypto-server";

export const runtime = "nodejs";

async function handleIntegrityHealth(req: NextRequest) {
  try {
    const svc = supabaseService();
    const healthChecks: Record<string, boolean> = {};
    const issues: string[] = [];

    // Check 1: Signing key present
    try {
      const fingerprint = getKeyFingerprint();
      healthChecks.signing_key_present = !!fingerprint;
      if (!fingerprint) {
        issues.push("Signing key fingerprint not available");
      }
    } catch (error) {
      healthChecks.signing_key_present = false;
      issues.push("Signing key not configured");
    }

    // Check 2: Get total proof count
    const { count: totalProofs, error: countError } = await svc
      .from("proofs")
      .select("*", { count: "exact", head: true });

    if (countError) {
      healthChecks.database_accessible = false;
      issues.push("Database not accessible");
    } else {
      healthChecks.database_accessible = true;
    }

    // Check 3: If we have 1000+ proofs, check snapshot status
    if (totalProofs && totalProofs >= 1000) {
      const expectedBatches = Math.floor(totalProofs / 1000);

      // Get latest snapshot
      const { data: latestSnapshot, error: snapshotError } = await svc
        .from("snapshot_meta")
        .select("batch, created_at, arweave_txid")
        .order("batch", { ascending: false })
        .limit(1)
        .single();

      if (snapshotError || !latestSnapshot) {
        healthChecks.snapshot_exists = false;
        issues.push("No snapshots found despite having 1000+ proofs");
      } else {
        healthChecks.snapshot_exists = true;

        // Check if latest snapshot is recent (within 24 hours)
        const snapshotAge = Date.now() - new Date(latestSnapshot.created_at).getTime();
        const ageHours = snapshotAge / (1000 * 60 * 60);
        healthChecks.snapshot_recent = ageHours <= 24;

        if (!healthChecks.snapshot_recent) {
          issues.push(`Latest snapshot is ${Math.round(ageHours)} hours old`);
        }

        // Check if latest full batch has Arweave transaction
        const latestFullBatch = Math.floor(totalProofs / 1000);
        if (latestSnapshot.batch >= latestFullBatch) {
          healthChecks.arweave_published = !!latestSnapshot.arweave_txid;
          if (!latestSnapshot.arweave_txid) {
            issues.push("Latest snapshot not published to Arweave");
          }
        } else {
          healthChecks.arweave_published = true; // Not applicable yet
        }

        // Check if we have all expected snapshots
        const { count: snapshotCount, error: snapshotCountError } = await svc
          .from("snapshot_meta")
          .select("*", { count: "exact", head: true });

        if (snapshotCountError) {
          healthChecks.snapshot_count_correct = false;
          issues.push("Cannot verify snapshot count");
        } else {
          healthChecks.snapshot_count_correct = snapshotCount === expectedBatches;
          if (!healthChecks.snapshot_count_correct) {
            issues.push(`Expected ${expectedBatches} snapshots, found ${snapshotCount}`);
          }
        }
      }
    } else {
      // Not enough proofs for snapshots yet
      healthChecks.snapshot_exists = true; // Not applicable
      healthChecks.snapshot_recent = true; // Not applicable
      healthChecks.arweave_published = true; // Not applicable
      healthChecks.snapshot_count_correct = true; // Not applicable
    }

    // Overall health status
    const overallHealthy = Object.values(healthChecks).every((check) => check === true);
    const status = overallHealthy ? "healthy" : "unhealthy";

    logger.info(
      {
        totalProofs,
        healthChecks,
        issues,
        status,
      },
      "Integrity health check completed",
    );

    return jsonOk({
      status,
      total_proofs: totalProofs || 0,
      checks: healthChecks,
      issues,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    capture(error, { route: "/api/integrity/health" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Integrity health check failed",
    );
    return jsonErr("Internal server error", 500);
  }
}

export const GET = handleIntegrityHealth;
