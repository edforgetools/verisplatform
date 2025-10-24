import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { verifySignature } from "@/lib/crypto-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { streamFileToTmp, cleanupTmpFile } from "@/lib/file-upload";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface VerifyByIdRequest {
  id: string;
}

interface VerifyBySignatureRequest {
  hashHex: string;
  signatureB64: string;
}

interface VerifyByFileRequest {
  file: File;
}

function isVerifyByIdRequest(data: unknown): data is VerifyByIdRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof (data as { id: unknown }).id === "string" &&
    (data as { id: string }).id.length > 0
  );
}

function isVerifyBySignatureRequest(data: unknown): data is VerifyBySignatureRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "hashHex" in data &&
    "signatureB64" in data &&
    typeof (data as { hashHex: unknown }).hashHex === "string" &&
    typeof (data as { signatureB64: unknown }).signatureB64 === "string" &&
    (data as { hashHex: string }).hashHex.length > 0 &&
    (data as { signatureB64: string }).signatureB64.length > 0
  );
}


async function handleVerifyProof(req: NextRequest) {
  let tmpPath: string | null = null;

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle FormData (file upload)
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const proofId = form.get("proof_id") as string | null;

      if (!file) {
        return jsonErr("File is required for file-based verification", 400);
      }

      // Stream file to temporary location and compute hash
      const { tmpPath: fileTmpPath, hashFull } = await streamFileToTmp(file);
      tmpPath = fileTmpPath;

      // If proof_id is provided, verify against that specific proof
      if (proofId) {
        const svc = supabaseService();
        const { data: proof, error } = await svc
          .from("proofs")
          .select("hash_full, signature, timestamp, anchor_txid, file_name, created_at")
          .eq("id", proofId)
          .single();

        if (error || !proof) {
          logger.warn(
            {
              proofId,
              fileName: file.name,
            },
            "Proof verification failed - proof not found",
          );
          return jsonErr("Proof not found", 404);
        }

        const hashMatch = proof.hash_full === hashFull;
        const signatureVerified =
          proof.signature && hashMatch ? verifySignature(proof.hash_full, proof.signature) : null;

        // Check timestamp tolerance (within 24 hours of creation)
        const proofTime = new Date(proof.timestamp);
        const now = new Date();
        const timeDiffHours = Math.abs(now.getTime() - proofTime.getTime()) / (1000 * 60 * 60);
        const timestampWithinTolerance = timeDiffHours <= 24;

        logger.info(
          {
            proofId,
            fileName: file.name,
            hashMatch,
            signatureVerified,
            timestampWithinTolerance,
            anchorExists: !!proof.anchor_txid,
          },
          "Proof verification completed",
        );

        return jsonOk({
          schema_version: 1,
          proof_hash: hashFull,
          valid: hashMatch && signatureVerified !== false,
          verified_at: new Date().toISOString(),
          signer_fp: proof.signature ? "veris-signing-key" : null, // TODO: Get actual fingerprint
          source_registry: "primary",
          errors: [],
        });
      } else {
        // File-only verification - just return the computed hash
        return jsonOk({
          schema_version: 1,
          proof_hash: hashFull,
          valid: true,
          verified_at: new Date().toISOString(),
          signer_fp: null,
          source_registry: "primary",
          errors: [],
        });
      }
    }

    // Handle JSON requests
    const body = await req.json();

    // Validate input format
    if (!isVerifyByIdRequest(body) && !isVerifyBySignatureRequest(body)) {
      return jsonErr("Invalid input: must provide either { id } or { hashHex, signatureB64 }", 400);
    }

    // Handle ID-based verification (preferred signature path)
    if (isVerifyByIdRequest(body)) {
      const svc = supabaseService();
      const { data: proof, error } = await svc
        .from("proofs")
        .select("hash_full, signature, timestamp, anchor_txid, file_name, created_at")
        .eq("id", body.id)
        .single();

      if (error || !proof) {
        logger.warn(
          {
            proofId: body.id,
          },
          "Proof verification failed - proof not found",
        );
        return jsonErr("Proof not found", 404);
      }

      // Verify signature if available
      const signatureVerified = proof.signature
        ? verifySignature(proof.hash_full, proof.signature)
        : null;

      // Check timestamp tolerance (within 24 hours of creation)
      const proofTime = new Date(proof.timestamp);
      const now = new Date();
      const timeDiffHours = Math.abs(now.getTime() - proofTime.getTime()) / (1000 * 60 * 60);
      const timestampWithinTolerance = timeDiffHours <= 24;

      logger.info(
        {
          proofId: body.id,
          fileName: proof.file_name,
          signatureVerified,
          timestampWithinTolerance,
          anchorExists: !!proof.anchor_txid,
        },
        "Proof verification completed",
      );

      return jsonOk({
        schema_version: 1,
        proof_hash: proof.hash_full,
        valid: signatureVerified !== false,
        verified_at: new Date().toISOString(),
        signer_fp: proof.signature ? "veris-signing-key" : null, // TODO: Get actual fingerprint
        source_registry: "primary",
        errors: [],
      });
    }

    // Handle signature-based verification
    if (isVerifyBySignatureRequest(body)) {
      const signatureVerified = verifySignature(body.hashHex, body.signatureB64);

      logger.info(
        {
          signatureVerified,
        },
        "Signature-based proof verification completed",
      );

      return jsonOk({
        schema_version: 1,
        proof_hash: body.hashHex,
        valid: signatureVerified,
        verified_at: new Date().toISOString(),
        signer_fp: signatureVerified ? "veris-signing-key" : null, // TODO: Get actual fingerprint
        source_registry: "primary",
        errors: signatureVerified ? [] : ["Signature verification failed"],
      });
    }

    // This should never be reached due to the validation above
    return jsonErr("Invalid request format", 400);
  } catch (error) {
    capture(error, { route: "/api/proof/verify" });
    return jsonErr("Malformed request body", 400);
  } finally {
    // Clean up temporary file if it was created
    if (tmpPath) {
      await cleanupTmpFile(tmpPath);
    }
  }
}

// Apply rate limiting to the POST handler
export const POST = withRateLimit(handleVerifyProof, "/api/proof/verify", {
  capacity: 10, // 10 requests per minute
  refillRate: 10 / 60, // 10 tokens per minute
  windowMs: 60000, // 1 minute window
});
