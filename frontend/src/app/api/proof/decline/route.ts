import { NextRequest } from "next/server";
import { jsonOk, jsonErr } from "@/lib/http";
import { supabaseService } from "@/lib/db";
import { recordStateTransition } from "@/lib/signoff-state-machine";
import { getRequestId } from "@/lib/request-id";
import { capture } from "@/lib/observability";
import { z } from "zod";

const DeclineProofSchema = z.object({
  proof_id: z.string().length(26),
  reason: z.string().min(10).max(500),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const body = await req.json();
    const { proof_id, reason } = DeclineProofSchema.parse(body);

    const db = supabaseService();

    const { data: proof, error: fetchError } = await db
      .from("proofs")
      .select("*")
      .eq("id", proof_id)
      .single();

    if (fetchError || !proof) {
      return jsonErr("NOT_FOUND", "Proof not found", requestId, 404);
    }

    const validStatuses = ["sent", "viewed_no_action"];
    if (!validStatuses.includes(proof.acceptance_status)) {
      return jsonErr("BAD_REQUEST", "Proof not available for decline", requestId, 400);
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await recordStateTransition(db, proof_id, {
      from: proof.acceptance_status,
      to: "declined",
      actorIp: clientIp,
      actorUserAgent: userAgent,
      notes: reason,
    });

    return jsonOk(
      {
        proof_id,
        status: "declined",
        declined_at: new Date().toISOString(),
        reason,
      },
      requestId,
    );
  } catch (error) {
    capture(error, { route: "/api/proof/decline", requestId });
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}
