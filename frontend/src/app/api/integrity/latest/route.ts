/**
 * Latest integrity endpoint - returns the latest snapshot metadata
 * GET /api/integrity/latest
 */

import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

async function handleLatestIntegrity(req: NextRequest) {
  try {
    const svc = supabaseService();

    // Get the latest snapshot metadata
    const { data: latestSnapshot, error } = await svc
      .from("snapshot_meta")
      .select("batch, merkle_root, s3_url, arweave_txid, created_at")
      .order("batch", { ascending: false })
      .limit(1)
      .single();

    if (error || !latestSnapshot) {
      logger.warn({ error: error?.message }, "No snapshots found");
      return jsonOk(
        {
          batch: null,
          merkle_root: null,
          s3_url: null,
          arweave_txid: null,
          schema_version: 1,
          message: "No snapshots available yet",
        },
        "integrity-latest",
      );
    }

    logger.info({ batch: latestSnapshot.batch }, "Latest integrity snapshot retrieved");

    return jsonOk(
      {
        batch: latestSnapshot.batch,
        merkle_root: latestSnapshot.merkle_root,
        s3_url: latestSnapshot.s3_url,
        arweave_txid: latestSnapshot.arweave_txid,
        schema_version: 1,
        created_at: latestSnapshot.created_at,
      },
      "integrity-latest",
    );
  } catch (error) {
    capture(error, { route: "/api/integrity/latest" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to get latest integrity snapshot",
    );
    return jsonErr("INTERNAL_ERROR", "Internal server error", "integrity-latest", 500);
  }
}

export const GET = withRateLimit(handleLatestIntegrity, "/api/integrity/latest", {
  capacity: 60, // 60 requests per minute
  refillRate: 1, // 1 token per second
  windowMs: 60000, // 1 minute window
});
