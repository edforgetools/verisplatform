/**
 * Arweave publisher job - publishes snapshot artifacts to Arweave
 * POST /api/jobs/registry-arweave
 */

import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";
import { publishSnapshotToArweave, isSnapshotPublished } from "@/lib/arweave-publisher";

export const runtime = "nodejs";

interface ArweavePublishRequest {
  batch: number;
}

async function handleArweavePublish(req: NextRequest) {
  try {
    const body = (await req.json()) as ArweavePublishRequest;
    const { batch } = body;

    if (!batch || typeof batch !== "number" || batch <= 0) {
      return jsonErr("Invalid batch number", 400);
    }

    const svc = supabaseService();

    // Check if snapshot exists in database
    const { data: snapshot, error: snapshotError } = await svc
      .from("snapshot_meta")
      .select("id, arweave_txid")
      .eq("batch", batch)
      .single();

    if (snapshotError || !snapshot) {
      logger.warn({ batch, error: snapshotError?.message }, "Snapshot not found for batch");
      return jsonErr("Snapshot not found", 404);
    }

    // Check if already published to Arweave
    if (snapshot.arweave_txid) {
      logger.info(
        { batch, arweave_txid: snapshot.arweave_txid },
        "Snapshot already published to Arweave",
      );
      return jsonOk({
        batch,
        arweave_txid: snapshot.arweave_txid,
        status: "already_published",
      });
    }

    // Check if already published (idempotency check)
    const alreadyPublished = await isSnapshotPublished(batch);
    if (alreadyPublished) {
      logger.info({ batch }, "Snapshot already exists on Arweave");
      return jsonOk({
        batch,
        status: "already_exists_on_arweave",
      });
    }

    // Publish to Arweave
    const publishResult = await publishSnapshotToArweave(batch);

    // Update database with Arweave transaction ID
    const { error: updateError } = await svc
      .from("snapshot_meta")
      .update({ arweave_txid: publishResult.manifestTxId })
      .eq("batch", batch);

    if (updateError) {
      logger.error(
        { error: updateError.message, batch },
        "Failed to update snapshot with Arweave transaction ID",
      );
      return jsonErr("Failed to update snapshot metadata", 500);
    }

    logger.info(
      {
        batch: publishResult.batch,
        manifestTxId: publishResult.manifestTxId,
        jsonlTxId: publishResult.jsonlTxId,
        manifestUrl: publishResult.manifestUrl,
        jsonlUrl: publishResult.jsonlUrl,
      },
      "Snapshot published to Arweave successfully",
    );

    return jsonOk({
      batch: publishResult.batch,
      arweave_txid: publishResult.manifestTxId,
      manifest_txid: publishResult.manifestTxId,
      jsonl_txid: publishResult.jsonlTxId,
      manifest_url: publishResult.manifestUrl,
      jsonl_url: publishResult.jsonlUrl,
      status: "published",
    });
  } catch (error) {
    capture(error, { route: "/api/jobs/registry-arweave" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Arweave publish job failed",
    );
    return jsonErr("Internal server error", 500);
  }
}

export const POST = handleArweavePublish;
