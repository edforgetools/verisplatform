import { NextRequest } from "next/server";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { supabaseService } from "@/lib/db";
import { recordStateTransition } from "@/lib/signoff-state-machine";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { getRequestId } from "@/lib/request-id";
import { capture } from "@/lib/observability";
import { z } from "zod";

const SendProofSchema = z.object({
  proof_id: z.string().length(26),
  recipient_email: z.string().email(),
  message: z.string().max(500).optional(),
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
    const { proof_id, recipient_email, message } = SendProofSchema.parse(body);

    const db = supabaseService();

    // Verify proof ownership and status
    const { data: proof, error: fetchError } = await db
      .from("proofs")
      .select("*")
      .eq("id", proof_id)
      .single();

    if (fetchError || !proof) {
      return jsonErr("NOT_FOUND", "Proof not found", requestId, 404);
    }

    if (proof.user_id !== authenticatedUserId) {
      return jsonErr("UNAUTHORIZED", "Unauthorized", requestId, 403);
    }

    if (proof.acceptance_status !== "issued") {
      return jsonErr("BAD_REQUEST", "Proof must be issued before sending", requestId, 400);
    }

    // Update recipient email
    await db.from("proofs").update({ recipient_email }).eq("id", proof_id);

    // Record state transition
    await recordStateTransition(db, proof_id, {
      from: "issued",
      to: "sent",
      notes: message || "Sign-off request sent",
    });

    // TODO: Send email via service (Resend, SendGrid, etc.)
    // await sendSignOffEmail(recipient_email, proof_id, message);

    return jsonOk(
      {
        proof_id,
        status: "sent",
        recipient_email,
        sign_off_url: `${process.env.NEXT_PUBLIC_SITE_URL}/signoff/${proof_id}`,
      },
      requestId,
    );
  } catch (error) {
    capture(error, { route: "/api/proof/send", requestId });
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}
