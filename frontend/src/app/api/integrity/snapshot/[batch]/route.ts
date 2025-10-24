/**
 * Snapshot-specific integrity endpoint - returns snapshot metadata and URLs
 * GET /api/integrity/snapshot/[batch]
 */

import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function handleSnapshotIntegrity(
  req: NextRequest,
  { params }: { params: Promise<{ batch: string }> },
) {
  try {
    const { batch: batchStr } = await params;
    const batch = parseInt(batchStr, 10);

    if (isNaN(batch) || batch <= 0) {
      return jsonErr("Invalid batch number", 400);
    }

    const svc = supabaseService();

    // Get snapshot metadata
    const { data: snapshot, error } = await svc
      .from("snapshot_meta")
      .select("batch, count, merkle_root, s3_url, arweave_txid, created_at")
      .eq("batch", batch)
      .single();

    if (error || !snapshot) {
      logger.warn({ batch, error: error?.message }, "Snapshot not found");
      return jsonErr("Snapshot not found", 404);
    }

    // Construct URLs for the snapshot artifacts
    const bucket = process.env.REGISTRY_S3_BUCKET;
    const prefix = process.env.REGISTRY_S3_PREFIX || "registry/";
    const region = process.env.AWS_REGION || "us-east-1";
    const gatewayUrl = process.env.ARWEAVE_GATEWAY_URL || "https://arweave.net";

    const manifestUrl = `https://${bucket}.s3.${region}.amazonaws.com/${prefix}snapshots/${batch}.manifest.json`;
    const jsonlUrl = `https://${bucket}.s3.${region}.amazonaws.com/${prefix}snapshots/${batch}.jsonl.gz`;

    const arweaveManifestUrl = snapshot.arweave_txid
      ? `${gatewayUrl}/${snapshot.arweave_txid}`
      : null;
    const arweaveJsonlUrl = snapshot.arweave_txid ? `${gatewayUrl}/${snapshot.arweave_txid}` : null; // Note: This would need the actual JSONL txid

    logger.info({ batch }, "Snapshot integrity data retrieved");

    return jsonOk({
      batch: snapshot.batch,
      count: snapshot.count,
      merkle_root: snapshot.merkle_root,
      schema_version: 1,
      created_at: snapshot.created_at,
      urls: {
        s3: {
          manifest: manifestUrl,
          jsonl: jsonlUrl,
        },
        arweave: {
          manifest: arweaveManifestUrl,
          jsonl: arweaveJsonlUrl,
        },
      },
      arweave_txid: snapshot.arweave_txid,
    });
  } catch (error) {
    capture(error, { route: "/api/integrity/snapshot/[batch]" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to get snapshot integrity data",
    );
    return jsonErr("Internal server error", 500);
  }
}

export const GET = handleSnapshotIntegrity;
