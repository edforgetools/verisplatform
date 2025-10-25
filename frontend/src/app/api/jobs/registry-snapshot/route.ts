/**
 * Registry snapshot job - creates deterministic snapshots every 1,000 proofs
 * POST /api/jobs/registry-snapshot
 */

import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";
import { createRegistrySnapshot } from "@/lib/registry-snapshot";
import { CanonicalProofV1 } from "@/lib/proof-schema";
import { isSnapshotAutomationEnabled } from "@/lib/env";
import { getRequestId } from "@/lib/request-id";

export const runtime = "nodejs";

async function handleRegistrySnapshot(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Feature flag check - snapshot automation disabled by default for MVP
    if (!isSnapshotAutomationEnabled()) {
      logger.info({}, "Registry snapshot job skipped - feature disabled");
      return new Response(null, { status: 204 });
    }

    // Check if this is a manual trigger or scheduled job
    const authHeader = req.headers.get("authorization");
    const isManual = authHeader?.startsWith("Bearer ");

    if (!isManual) {
      // For scheduled jobs, we might want to add additional validation
      // For now, we'll proceed
    }

    const svc = supabaseService();

    // Get total count of proofs
    const { count: totalProofs, error: countError } = await svc
      .from("proofs")
      .select("*", { count: "exact", head: true });

    if (countError) {
      logger.error({ error: countError.message }, "Failed to get total proof count");
      return jsonErr("INTERNAL_ERROR", "Failed to get proof count", requestId, 500);
    }

    if (!totalProofs || totalProofs % 1000 !== 0) {
      // Not a complete batch, return 204 No Content
      logger.info({ totalProofs }, "No complete batch to snapshot");
      return new Response(null, { status: 204 });
    }

    const batch = totalProofs / 1000;

    // Check if this batch already exists
    const { data: existingSnapshot } = await svc
      .from("snapshot_meta")
      .select("id")
      .eq("batch", batch)
      .single();

    if (existingSnapshot) {
      logger.info({ batch }, "Snapshot already exists for batch");
      return new Response(null, { status: 204 });
    }

    // Get proofs for this batch (ordered by primary key)
    const startId = (batch - 1) * 1000 + 1;
    const endId = batch * 1000;

    const { data: proofs, error: proofsError } = await svc
      .from("proofs")
      .select("proof_json")
      .order("id")
      .range(startId - 1, endId - 1); // Supabase uses 0-based indexing

    if (proofsError) {
      logger.error(
        { error: proofsError.message, batch, startId, endId },
        "Failed to fetch proofs for batch",
      );
      return jsonErr("INTERNAL_ERROR", "Failed to fetch proofs", requestId, 500);
    }

    if (!proofs || proofs.length !== 1000) {
      logger.error(
        { batch, expectedCount: 1000, actualCount: proofs?.length || 0 },
        "Incorrect number of proofs for batch",
      );
      return jsonErr("INTERNAL_ERROR", "Incorrect proof count for batch", requestId, 500);
    }

    // Extract canonical proofs from proof_json
    const canonicalProofs: CanonicalProofV1[] = proofs
      .map((p) => p.proof_json)
      .filter((json): json is CanonicalProofV1 => {
        return json !== null && typeof json === "object";
      });

    if (canonicalProofs.length !== 1000) {
      logger.error(
        { batch, expectedCount: 1000, actualCount: canonicalProofs.length },
        "Some proofs missing canonical JSON",
      );
      return jsonErr("INTERNAL_ERROR", "Some proofs missing canonical JSON", requestId, 500);
    }

    // Create snapshot
    const snapshotResult = await createRegistrySnapshot(batch, canonicalProofs);

    // Store snapshot metadata in database
    const { error: insertError } = await svc.from("snapshot_meta").insert({
      batch: snapshotResult.batch,
      count: snapshotResult.count,
      merkle_root: snapshotResult.merkle_root,
      s3_url: snapshotResult.s3_url,
      arweave_txid: null, // Will be set by Arweave publisher
    });

    if (insertError) {
      logger.error({ error: insertError.message, batch }, "Failed to store snapshot metadata");
      return jsonErr("INTERNAL_ERROR", "Failed to store snapshot metadata", requestId, 500);
    }

    logger.info(
      {
        batch: snapshotResult.batch,
        count: snapshotResult.count,
        merkle_root: snapshotResult.merkle_root,
        s3_url: snapshotResult.s3_url,
      },
      "Registry snapshot created successfully",
    );

    return jsonOk(
      {
        batch: snapshotResult.batch,
        count: snapshotResult.count,
        merkle_root: snapshotResult.merkle_root,
        s3_url: snapshotResult.s3_url,
        created_at: new Date().toISOString(),
      },
      requestId,
    );
  } catch (error) {
    capture(error, { route: "/api/jobs/registry-snapshot" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Registry snapshot job failed",
    );
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}

export const POST = handleRegistrySnapshot;
