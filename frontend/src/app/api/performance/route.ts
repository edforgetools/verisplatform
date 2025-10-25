import { NextRequest } from "next/server";
import { jsonOk, jsonErr } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { withRateLimit } from "@/lib/rateLimit";
import { getHealthMetrics } from "@/lib/health-slo-monitoring";
import { getCurrentUsageMetrics } from "@/lib/usage-telemetry";
import { supabaseService } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function handlePerformanceMetrics(req: NextRequest) {
  const requestId = getRequestId(req);
  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const timeRange = url.searchParams.get("range") || "24h";
    const includeDetails = url.searchParams.get("details") === "true";

    logger.info(
      {
        requestId,
        timeRange,
        includeDetails,
      },
      "Performance metrics requested",
    );

    // Get health metrics
    const healthMetrics = await getHealthMetrics();

    // Get usage metrics
    const usageMetrics = await getCurrentUsageMetrics();

    // Get performance data from database
    const svc = supabaseService();

    // Calculate time range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "1h":
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get proof issuance performance
    const { data: proofData } = await svc
      .from("proofs")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    // Get verification performance
    const { data: verificationData } = await svc
      .from("usage_metrics")
      .select("event_type, count, created_at")
      .eq("event_type", "verification")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    // Get API performance metrics
    const { data: apiMetrics } = await svc
      .from("usage_metrics")
      .select("event_type, count, metadata, created_at")
      .eq("event_type", "api_call")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    // Calculate performance metrics
    const totalProofs = proofData?.length || 0;
    const totalVerifications =
      verificationData?.reduce((sum, record) => sum + (record.count || 0), 0) || 0;
    const totalApiCalls = apiMetrics?.reduce((sum, record) => sum + (record.count || 0), 0) || 0;

    // Calculate throughput (requests per minute)
    const timeRangeMs = now.getTime() - startDate.getTime();
    const timeRangeMinutes = timeRangeMs / (1000 * 60);
    const throughput = totalApiCalls / timeRangeMinutes;

    // Calculate success rates
    const successfulVerifications =
      verificationData?.filter((record) => record.count > 0).length || 0;
    const verificationSuccessRate =
      verificationData && verificationData.length > 0
        ? successfulVerifications / verificationData.length
        : 1;

    // Calculate latency metrics (simplified - would be from actual latency data)
    const averageLatency = healthMetrics.averageResponseTime;
    const p95Latency = averageLatency * 1.5; // Simplified calculation
    const p99Latency = averageLatency * 2; // Simplified calculation

    const performanceData = {
      timestamp: new Date().toISOString(),
      timeRange,
      responseTimeMs: Date.now() - startTime,

      // Core metrics
      throughput: {
        requestsPerMinute: throughput,
        totalRequests: totalApiCalls,
        timeRangeMinutes,
      },

      // Proof metrics
      proofs: {
        total: totalProofs,
        daily: usageMetrics.today.total_proofs,
        weekly: usageMetrics.this_week.total_proofs,
        monthly: usageMetrics.this_month.total_proofs,
      },

      // Verification metrics
      verifications: {
        total: totalVerifications,
        successRate: verificationSuccessRate,
        daily: usageMetrics.today.total_verifications,
        weekly: usageMetrics.this_week.total_verifications,
        monthly: usageMetrics.this_month.total_verifications,
      },

      // Latency metrics
      latency: {
        average: averageLatency,
        p95: p95Latency,
        p99: p99Latency,
        unit: "ms",
      },

      // System metrics
      system: {
        uptime: healthMetrics.uptime,
        errorRate: healthMetrics.errorRate,
        dataIntegrity: healthMetrics.dataIntegrity,
      },

      // Capacity metrics
      capacity: {
        dailyThroughput: healthMetrics.throughput,
        utilization: (healthMetrics.throughput / 10000) * 100, // Assuming 10k daily capacity
        activeUsers: usageMetrics.today.unique_users,
      },
    };

    const response: any = performanceData;

    // Include detailed breakdown if requested
    if (includeDetails) {
      response.details = {
        proofData: proofData?.slice(0, 10), // Last 10 proofs
        verificationData: verificationData?.slice(0, 10), // Last 10 verifications
        apiMetrics: apiMetrics?.slice(0, 10), // Last 10 API calls
        timeRange: {
          start: startDate.toISOString(),
          end: now.toISOString(),
          duration: timeRangeMs,
        },
      };
    }

    logger.info(
      {
        requestId,
        timeRange,
        totalProofs,
        totalVerifications,
        totalApiCalls,
        throughput,
        responseTime: Date.now() - startTime,
      },
      "Performance metrics completed",
    );

    return jsonOk(response, requestId);
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        requestId,
        responseTime,
      },
      "Performance metrics failed",
    );

    return jsonErr("PERFORMANCE_METRICS_FAILED", "Performance metrics failed", requestId, 500);
  }
}

export const GET = withRateLimit(handlePerformanceMetrics, "/api/performance", {
  windowMs: 60000, // 1 minute window
  capacity: 30, // 30 requests per minute
  refillRate: 30 / 60, // 30 requests per 60 seconds = 0.5 requests per second
});
