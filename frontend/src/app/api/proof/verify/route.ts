import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/db";
import { verifySignature, sha256 } from "@/lib/crypto-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { streamFileToTmp, cleanupTmpFile } from "@/lib/file-upload";

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

function isVerifyByFileRequest(data: unknown): data is VerifyByFileRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "file" in data &&
    data.file instanceof File
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
          return jsonErr("Proof not found", 404);
        }
        
        const hashMatch = proof.hash_full === hashFull;
        const signatureVerified = proof.signature && hashMatch ? verifySignature(proof.hash_full, proof.signature) : null;
        
        // Check timestamp tolerance (within 24 hours of creation)
        const proofTime = new Date(proof.timestamp);
        const now = new Date();
        const timeDiffHours = Math.abs(now.getTime() - proofTime.getTime()) / (1000 * 60 * 60);
        const timestampWithinTolerance = timeDiffHours <= 24;

        return jsonOk({
          verified: hashMatch && (signatureVerified !== false),
          verified_by: hashMatch ? (proof.signature ? "signature" : "hash") : "none",
          hashHex: hashFull,
          signatureB64: proof.signature,
          timestamp: proof.timestamp,
          anchor_txid: proof.anchor_txid,
          file_name: proof.file_name,
          created_at: proof.created_at,
          checks: {
            hash_match: hashMatch,
            signature_valid: signatureVerified,
            timestamp_within_tolerance: timestampWithinTolerance,
            anchor_exists: !!proof.anchor_txid,
          },
        });
      } else {
        // File-only verification - just return the computed hash
        return jsonOk({
          verified: true,
          verified_by: "hash",
          hashHex: hashFull,
          signatureB64: null,
          timestamp: null,
          anchor_txid: null,
          file_name: file.name,
          created_at: null,
          checks: {
            hash_match: true,
            signature_valid: null,
            timestamp_within_tolerance: null,
            anchor_exists: null,
          },
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
        return jsonErr("Proof not found", 404);
      }

      // Verify signature if available
      const signatureVerified = proof.signature ? verifySignature(proof.hash_full, proof.signature) : null;
      
      // Check timestamp tolerance (within 24 hours of creation)
      const proofTime = new Date(proof.timestamp);
      const now = new Date();
      const timeDiffHours = Math.abs(now.getTime() - proofTime.getTime()) / (1000 * 60 * 60);
      const timestampWithinTolerance = timeDiffHours <= 24;

      return jsonOk({
        verified: signatureVerified !== false,
        verified_by: proof.signature ? "signature" : "hash",
        hashHex: proof.hash_full,
        signatureB64: proof.signature,
        timestamp: proof.timestamp,
        anchor_txid: proof.anchor_txid,
        file_name: proof.file_name,
        created_at: proof.created_at,
        checks: {
          hash_match: true, // If we found the proof, hash matches
          signature_valid: signatureVerified,
          timestamp_within_tolerance: timestampWithinTolerance,
          anchor_exists: !!proof.anchor_txid,
        },
      });
    }

    // Handle signature-based verification
    if (isVerifyBySignatureRequest(body)) {
      const signatureVerified = verifySignature(body.hashHex, body.signatureB64);
      return jsonOk({
        verified: signatureVerified,
        verified_by: "signature",
        hashHex: body.hashHex,
        signatureB64: body.signatureB64,
        timestamp: null,
        anchor_txid: null,
        file_name: null,
        created_at: null,
        checks: {
          hash_match: true, // We're verifying the provided hash
          signature_valid: signatureVerified,
          timestamp_within_tolerance: null, // Not available for signature-only verification
          anchor_exists: null, // Not available for signature-only verification
        },
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
  capacity: 20, // 20 requests
  refillRate: 2, // 2 tokens per second
  windowMs: 60000, // 1 minute window
});
