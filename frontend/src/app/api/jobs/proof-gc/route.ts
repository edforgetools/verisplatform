import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateCronAuth } from "@/lib/auth-server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  try {
    if (!validateCronAuth(req)) return new Response("Forbidden", { status: 403 });

    const supabase = supabaseAdmin();

    // Define retention period (e.g., 90 days for old proofs)
    const retentionDays = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString();

    // Count proofs that would be deleted
    const { count: totalOldProofs, error: countError } = await supabase
      .from("proofs")
      .select("*", { count: "exact", head: true })
      .lt("created_at", cutoffDateStr);

    if (countError) {
      return jsonErr(`Failed to count old proofs: ${countError.message}`, 500);
    }

    // Count proofs by visibility before deletion
    const { data: visibilityCounts, error: visibilityError } = await supabase
      .from("proofs")
      .select("visibility")
      .lt("created_at", cutoffDateStr);

    if (visibilityError) {
      return jsonErr(`Failed to count proofs by visibility: ${visibilityError.message}`, 500);
    }

    // Group by visibility
    const visibilityBreakdown =
      visibilityCounts?.reduce((acc, proof) => {
        acc[proof.visibility] = (acc[proof.visibility] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    // Delete old proofs
    const { error: deleteError } = await supabase
      .from("proofs")
      .delete()
      .lt("created_at", cutoffDateStr);

    if (deleteError) {
      return jsonErr(`Failed to delete old proofs: ${deleteError.message}`, 500);
    }

    // Log the cleanup operation
    const { error: logError } = await supabase.from("telemetry_daily").insert({
      ran_at_utc: new Date().toISOString(),
      ok: true,
    });

    if (logError) {
      console.warn("Failed to log proof-gc operation:", logError.message);
    }

    return jsonOk({
      status: "ok",
      deleted_count: totalOldProofs || 0,
      retention_days: retentionDays,
      cutoff_date: cutoffDateStr,
      visibility_breakdown: visibilityBreakdown,
    });
  } catch (error) {
    capture(error, { route: "/api/jobs/proof-gc" });
    return jsonErr("Internal server error", 500);
  }
}
