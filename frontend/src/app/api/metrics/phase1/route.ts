/**
 * Phase-1 metrics endpoint
 * GET /api/metrics/phase1
 */

import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function handlePhase1Metrics(req: NextRequest) {
  try {
    const svc = supabaseService();

    // Get latest Phase-1 metrics
    const { data: metricsData, error: metricsError } = await svc
      .from("telemetry")
      .select("event, value, meta, created_at")
      .eq("event", "phase1.metrics")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (metricsError && metricsError.code !== "PGRST116") {
      // PGRST116 = no rows
      logger.error({ error: metricsError.message }, "Failed to get Phase-1 metrics");
      return jsonErr("Failed to get Phase-1 metrics", 500);
    }

    // Get latest Phase-1 gates
    const { data: gatesData, error: gatesError } = await svc
      .from("telemetry")
      .select("event, value, meta, created_at")
      .eq("event", "phase1.gates")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (gatesError && gatesError.code !== "PGRST116") {
      // PGRST116 = no rows
      logger.error({ error: gatesError.message }, "Failed to get Phase-1 gates");
      return jsonErr("Failed to get Phase-1 gates", 500);
    }

    // If no data available, return default values
    if (!metricsData && !gatesData) {
      return jsonOk({
        metrics: {
          proofs_issued_total: 0,
          verifications_total: 0,
          verification_success_ratio_1k: 0,
          automation_efficiency: 0,
        },
        gates: {
          issued_gate: false,
          success_ratio_gate: false,
          overall_phase1_ready: false,
        },
        last_updated: null,
        status: "no_data",
      });
    }

    const metrics = metricsData?.meta || {
      proofs_issued_total: 0,
      verifications_total: 0,
      verification_success_ratio_1k: 0,
      automation_efficiency: 0,
    };

    const gates = gatesData?.meta || {
      issued_gate: false,
      success_ratio_gate: false,
      overall_phase1_ready: false,
    };

    const lastUpdated = metricsData?.created_at || gatesData?.created_at;

    logger.info(
      {
        metrics,
        gates,
        lastUpdated,
      },
      "Phase-1 metrics retrieved",
    );

    return jsonOk({
      metrics,
      gates,
      last_updated: lastUpdated,
      status: "active",
    });
  } catch (error) {
    capture(error, { route: "/api/metrics/phase1" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to get Phase-1 metrics",
    );
    return jsonErr("Internal server error", 500);
  }
}

export const GET = handlePhase1Metrics;
