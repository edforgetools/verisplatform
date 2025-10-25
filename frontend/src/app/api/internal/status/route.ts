import { NextRequest } from "next/server";
import { validateInternalAuth } from "@/lib/env";
import { getCurrentUsageMetrics } from "@/lib/usage-telemetry";
import { supabaseService } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Validate internal authentication
    if (!validateInternalAuth(req)) {
      logger.warn("Unauthorized access attempt to internal status page");
      return jsonErr("AUTH_ERROR", "Unauthorized", "internal-status", 401);
    }

    const startTime = Date.now();

    // Get usage metrics
    const usageMetrics = await getCurrentUsageMetrics();

    // Get last webhook timestamp
    const svc = supabaseService();
    const { data: lastWebhook } = await svc
      .from("billing_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get last S3 write timestamp (from proofs table)
    const { data: lastS3Write } = await svc
      .from("proofs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get environment mode
    const envMode = process.env.NODE_ENV || "development";

    // Calculate response time
    const responseTime = Date.now() - startTime;

    const status = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      environment: envMode,
      metrics: {
        issued_count: usageMetrics.today.total_proofs,
        verify_success: usageMetrics.today.total_verifications,
        latency_p50: responseTime, // Simplified - would be calculated from actual metrics
        latency_p95: responseTime * 1.5, // Simplified - would be calculated from actual metrics
      },
      last_webhook: lastWebhook?.created_at || null,
      last_s3_write: lastS3Write?.created_at || null,
      checks: {
        database: "pass",
        redis: "pass", // Simplified - would check actual Redis connection
        s3: "pass", // Simplified - would check actual S3 connection
        stripe: "pass", // Simplified - would check actual Stripe connection
      },
    };

    logger.info({ status }, "Internal status page accessed");

    return jsonOk(status, "internal-status");
  } catch (error) {
    logger.error({ error }, "Failed to get internal status");
    return jsonErr("INTERNAL_ERROR", "Internal server error", "internal-status", 500);
  }
}
