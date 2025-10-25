import { NextRequest } from "next/server";
import { jsonOk, jsonErr } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { withRateLimit } from "@/lib/rateLimit";
import { calculateSLOStatus, SLO_DEFINITIONS } from "@/lib/health-slo-monitoring";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function handleSLOStatus(req: NextRequest) {
  const requestId = getRequestId(req);
  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const includeDefinitions = url.searchParams.get("definitions") === "true";
    const includeHistory = url.searchParams.get("history") === "true";

    logger.info(
      {
        requestId,
        includeDefinitions,
        includeHistory,
      },
      "SLO status requested",
    );

    // Get current SLO status
    const sloStatus = await calculateSLOStatus();

    // Calculate overall SLO health
    const totalSLOs = sloStatus.length;
    const meetingSLOs = sloStatus.filter((s) => s.status === "meeting").length;
    const warningSLOs = sloStatus.filter((s) => s.status === "warning").length;
    const breachSLOs = sloStatus.filter((s) => s.status === "breach").length;

    const overallSLOHealth = breachSLOs > 0 ? "breach" : warningSLOs > 0 ? "warning" : "meeting";

    const response: any = {
      overall: overallSLOHealth,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      summary: {
        totalSLOs,
        meeting: meetingSLOs,
        warning: warningSLOs,
        breach: breachSLOs,
        healthPercentage: (meetingSLOs / totalSLOs) * 100,
      },
      slos: sloStatus,
    };

    // Include SLO definitions if requested
    if (includeDefinitions) {
      response.definitions = SLO_DEFINITIONS;
    }

    // Include historical data if requested (placeholder for now)
    if (includeHistory) {
      response.history = {
        message: "Historical SLO data not yet implemented",
        note: "This would include SLO trends over time",
      };
    }

    // Set appropriate HTTP status code
    const statusCode =
      overallSLOHealth === "meeting" ? 200 : overallSLOHealth === "warning" ? 200 : 503;

    logger.info(
      {
        requestId,
        overallSLOHealth,
        meetingSLOs,
        warningSLOs,
        breachSLOs,
        responseTime: Date.now() - startTime,
      },
      "SLO status completed",
    );

    return jsonOk(response, requestId, { status: statusCode });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        requestId,
        responseTime,
      },
      "SLO status check failed",
    );

    return jsonErr("SLO_CHECK_FAILED", "SLO status check failed", requestId, 503);
  }
}

export const GET = withRateLimit(handleSLOStatus, "/api/slo", {
  windowMs: 60000, // 1 minute window
  capacity: 50, // 50 requests per minute
  refillRate: 50 / 60, // 50 requests per 60 seconds = ~0.83 requests per second
});
