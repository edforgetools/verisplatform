import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/db";
import { downloadProofFromRegistry } from "@/lib/s3-registry";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

/**
 * Registry retrieval endpoint as specified in MVP checklist:
 * GET /v1/registry/:id returns proof JSON
 *
 * This endpoint retrieves proofs by ID from multiple sources:
 * 1. S3 Registry (primary)
 * 2. Database (fallback)
 * 3. Local registry files (development)
 */
async function handleRegistryGet(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return jsonErr("VALIDATION_ERROR", "Proof ID is required", "registry-get", 400);
    }

    logger.info(
      { proofId: id, event: "registry_retrieval_initiated" },
      "Registry retrieval initiated",
    );

    // Try S3 registry first (primary source)
    try {
      const proof = await downloadProofFromRegistry(id, true);
      if (proof) {
        logger.info(
          { proofId: id, source: "s3", event: "proof_retrieved_s3" },
          "Proof retrieved from S3 registry",
        );
        return jsonOk(proof, "registry-get");
      }
    } catch (error) {
      logger.warn(
        {
          proofId: id,
          error: error instanceof Error ? error.message : error,
          event: "s3_retrieval_failed",
        },
        "S3 registry retrieval failed",
      );
    }

    // Fallback to database
    try {
      const svc = supabaseService();
      const { data: proof, error } = await svc.from("proofs").select("*").eq("id", id).single();

      if (proof && !error) {
        logger.info(
          { proofId: id, source: "database", event: "proof_retrieved_database" },
          "Proof retrieved from database",
        );
        return jsonOk(proof, "registry-get");
      }
    } catch (error) {
      logger.warn(
        {
          proofId: id,
          error: error instanceof Error ? error.message : error,
          event: "database_retrieval_failed",
        },
        "Database retrieval failed",
      );
    }

    // Fallback to local registry files (development)
    try {
      const registryPath = join(process.cwd(), "frontend", "registry", `${id}.json`);
      const proofContent = await readFile(registryPath, "utf8");
      const proof = JSON.parse(proofContent);

      logger.info(
        { proofId: id, source: "local", event: "proof_retrieved_local" },
        "Proof retrieved from local registry",
      );
      return jsonOk(proof, "registry-get");
    } catch (error) {
      logger.warn(
        {
          proofId: id,
          error: error instanceof Error ? error.message : error,
          event: "local_retrieval_failed",
        },
        "Local registry retrieval failed",
      );
    }

    // Not found in any source
    logger.info(
      { proofId: id, event: "proof_not_found" },
      "Proof not found in any registry source",
    );
    return jsonErr("RESOURCE_NOT_FOUND", "Proof not found", "registry-get", 404);
  } catch (error) {
    capture(error, { route: "/api/registry/[id]", event: "registry_retrieval_error" });
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        event: "registry_retrieval_error",
      },
      "Registry retrieval error",
    );
    return jsonErr("INTERNAL_ERROR", "Internal server error", "registry-get", 500);
  }
}

// Wrapper function for rate limiting
async function handleRegistryGetWrapper(req: NextRequest): Promise<NextResponse> {
  // Extract the ID from the URL path
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const id = pathParts[pathParts.length - 1];

  return handleRegistryGet(req, { params: Promise.resolve({ id }) });
}

// Apply rate limiting
export const GET = withRateLimit(handleRegistryGetWrapper, "/api/registry/[id]", {
  capacity: 300, // 300 requests per minute for registry retrieval
  refillRate: 300 / 60, // 300 tokens per minute
  windowMs: 60000, // 1 minute window
});
