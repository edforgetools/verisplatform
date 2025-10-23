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

export const runtime = "nodejs";

async function handleCreateProof(req: NextRequest) {
  let tmpPath: string | null = null;

  try {
    // Get authenticated user ID from request
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
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
      return jsonErr("user_id must match authenticated user", 403);
    }

    // Check entitlement for creating proofs
    try {
      await assertEntitled(userId, "create_proof");
    } catch {
      return jsonErr("Insufficient permissions to create proofs", 403);
    }

    // Stream file to temporary location and compute hash
    // This also validates MIME type against allow-list
    const { tmpPath: fileTmpPath, hashFull, hashPrefix } = await streamFileToTmp(file);
    tmpPath = fileTmpPath;

    const signature = signHash(hashFull);
    const ts = new Date().toISOString();
    const proofId = generateProofId();

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
        signature,
        timestamp: ts,
        project,
        visibility: "public",
      })
      .select()
      .single();

    if (error) {
      return jsonErr(error.message, 500);
    }

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

// Apply rate limiting to the POST handler
export const POST = withRateLimit(handleCreateProof, "/api/proof/create", {
  capacity: 5, // 5 requests
  refillRate: 0.5, // 1 token every 2 seconds
  windowMs: 60000, // 1 minute window
});
