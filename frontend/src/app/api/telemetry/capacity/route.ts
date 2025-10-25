import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { supabaseService } from "@/lib/db";

export const runtime = "nodejs";

interface CapacityMetrics {
  current_load: {
    requests_per_minute: number;
    active_users: number;
    system_health: string;
  };
  capacity_planning: {
    projected_growth: number;
    recommended_scaling: string;
    bottleneck_analysis: string[];
  };
  performance_metrics: {
    average_response_time: number;
    error_rate: number;
    uptime_percentage: number;
  };
}

async function handleCapacityMetrics(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    const svc = supabaseService();

    // Get current hour metrics
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Calculate requests per minute (last hour)
    const { count: recentRequests, error: requestsError } = await svc
      .from("telemetry")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo.toISOString());

    if (requestsError) {
      throw new Error(`Failed to fetch recent requests: ${requestsError.message}`);
    }

    const requestsPerMinute = Math.round((recentRequests || 0) / 60);

    // Get active users (last 24 hours)
    const { data: activeUsersData, error: usersError } = await svc
      .from("telemetry")
      .select("user_id")
      .gte("created_at", oneDayAgo.toISOString())
      .not("user_id", "is", null);

    if (usersError) {
      throw new Error(`Failed to fetch active users: ${usersError.message}`);
    }

    const activeUsers = new Set(activeUsersData?.map((row) => row.user_id)).size;

    // Calculate error rate (last 24 hours)
    const { data: errorData, error: errorError } = await svc
      .from("telemetry")
      .select("event")
      .gte("created_at", oneDayAgo.toISOString())
      .eq("event", "error");

    if (errorError) {
      throw new Error(`Failed to fetch error data: ${errorError.message}`);
    }

    const { count: totalRequests, error: totalError } = await svc
      .from("telemetry")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo.toISOString());

    if (totalError) {
      throw new Error(`Failed to fetch total requests: ${totalError.message}`);
    }

    const errorRate = totalRequests ? ((errorData?.length || 0) / totalRequests) * 100 : 0;

    // Get performance metrics from telemetry
    const { data: performanceData, error: perfError } = await svc
      .from("telemetry")
      .select("meta")
      .gte("created_at", oneDayAgo.toISOString())
      .eq("event", "api.call")
      .not("meta", "is", null);

    if (perfError) {
      throw new Error(`Failed to fetch performance data: ${perfError.message}`);
    }

    // Calculate average response time from metadata
    const responseTimes = performanceData
      ?.map((row) => {
        if (row.meta && typeof row.meta === "object" && "response_time" in row.meta) {
          return Number(row.meta.response_time);
        }
        return null;
      })
      .filter((time): time is number => time !== null && !isNaN(time)) || [];

    const averageResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 150; // Default fallback

    // Determine system health
    let systemHealth = "healthy";
    if (errorRate > 5) {
      systemHealth = "critical";
    } else if (errorRate > 2 || averageResponseTime > 1000) {
      systemHealth = "warning";
    }

    // Calculate projected growth (compare last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const { count: recentWeekRequests, error: recentWeekError } = await svc
      .from("telemetry")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    const { count: previousWeekRequests, error: previousWeekError } = await svc
      .from("telemetry")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString());

    if (recentWeekError || previousWeekError) {
      throw new Error("Failed to fetch growth data");
    }

    const projectedGrowth = previousWeekRequests && previousWeekRequests > 0
      ? Math.round(((recentWeekRequests || 0) - previousWeekRequests) / previousWeekRequests * 100)
      : 0;

    // Determine scaling recommendation
    let recommendedScaling = "No scaling needed";
    if (requestsPerMinute > 1000) {
      recommendedScaling = "Scale up immediately";
    } else if (requestsPerMinute > 500) {
      recommendedScaling = "Consider scaling up";
    } else if (projectedGrowth > 50) {
      recommendedScaling = "Plan for scaling";
    }

    // Identify bottlenecks
    const bottleneckAnalysis: string[] = [];
    if (averageResponseTime > 1000) {
      bottleneckAnalysis.push("High response times");
    }
    if (errorRate > 2) {
      bottleneckAnalysis.push("Elevated error rate");
    }
    if (requestsPerMinute > 500) {
      bottleneckAnalysis.push("High request volume");
    }
    if (activeUsers > 1000) {
      bottleneckAnalysis.push("Large user base");
    }

    const capacityMetrics: CapacityMetrics = {
      current_load: {
        requests_per_minute: requestsPerMinute,
        active_users: activeUsers,
        system_health: systemHealth,
      },
      capacity_planning: {
        projected_growth: projectedGrowth,
        recommended_scaling: recommendedScaling,
        bottleneck_analysis: bottleneckAnalysis,
      },
      performance_metrics: {
        average_response_time: averageResponseTime,
        error_rate: Math.round(errorRate * 100) / 100,
        uptime_percentage: Math.max(0, 100 - errorRate),
      },
    };

    return jsonOk(capacityMetrics, requestId);
  } catch (error) {
    capture(error, { route: "/api/telemetry/capacity", event: "capacity_metrics_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to fetch capacity metrics", requestId, 500);
  }
}

export const GET = withRateLimit(handleCapacityMetrics, "/api/telemetry/capacity", {
  capacity: 30, // 30 requests
  refillRate: 3, // 3 tokens per second
  windowMs: 60000, // 1 minute window
});
