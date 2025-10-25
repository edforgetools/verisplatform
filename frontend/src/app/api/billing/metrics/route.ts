import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { getBillingMetrics } from "@/lib/billing-service";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";

export const runtime = "nodejs";

async function handleBillingMetrics(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const daysParam = url.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return jsonErr(
        "VALIDATION_ERROR",
        "Days parameter must be between 1 and 365",
        requestId,
        400,
      );
    }

    // Get billing metrics
    const metrics = await getBillingMetrics(authenticatedUserId, days);

    return jsonOk(metrics, requestId);
  } catch (error) {
    capture(error, { route: "/api/billing/metrics", event: "billing_metrics_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to fetch billing metrics", requestId, 500);
  }
}

export const GET = withRateLimit(handleBillingMetrics, "/api/billing/metrics", {
  capacity: 100, // 100 requests
  refillRate: 10, // 10 tokens per second
  windowMs: 60000, // 1 minute window
});
