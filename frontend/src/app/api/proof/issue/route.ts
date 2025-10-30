import { NextRequest } from "next/server";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { supabaseService } from "@/lib/db";
import { recordStateTransition } from "@/lib/signoff-state-machine";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { getRequestId } from "@/lib/request-id";
import { capture } from "@/lib/observability";
import { z } from "zod";

const IssueProofSchema = z.object({
  proof_id: z.string().length(26), // ULID
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    const body = await req.json();
    const { proof_id } = IssueProofSchema.parse(body);

    const db = supabaseService();

    // Verify proof belongs to user
    const { data: proof, error: fetchError } = await db
      .from("proofs")
      .select("id, acceptance_status, user_id")
      .eq("id", proof_id)
      .single();

    if (fetchError || !proof) {
      return jsonErr("NOT_FOUND", "Proof not found", requestId, 404);
    }

    if (proof.user_id !== authenticatedUserId) {
      return jsonErr("UNAUTHORIZED", "Unauthorized", requestId, 403);
    }

    if (proof.acceptance_status !== "draft") {
      return jsonErr("BAD_REQUEST", "Proof already issued", requestId, 400);
    }

    // Record state transition
    await recordStateTransition(db, proof_id, {
      from: "draft",
      to: "issued",
      notes: "Proof issued by creator",
    });

    return jsonOk({ proof_id, status: "issued" }, requestId);
  } catch (error) {
    capture(error, { route: "/api/proof/issue", requestId });
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}
