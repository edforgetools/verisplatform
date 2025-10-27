import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/db";
import { downloadProofFromRegistry } from "@/lib/s3-registry";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Registry search endpoint as specified in MVP checklist:
 * GET /v1/registry/search?hash= resolves proof id
 *
 * This endpoint searches for proofs by content hash across multiple sources:
 * 1. S3 Registry (primary)
 * 2. Database (fallback)
 * 3. Local registry files (development)
 */
async function handleRegistrySearch(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const hash = url.searchParams.get("hash");

    if (!hash) {
      return jsonErr("VALIDATION_ERROR", "Hash parameter is required", "registry-search", 400);
    }

    // Validate hash format (should be 64 character hex string)
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return jsonErr(
        "VALIDATION_ERROR",
        "Invalid hash format. Expected 64 character hex string.",
        "registry-search",
        400,
      );
    }

    logger.info({ hash, event: "registry_search_initiated" }, "Registry search initiated");

    // Try S3 registry first (primary source)
    try {
      const proof = await downloadProofFromRegistry(hash, true);
      if (proof) {
        logger.info({ hash, source: "s3", event: "proof_found_s3" }, "Proof found in S3 registry");
        return jsonOk(
          {
            found: true,
            proof_id: proof.proof_id,
            source: "s3",
            proof_url: `https://${process.env.REGISTRY_S3_PRODUCTION_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/registry/proofs/${proof.proof_id}.json`,
            hash: proof.sha256,
            issued_at: proof.issued_at,
            signer: proof.issuer,
          },
          "registry-search",
        );
      }
    } catch (error) {
      logger.warn(
        { hash, error: error instanceof Error ? error.message : error, event: "s3_search_failed" },
        "S3 registry search failed",
      );
    }

    // Fallback to database
    try {
      const svc = supabaseService();
      const { data: proof, error } = await svc
        .from("proofs")
        .select("id, hash_full, timestamp, created_at")
        .eq("hash_full", hash)
        .single();

      if (proof && !error) {
        logger.info(
          { hash, source: "database", event: "proof_found_database" },
          "Proof found in database",
        );
        return jsonOk(
          {
            found: true,
            proof_id: proof.id,
            source: "database",
            proof_url: `/api/proof/${proof.id}`,
            hash: proof.hash_full,
            issued_at: proof.timestamp,
            signer: "database", // Database doesn't store signer fingerprint
          },
          "registry-search",
        );
      }
    } catch (error) {
      logger.warn(
        {
          hash,
          error: error instanceof Error ? error.message : error,
          event: "database_search_failed",
        },
        "Database search failed",
      );
    }

    // Not found in any source
    logger.info({ hash, event: "proof_not_found" }, "Proof not found in any registry source");
    return jsonOk(
      {
        found: false,
        hash,
        message: "Proof not found in registry",
      },
      "registry-search",
    );
  } catch (error) {
    capture(error, { route: "/api/registry/search", event: "registry_search_error" });
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        event: "registry_search_error",
      },
      "Registry search error",
    );
    return jsonErr("INTERNAL_ERROR", "Internal server error", "registry-search", 500);
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleRegistrySearch, "/api/registry/search", {
  capacity: 200, // 200 requests per minute for registry search
  refillRate: 200 / 60, // 200 tokens per minute
  windowMs: 60000, // 1 minute window
});
