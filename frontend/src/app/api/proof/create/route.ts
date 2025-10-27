import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { sha256 } from "@/lib/ed25519-crypto";
import { assertEntitled } from "@/lib/entitlements";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import {
  jsonOk,
  jsonErr,
  createAuthError,
  createValidationError,
  createInternalError,
  ErrorCodes,
} from "@/lib/http";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { streamFileToTmp, cleanupTmpFile } from "@/lib/file-upload";
import { generateProofId } from "@/lib/ids";
import { createRequestLogger, logger } from "@/lib/logger";
import { createCanonicalProof } from "@/lib/proof-schema";
import { recordBillingEvent } from "@/lib/billing-service";
import { recordProofCreation, recordApiCall } from "@/lib/usage-telemetry";
import { withIdempotency } from "@/lib/idempotency";
import {
  validateCreateProofRequest,
  validateCreateProofResponse,
  CreateProofRequest,
  CreateProofResponse,
} from "@/types/proof-api";
import { getRequestId } from "@/lib/request-id";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

async function handleCreateProof(req: NextRequest) {
  let tmpPath: string | null = null;
  const requestId = getRequestId(req);
  const requestLogger = createRequestLogger(requestId);
  const startTime = Date.now();

  try {
    // Get authenticated user ID from request
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      requestLogger.warn(
        {
          event: "auth_required",
          route: "/api/proof/create",
        },
        "Proof creation attempted without authentication",
      );
      return createAuthError(requestId);
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const userId = form.get("user_id") as string | null;
    const project = (form.get("project") as string | null) ?? null;

    // Validate request using DTOs
    let validatedRequest: CreateProofRequest;
    try {
      validatedRequest = validateCreateProofRequest({
        file,
        user_id: userId,
        project,
      });
    } catch (error) {
      requestLogger.warn(
        {
          event: "validation_failed",
          error: error instanceof Error ? error.message : "Unknown validation error",
          route: "/api/proof/create",
        },
        "Invalid proof creation request",
      );
      return createValidationError(requestId, {
        field: "file",
        reason: "File and user_id are required",
      });
    }

    // Validate user_id matches authenticated user
    if (validatedRequest.user_id !== authenticatedUserId) {
      requestLogger.warn(
        {
          event: "user_id_mismatch",
          route: "/api/proof/create",
        },
        "Proof creation attempted with mismatched user_id",
      );
      return createValidationError(requestId, {
        field: "user_id",
        reason: "User ID does not match authenticated user",
      });
    }

    // Check entitlement for creating proofs
    try {
      await assertEntitled(validatedRequest.user_id, "create_proof");
    } catch {
      requestLogger.warn(
        {
          event: "insufficient_permissions",
          route: "/api/proof/create",
        },
        "Proof creation attempted without sufficient permissions",
      );
      return createValidationError(requestId, {
        field: "permissions",
        reason: "Insufficient permissions to create proofs",
      });
    }

    // Stream file to temporary location and compute hash
    // This also validates MIME type against allow-list
    const {
      tmpPath: fileTmpPath,
      hashFull,
      hashPrefix,
    } = await streamFileToTmp(validatedRequest.file);
    tmpPath = fileTmpPath;

    const ts = new Date().toISOString();

    // Create canonical proof with Ed25519 per MVP §2.1
    const canonicalProof = createCanonicalProof(hashFull);
    const proofId = canonicalProof.proof_id;

    const svc = supabaseService();
    const { data, error } = await svc
      .from("proofs")
      .insert({
        id: proofId,
        user_id: validatedRequest.user_id,
        file_name: validatedRequest.file.name,
        version: 1,
        hash_full: hashFull,
        hash_prefix: hashPrefix,
        signature: canonicalProof.signature,
        timestamp: ts,
        project: validatedRequest.project,
        visibility: "public",
        proof_json: canonicalProof,
      })
      .select()
      .single();

    if (error) {
      logger.error(
        {
          userId: validatedRequest.user_id,
          fileName: validatedRequest.file.name,
          error: error.message,
        },
        "Failed to create proof in database",
      );
      return jsonErr("DB_ERROR", error.message, "proof-create", 500);
    }

    logger.info(
      {
        proofId: data.id,
        userId: validatedRequest.user_id,
        fileName: validatedRequest.file.name,
        project: validatedRequest.project,
      },
      "Proof created successfully",
    );

    // Record billing event for successful proof creation
    await recordBillingEvent({
      type: "proof.create",
      userId: validatedRequest.user_id,
      proofId: data.id,
      success: true,
      metadata: {
        file_name: validatedRequest.file.name,
        project: validatedRequest.project,
        hash_prefix: hashPrefix,
      },
    });

    // Create response using DTOs
    const response: CreateProofResponse = {
      proof_id: data.id,
      hash: hashFull,
      timestamp: ts,
      signature: canonicalProof.signature,
      url: `/proof/${data.id}`,
    };

    // Validate response before sending
    try {
      validateCreateProofResponse(response);
    } catch (error) {
      requestLogger.error(
        {
          event: "response_validation_failed",
          error: error instanceof Error ? error.message : "Unknown validation error",
          proofId: data.id,
          route: "/api/proof/create",
        },
        "Invalid proof creation response",
      );
      return createInternalError(requestId);
    }

    // Log successful proof creation
    logger.info(
      {
        requestId,
        proofId: data.id,
        userId: validatedRequest.user_id,
        fileSize: validatedRequest.file.size,
      },
      "Proof created successfully",
    );

    // Record telemetry metrics
    try {
      await Promise.all([
        recordProofCreation(data.id, validatedRequest.user_id, {
          file_size: validatedRequest.file.size,
          file_type: validatedRequest.file.type,
          project: validatedRequest.project,
        }),
        recordApiCall("/api/proof/create", validatedRequest.user_id, {
          response_time: Date.now() - startTime,
          success: true,
          proof_id: data.id,
        }),
      ]);
    } catch (telemetryError) {
      // Don't fail the request if telemetry fails
      requestLogger.warn(
        {
          event: "telemetry_recording_failed",
          error:
            telemetryError instanceof Error ? telemetryError.message : "Unknown telemetry error",
          proofId: data.id,
        },
        "Failed to record telemetry metrics",
      );
    }

    return jsonOk(response, requestId);
  } catch (error) {
    capture(error, { route: "/api/proof/create", requestId });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Invalid file type")) {
        return createValidationError(requestId, {
          field: "file",
          reason: error.message,
        });
      }
    }

    return createInternalError(requestId);
  } finally {
    // Clean up temporary file
    if (tmpPath) {
      cleanupTmpFile(tmpPath);
    }
  }
}

// Apply middleware to the POST handler
export const POST = withApiMiddleware(
  withIdempotency(
    withRateLimit(handleCreateProof, "/api/proof/create", {
      capacity: 10, // 10 requests per minute
      refillRate: 10 / 60, // 10 tokens per minute
      windowMs: 60000, // 1 minute window
    }),
    10, // 10 minute idempotency TTL
  ),
  "/api/proof/create",
);
