import { NextRequest } from "next/server";
import { jsonOk, jsonErr } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { withRateLimit } from "@/lib/rateLimit";
import { getSystemHealth, getHealthMetrics } from "@/lib/health-slo-monitoring";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function handleHealthCheck(req: NextRequest) {
  const requestId = getRequestId(req);
  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const detailed = url.searchParams.get("detailed") === "true";
    const includeMetrics = url.searchParams.get("metrics") === "true";

    logger.info(
      {
        requestId,
        detailed,
        includeMetrics,
      },
      "Health check requested",
    );

    // Get basic system health
    const systemHealth = await getSystemHealth();

    // Add response time to health data
    const responseTime = Date.now() - startTime;

    const response: any = {
      status: systemHealth.overall,
      timestamp: systemHealth.timestamp,
      responseTimeMs: responseTime,
      summary: systemHealth.summary,
    };

    // Include detailed health checks if requested
    if (detailed) {
      response.checks = systemHealth.checks;
      response.slos = systemHealth.slos;
    }

    // Include metrics if requested
    if (includeMetrics) {
      try {
        const metrics = await getHealthMetrics();
        response.metrics = metrics;
      } catch (error) {
        logger.warn(
          {
            error: error instanceof Error ? error.message : "Unknown error",
            requestId,
          },
          "Failed to get health metrics (non-critical)",
        );
        response.metrics = {
          error: "Metrics unavailable",
        };
      }
    }

    // Set appropriate HTTP status code
    const statusCode =
      systemHealth.overall === "healthy" ? 200 : systemHealth.overall === "degraded" ? 200 : 503;

    logger.info(
      {
        requestId,
        status: systemHealth.overall,
        responseTime,
        statusCode,
      },
      "Health check completed",
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
      "Health check failed",
    );

    return jsonErr("HEALTH_CHECK_FAILED", "Health check failed", requestId, 503);
  }
}

export const GET = withRateLimit(handleHealthCheck, "/api/health", {
  windowMs: 60000, // 1 minute window
  capacity: 100, // 100 requests per minute
  refillRate: 100 / 60, // 100 requests per 60 seconds = ~1.67 requests per second
});
