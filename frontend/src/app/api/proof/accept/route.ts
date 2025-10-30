import { NextRequest } from "next/server";
import { jsonOk, jsonErr } from "@/lib/http";
import { supabaseService } from "@/lib/db";
import { recordStateTransition } from "@/lib/signoff-state-machine";
import { getRequestId } from "@/lib/request-id";
import { capture } from "@/lib/observability";
import { z } from "zod";

const AcceptProofSchema = z.object({
  proof_id: z.string().length(26),
  acceptance_confirmed: z.boolean().refine((v) => v === true, {
    message: "Must explicitly confirm acceptance",
  }),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const body = await req.json();
    const { proof_id } = AcceptProofSchema.parse(body);

    const db = supabaseService();

    // Fetch proof
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
      return jsonErr("BAD_REQUEST", "Proof not available for acceptance", requestId, 400);
    }

    // Get client info
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Record acceptance
    await recordStateTransition(db, proof_id, {
      from: proof.acceptance_status,
      to: "accepted",
      actorIp: clientIp,
      actorUserAgent: userAgent,
      notes: "Recipient accepted delivery",
    });

    return jsonOk(
      {
        proof_id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      },
      requestId,
    );
  } catch (error) {
    capture(error, { route: "/api/proof/accept", requestId });
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}
