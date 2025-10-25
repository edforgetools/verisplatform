/**
 * Phase-1 telemetry job - computes gates and metrics
 * POST /api/jobs/telemetry-phase1
 */

import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface Phase1Metrics {
  proofs_issued_total: number;
  verifications_total: number;
  verification_success_ratio_1k: number;
  automation_efficiency: number;
}

interface Phase1Gates {
  issued_gate: boolean;
  success_ratio_gate: boolean;
  overall_phase1_ready: boolean;
}

async function handleTelemetryPhase1(req: NextRequest) {
  try {
    const svc = supabaseService();

    // Get total proofs issued
    const { count: proofsIssuedTotal, error: proofsError } = await svc
      .from("proofs")
      .select("*", { count: "exact", head: true });

    if (proofsError) {
      logger.error({ error: proofsError.message }, "Failed to get proofs count");
      return jsonErr("DB_ERROR", "Failed to get proofs count", "telemetry-phase1", 500);
    }

    // Get total verifications (last 1000)
    const { data: recentVerifications, error: verificationsError } = await svc
      .from("telemetry")
      .select("event, value, meta")
      .eq("event", "proof.verify")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (verificationsError) {
      logger.error({ error: verificationsError.message }, "Failed to get verifications");
      return jsonErr("DB_ERROR", "Failed to get verifications", "telemetry-phase1", 500);
    }

    const verificationsTotal = recentVerifications?.length || 0;
    const successfulVerifications =
      recentVerifications?.filter((v) => v.meta?.verified === true || v.value === 1).length || 0;

    // Calculate verification success ratio (sliding 1k window)
    const verificationSuccessRatio1k =
      verificationsTotal > 0 ? successfulVerifications / verificationsTotal : 0;

    // Calculate automation efficiency (mock calculation)
    // In a real implementation, this would measure actual vs expected processing time
    const automationEfficiency = 0.95; // 95% efficiency

    const metrics: Phase1Metrics = {
      proofs_issued_total: proofsIssuedTotal || 0,
      verifications_total: verificationsTotal,
      verification_success_ratio_1k: verificationSuccessRatio1k,
      automation_efficiency: automationEfficiency,
    };

    // Compute Phase-1 gates
    const gates: Phase1Gates = {
      issued_gate: metrics.proofs_issued_total >= 500,
      success_ratio_gate: metrics.verification_success_ratio_1k >= 0.99,
      overall_phase1_ready: false,
    };

    gates.overall_phase1_ready = gates.issued_gate && gates.success_ratio_gate;

    // Store metrics in telemetry
    await svc.from("telemetry").insert([
      {
        event: "phase1.metrics",
        value: metrics.proofs_issued_total,
        meta: {
          metric_type: "proofs_issued_total",
          ...metrics,
        },
      },
      {
        event: "phase1.gates",
        value: gates.overall_phase1_ready ? 1 : 0,
        meta: {
          ...gates,
          ...metrics,
        },
      },
    ]);

    logger.info(
      {
        metrics,
        gates,
      },
      "Phase-1 telemetry computed",
    );

    return jsonOk(
      {
        metrics,
        gates,
        computed_at: new Date().toISOString(),
      },
      "telemetry-phase1",
    );
  } catch (error) {
    capture(error, { route: "/api/jobs/telemetry-phase1" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Phase-1 telemetry job failed",
    );
    return jsonErr("INTERNAL_ERROR", "Internal server error", "telemetry-phase1", 500);
  }
}

export const POST = handleTelemetryPhase1;
