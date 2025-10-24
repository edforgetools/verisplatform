import { NextRequest } from "next/server";
import { verifySignature } from "@/lib/crypto-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateCronAuth } from "@/lib/auth-server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Verify this is a scheduled job request (in production, you'd verify the cron secret)
  if (!validateCronAuth(req)) return new Response("Forbidden", { status: 403 });

  const svc = supabaseAdmin();
  const errors: string[] = [];
  let checked = 0;

  try {
    // Get all proofs that need integrity checking
    const { data: proofs, error: fetchError } = await svc
      .from("proofs")
      .select("id, hash_full, signature, file_name, created_at")
      .limit(1000); // Process in batches

    if (fetchError) {
      return jsonErr(fetchError.message, 500);
    }

    if (!proofs) {
      return jsonErr("No proofs found", 404);
    }

    // Check each proof's signature integrity
    for (const proof of proofs) {
      checked++;
      const isValid = verifySignature(proof.hash_full, proof.signature);

      if (!isValid) {
        errors.push(`Proof ${proof.id} has invalid signature`);
      }
    }

    // Log telemetry about the integrity check
    await svc.from("telemetry").insert({
      user_id: null, // System event
      event: "integrity_check_completed",
      value: checked,
      meta: {
        errors_count: errors.length,
        checked_count: checked,
        timestamp: new Date().toISOString(),
      },
    });

    // Update daily telemetry
    const today = new Date().toISOString().split("T")[0];
    await svc.from("telemetry_daily").upsert({
      date: today,
      event: "integrity_checks",
      count: checked,
      unique_users: 1, // System user
      meta: { errors_count: errors.length },
    });

    return jsonOk({
      success: true,
      checked,
      errors: errors.length,
      error_details: errors,
    });
  } catch (error) {
    capture(error, { route: "/api/integrity-check" });
    return jsonErr("Integrity check failed", 500);
  }
}
