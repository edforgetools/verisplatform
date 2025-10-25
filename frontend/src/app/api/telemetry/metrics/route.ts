import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { getCurrentUsageMetrics } from "@/lib/usage-telemetry";

export const runtime = "nodejs";

async function handleTelemetryMetrics(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const periodParam = url.searchParams.get("period");
    const period = periodParam || "today";

    // Validate period parameter
    if (!["today", "week", "month"].includes(period)) {
      return jsonErr(
        "VALIDATION_ERROR",
        "Period must be one of: today, week, month",
        requestId,
        400,
      );
    }

    // Get usage metrics
    const metrics = await getCurrentUsageMetrics();

    return jsonOk(metrics, requestId);
  } catch (error) {
    capture(error, { route: "/api/telemetry/metrics", event: "telemetry_metrics_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to fetch telemetry metrics", requestId, 500);
  }
}

export const GET = withRateLimit(handleTelemetryMetrics, "/api/telemetry/metrics", {
  capacity: 50, // 50 requests
  refillRate: 5, // 5 tokens per second
  windowMs: 60000, // 1 minute window
});
