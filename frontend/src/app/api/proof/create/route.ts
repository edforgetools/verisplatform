import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { signHash } from "@/lib/crypto-server";
import { assertEntitled } from "@/lib/entitlements";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { streamFileToTmp, cleanupTmpFile } from "@/lib/file-upload";
import { generateProofId } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { createCanonicalProof, canonicalizeAndSign } from "@/lib/proof-schema";
import { recordBillingEvent } from "@/lib/billing-service";
import { withIdempotency } from "@/lib/idempotency";

export const runtime = "nodejs";

async function handleCreateProof(req: NextRequest) {
  let tmpPath: string | null = null;

  try {
    // Get authenticated user ID from request
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      logger.warn("Proof creation attempted without authentication");
      return jsonErr("Authentication required", 401);
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const userId = form.get("user_id") as string | null;
    const project = (form.get("project") as string | null) ?? null;

    if (!file || !userId) {
      return jsonErr("file and user_id required", 400);
    }

    // Validate user_id matches authenticated user
    if (userId !== authenticatedUserId) {
      logger.warn(
        {
          authenticatedUserId,
          providedUserId: userId,
        },
        "Proof creation attempted with mismatched user_id",
      );
      return jsonErr("user_id must match authenticated user", 403);
    }

    // Check entitlement for creating proofs
    try {
      await assertEntitled(userId, "create_proof");
    } catch {
      logger.warn(
        {
          userId,
        },
        "Proof creation attempted without sufficient permissions",
      );
      return jsonErr("Insufficient permissions to create proofs", 403);
    }

    // Stream file to temporary location and compute hash
    // This also validates MIME type against allow-list
    const { tmpPath: fileTmpPath, hashFull, hashPrefix } = await streamFileToTmp(file);
    tmpPath = fileTmpPath;

    const ts = new Date().toISOString();
    const proofId = generateProofId();

    // Create canonical proof with schema v1
    const subject = {
      type: "file",
      namespace: "veris",
      id: proofId,
    };

    const metadata = {
      file_name: file.name,
      project: project || null,
      user_id: userId,
    };

    const canonicalProof = createCanonicalProof(hashFull, subject, metadata);
    const signedProof = canonicalizeAndSign(canonicalProof);

    const svc = supabaseService();
    const { data, error } = await svc
      .from("proofs")
      .insert({
        id: proofId,
        user_id: userId,
        file_name: file.name,
        version: 1,
        hash_full: hashFull,
        hash_prefix: hashPrefix,
        signature: signedProof.signature,
        timestamp: ts,
        project,
        visibility: "public",
        proof_json: signedProof,
      })
      .select()
      .single();

    if (error) {
      logger.error(
        {
          userId,
          fileName: file.name,
          error: error.message,
        },
        "Failed to create proof in database",
      );
      return jsonErr(error.message, 500);
    }

    logger.info(
      {
        proofId: data.id,
        userId,
        fileName: file.name,
        project,
      },
      "Proof created successfully",
    );

    // Record billing event for successful proof creation
    await recordBillingEvent({
      type: "proof.create",
      userId,
      proofId: data.id,
      success: true,
      metadata: {
        file_name: file.name,
        project,
        hash_prefix: hashPrefix,
      },
    });

    return jsonOk({
      id: data.id,
      hash_prefix: hashPrefix,
      timestamp: ts,
      url: `/proof/${data.id}`,
    });
  } catch (error) {
    capture(error, { route: "/api/proof/create" });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Invalid file type")) {
        return jsonErr(error.message, 400);
      }
    }

    return jsonErr("Internal server error", 500);
  } finally {
    // Clean up temporary file
    if (tmpPath) {
      cleanupTmpFile(tmpPath);
    }
  }
}

// Apply rate limiting and idempotency to the POST handler
export const POST = withRateLimit(
  withIdempotency(handleCreateProof, 10), // 10 minute idempotency TTL
  "/api/proof/create",
  {
    capacity: 10, // 10 requests per minute
    refillRate: 10 / 60, // 10 tokens per minute
    windowMs: 60000, // 1 minute window
  },
);
