import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/db";
import { verifySignature, getKeyFingerprint } from "@/lib/crypto-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { streamFileToTmp, cleanupTmpFile } from "@/lib/file-upload";
import { logger } from "@/lib/logger";
import { downloadProofFromRegistry } from "@/lib/s3-registry";
import { verifyCanonicalProof } from "@/lib/proof-schema";
import { recordProofVerification, recordApiCall } from "@/lib/usage-telemetry";
import { getRequestId } from "@/lib/request-id";
import { ENV } from "@/lib/env";

export const runtime = "nodejs";

interface VerifyByHashRequest {
  hash: string;
}

interface VerifyByFileRequest {
  file: File;
}

interface VerificationResult {
  valid: boolean;
  signer: string;
  issued_at: string;
  latency_ms: number;
  errors: string[];
}

/**
 * Validate timestamp is within acceptable window
 */
function validateTimestampWindow(issuedAt: string): { valid: boolean; error?: string } {
  const timestampToleranceMs =
    ENV.server.VERIFICATION_TIMESTAMP_TOLERANCE_MS || 24 * 60 * 60 * 1000; // Default 24 hours
  const now = Date.now();
  const issuedTime = new Date(issuedAt).getTime();

  if (isNaN(issuedTime)) {
    return { valid: false, error: "Invalid timestamp format" };
  }

  const timeDiff = Math.abs(now - issuedTime);
  if (timeDiff > timestampToleranceMs) {
    return {
      valid: false,
      error: `Timestamp outside tolerance window (${Math.round(
        timeDiff / 1000 / 60 / 60,
      )}h > ${Math.round(timestampToleranceMs / 1000 / 60 / 60)}h)`,
    };
  }

  return { valid: true };
}

/**
 * Enhanced verification endpoint as specified in MVP checklist:
 * 1. Accepts proof hash as a query parameter or uploaded file
 * 2. Fetches the corresponding proof from S3 registry or database
 * 3. Verifies the signature using the public key
 * 4. Validates timestamp is within acceptable window
 * 5. Returns {valid: boolean, signer, issued_at, latency_ms}
 * 6. Logs response latency and success rate
 */
async function handleVerify(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  let tmpPath: string | null = null;

  try {
    const url = new URL(req.url);
    const hash = url.searchParams.get("hash");
    const contentType = req.headers.get("content-type") || "";

    // Handle hash-based verification (primary method)
    if (hash) {
      return await verifyByHash(hash, startTime, requestId);
    }

    // Handle file-based verification
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;

      if (!file) {
        return jsonErr(
          "VALIDATION_ERROR",
          "File is required for file-based verification",
          requestId,
          400,
        );
      }

      // Stream file to temporary location and compute hash
      const { tmpPath: fileTmpPath, hashFull } = await streamFileToTmp(file);
      tmpPath = fileTmpPath;

      return await verifyByHash(hashFull, startTime, requestId);
    }

    // Handle JSON body verification
    if (contentType.includes("application/json")) {
      const body = await req.json();

      if (body.hash) {
        return await verifyByHash(body.hash, startTime, requestId);
      }
    }

    return jsonErr("VALIDATION_ERROR", "Hash parameter or file is required", requestId, 400);
  } catch (error) {
    const latency = Date.now() - startTime;
    capture(error, { route: "/api/verify", latency });

    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        latency,
      },
      "Verification endpoint error",
    );

    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  } finally {
    // Clean up temporary file if it was created
    if (tmpPath) {
      await cleanupTmpFile(tmpPath);
    }
  }
}

/**
 * Verify proof by hash - tries multiple sources
 */
async function verifyByHash(
  hash: string,
  startTime: number,
  requestId: string,
): Promise<NextResponse> {
  const errors: string[] = [];
  let result: VerificationResult | null = null;

  // Try S3 registry first (primary source)
  try {
    result = await verifyFromS3Registry(hash);
    if (result.valid) {
      return await returnVerificationResult(result, startTime, hash, requestId);
    }
    errors.push(...result.errors);
  } catch (error) {
    errors.push(`S3 registry error: ${error instanceof Error ? error.message : error}`);
  }

  // Fallback to Supabase database
  try {
    result = await verifyFromDatabase(hash);
    if (result.valid) {
      return await returnVerificationResult(result, startTime, hash, requestId);
    }
    errors.push(...result.errors);
  } catch (error) {
    errors.push(`Database error: ${error instanceof Error ? error.message : error}`);
  }

  // Return failure result
  const latency = Date.now() - startTime;
  const failureResult: VerificationResult = {
    valid: false,
    signer: "",
    issued_at: new Date().toISOString(),
    latency_ms: latency,
    errors,
  };

  logger.warn(
    {
      hash,
      latency,
      errors,
    },
    "Proof verification failed from all sources",
  );

  return jsonOk(failureResult, requestId);
}

/**
 * Verify proof from S3 registry
 */
async function verifyFromS3Registry(hash: string): Promise<VerificationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Try to find proof by hash in S3 registry
    const proof = await downloadProofFromRegistry(hash, true);

    if (!proof) {
      return {
        valid: false,
        signer: "",
        issued_at: new Date().toISOString(),
        latency_ms: Date.now() - startTime,
        errors: ["Proof not found in S3 registry"],
      };
    }

    // Verify the canonical proof signature
    const signatureValid = verifyCanonicalProof(proof);
    if (!signatureValid) {
      errors.push("Signature verification failed");
    }

    // Validate timestamp window
    const timestampValidation = validateTimestampWindow(proof.signed_at);
    if (!timestampValidation.valid) {
      errors.push(timestampValidation.error || "Timestamp validation failed");
    }

    const isValid = signatureValid && timestampValidation.valid;

    return {
      valid: isValid,
      signer: proof.signer_fingerprint,
      issued_at: proof.signed_at,
      latency_ms: Date.now() - startTime,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      signer: "",
      issued_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Verify proof from database (fallback)
 */
async function verifyFromDatabase(hash: string): Promise<VerificationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const svc = supabaseService();
    const { data: proof, error } = await svc
      .from("proofs")
      .select("hash_full, signature, timestamp, created_at")
      .eq("hash_full", hash)
      .single();

    if (error || !proof) {
      return {
        valid: false,
        signer: "",
        issued_at: new Date().toISOString(),
        latency_ms: Date.now() - startTime,
        errors: ["Proof not found in database"],
      };
    }

    // Verify signature if available
    const signatureVerified = proof.signature
      ? verifySignature(proof.hash_full, proof.signature)
      : false;

    if (!signatureVerified) {
      errors.push("Signature verification failed");
    }

    // Validate timestamp window
    const timestampValidation = validateTimestampWindow(proof.timestamp);
    if (!timestampValidation.valid) {
      errors.push(timestampValidation.error || "Timestamp validation failed");
    }

    const signerFingerprint = getKeyFingerprint() || "unknown";
    const isValid = signatureVerified && timestampValidation.valid;

    return {
      valid: isValid,
      signer: signerFingerprint,
      issued_at: proof.timestamp,
      latency_ms: Date.now() - startTime,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      signer: "",
      issued_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Return verification result with proper formatting
 */
async function returnVerificationResult(
  result: VerificationResult,
  startTime: number,
  proofId: string,
  requestId: string,
): Promise<NextResponse> {
  const totalLatency = Date.now() - startTime;

  // Log success metrics
  logger.info(
    {
      valid: result.valid,
      latency: totalLatency,
      signer: result.signer,
    },
    "Proof verification completed",
  );

  // Record telemetry metrics
  try {
    await Promise.all([
      recordProofVerification(proofId || "unknown", undefined, {
        verification_method: "hash",
        success: result.valid,
        latency_ms: totalLatency,
        signer: result.signer,
        errors: result.errors,
      }),
      recordApiCall("/api/verify", undefined, {
        response_time: totalLatency,
        success: result.valid,
        verification_method: "hash",
      }),
    ]);
  } catch (telemetryError) {
    // Don't fail the request if telemetry fails
    logger.warn(
      {
        event: "telemetry_recording_failed",
        error: telemetryError instanceof Error ? telemetryError.message : "Unknown telemetry error",
        proofId: proofId,
      },
      "Failed to record telemetry metrics",
    );
  }

  return jsonOk(
    {
      valid: result.valid,
      signer: result.signer,
      issued_at: result.issued_at,
      latency_ms: totalLatency,
      errors: result.errors,
    },
    requestId,
  );
}

// Apply rate limiting to the GET handler
export const GET = withRateLimit(handleVerify, "/api/verify", {
  capacity: 100, // 100 requests per minute for public verification
  refillRate: 100 / 60, // 100 tokens per minute
  windowMs: 60000, // 1 minute window
});

// Also support POST for file uploads
export const POST = withRateLimit(handleVerify, "/api/verify", {
  capacity: 50, // 50 requests per minute for file uploads
  refillRate: 50 / 60, // 50 tokens per minute
  windowMs: 60000, // 1 minute window
});
