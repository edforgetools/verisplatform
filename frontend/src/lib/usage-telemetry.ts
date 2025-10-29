/**
 * Usage Telemetry System
 *
 * Implements usage telemetry as specified in the MVP checklist:
 * 1. Logs proof issuance and verification counts
 * 2. Stores in Supabase table usage_metrics
 * 3. Automates weekly summaries
 */

import { supabaseService } from "./db";
import { logger } from "./logger";

export interface UsageMetric {
  proof_id?: string;
  event_type:
    | "proof.create"
    | "proof.verify"
    | "proof.view"
    | "api.call"
    | "signoff.issued"
    | "signoff.sent"
    | "signoff.accepted"
    | "signoff.declined"
    | "evidence.export";
  timestamp: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  total_proofs_created: number;
  total_proofs_verified: number;
  total_api_calls: number;
  unique_users: number;
  top_users: Array<{
    user_id: string;
    proof_count: number;
    verification_count: number;
  }>;
}

export interface UsageStats {
  total_proofs: number;
  total_verifications: number;
  total_api_calls: number;
  unique_users: number;
  daily_average: {
    proofs: number;
    verifications: number;
    api_calls: number;
  };
  weekly_trend: Array<{
    date: string;
    proofs: number;
    verifications: number;
    api_calls: number;
  }>;
}

/**
 * Record a usage metric
 */
export async function recordUsageMetric(metric: UsageMetric): Promise<void> {
  try {
    const svc = supabaseService();

    const { error } = await svc.from("usage_metrics").insert({
      proof_id: metric.proof_id,
      event_type: metric.event_type,
      timestamp: metric.timestamp,
      user_id: metric.user_id,
      metadata: metric.metadata || {},
    });

    if (error) {
      logger.error(
        {
          error: error.message,
          metric,
        },
        "Failed to record usage metric",
      );
      throw error;
    }

    logger.info(
      {
        event_type: metric.event_type,
        user_id: metric.user_id,
        proof_id: metric.proof_id,
      },
      "Usage metric recorded",
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        metric,
      },
      "Failed to record usage metric",
    );
    // Don't throw - telemetry failures shouldn't break the main flow
  }
}

/**
 * Record proof creation metric
 */
export async function recordProofCreation(
  proofId: string,
  userId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordUsageMetric({
    proof_id: proofId,
    event_type: "proof.create",
    timestamp: new Date().toISOString(),
    user_id: userId,
    metadata: {
      ...metadata,
      created_at: new Date().toISOString(),
    },
  });
}

/**
 * Record proof verification metric
 */
export async function recordProofVerification(
  proofId: string,
  userId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordUsageMetric({
    proof_id: proofId,
    event_type: "proof.verify",
    timestamp: new Date().toISOString(),
    user_id: userId,
    metadata: {
      ...metadata,
      verified_at: new Date().toISOString(),
    },
  });
}

/**
 * Record API call metric
 */
export async function recordApiCall(
  endpoint: string,
  userId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordUsageMetric({
    event_type: "api.call",
    timestamp: new Date().toISOString(),
    user_id: userId,
    metadata: {
      endpoint,
      ...metadata,
      called_at: new Date().toISOString(),
    },
  });
}

/**
 * Get usage statistics for a date range
 */
export async function getUsageStats(startDate: string, endDate: string): Promise<UsageStats> {
  const svc = supabaseService();

  // Get total counts
  const { data: totals, error: totalsError } = await svc
    .from("usage_metrics")
    .select("event_type")
    .gte("timestamp", startDate)
    .lte("timestamp", endDate);

  if (totalsError) {
    throw new Error(`Failed to fetch usage totals: ${totalsError.message}`);
  }

  const total_proofs = totals?.filter((t) => t.event_type === "proof.create").length || 0;
  const total_verifications = totals?.filter((t) => t.event_type === "proof.verify").length || 0;
  const total_api_calls = totals?.filter((t) => t.event_type === "api.call").length || 0;

  // Get unique users
  const { data: users, error: usersError } = await svc
    .from("usage_metrics")
    .select("user_id")
    .gte("timestamp", startDate)
    .lte("timestamp", endDate)
    .not("user_id", "is", null);

  if (usersError) {
    throw new Error(`Failed to fetch unique users: ${usersError.message}`);
  }

  const unique_users = new Set(users?.map((u) => u.user_id)).size;

  // Calculate daily averages
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const daily_average = {
    proofs: Math.round(total_proofs / days),
    verifications: Math.round(total_verifications / days),
    api_calls: Math.round(total_api_calls / days),
  };

  // Get weekly trend (last 7 days)
  const weekly_trend = await getWeeklyTrend(endDate);

  return {
    total_proofs,
    total_verifications,
    total_api_calls,
    unique_users,
    daily_average,
    weekly_trend,
  };
}

/**
 * Get weekly trend data
 */
async function getWeeklyTrend(endDate: string): Promise<
  Array<{
    date: string;
    proofs: number;
    verifications: number;
    api_calls: number;
  }>
> {
  const svc = supabaseService();
  const trend: Array<{
    date: string;
    proofs: number;
    verifications: number;
    api_calls: number;
  }> = [];

  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const { data: dayData, error } = await svc
      .from("usage_metrics")
      .select("event_type")
      .gte("timestamp", `${dateStr}T00:00:00.000Z`)
      .lte("timestamp", `${dateStr}T23:59:59.999Z`);

    if (error) {
      logger.error(
        {
          error: error.message,
          date: dateStr,
        },
        "Failed to fetch daily trend data",
      );
      continue;
    }

    const proofs = dayData?.filter((d) => d.event_type === "proof.create").length || 0;
    const verifications = dayData?.filter((d) => d.event_type === "proof.verify").length || 0;
    const api_calls = dayData?.filter((d) => d.event_type === "api.call").length || 0;

    trend.push({
      date: dateStr,
      proofs,
      verifications,
      api_calls,
    });
  }

  return trend;
}

/**
 * Generate weekly summary
 */
export async function generateWeeklySummary(
  weekStart: string,
  weekEnd: string,
): Promise<WeeklySummary> {
  const svc = supabaseService();

  // Get all metrics for the week
  const { data: metrics, error } = await svc
    .from("usage_metrics")
    .select("*")
    .gte("timestamp", `${weekStart}T00:00:00.000Z`)
    .lte("timestamp", `${weekEnd}T23:59:59.999Z`);

  if (error) {
    throw new Error(`Failed to fetch weekly metrics: ${error.message}`);
  }

  const total_proofs_created = metrics?.filter((m) => m.event_type === "proof.create").length || 0;
  const total_proofs_verified = metrics?.filter((m) => m.event_type === "proof.verify").length || 0;
  const total_api_calls = metrics?.filter((m) => m.event_type === "api.call").length || 0;

  // Get unique users
  const unique_users = new Set(metrics?.map((m) => m.user_id).filter(Boolean)).size;

  // Get top users by proof creation
  const userProofCounts = new Map<string, number>();
  const userVerificationCounts = new Map<string, number>();

  metrics?.forEach((metric) => {
    if (metric.user_id) {
      if (metric.event_type === "proof.create") {
        userProofCounts.set(metric.user_id, (userProofCounts.get(metric.user_id) || 0) + 1);
      } else if (metric.event_type === "proof.verify") {
        userVerificationCounts.set(
          metric.user_id,
          (userVerificationCounts.get(metric.user_id) || 0) + 1,
        );
      }
    }
  });

  const top_users = Array.from(userProofCounts.entries())
    .map(([user_id, proof_count]) => ({
      user_id,
      proof_count,
      verification_count: userVerificationCounts.get(user_id) || 0,
    }))
    .sort((a, b) => b.proof_count - a.proof_count)
    .slice(0, 10);

  return {
    week_start: weekStart,
    week_end: weekEnd,
    total_proofs_created,
    total_proofs_verified,
    total_api_calls,
    unique_users,
    top_users,
  };
}

/**
 * Automate weekly summary generation
 */
export async function automateWeeklySummary(): Promise<void> {
  try {
    // Get last week's date range
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 7); // Last week
    const weekEnd = endDate.toISOString().split("T")[0];

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 days total
    const weekStart = startDate.toISOString().split("T")[0];

    logger.info(
      {
        week_start: weekStart,
        week_end: weekEnd,
      },
      "Generating weekly summary",
    );

    const summary = await generateWeeklySummary(weekStart, weekEnd);

    // Store the summary
    const svc = supabaseService();
    const { error } = await svc.from("weekly_summaries").upsert(
      {
        week_start: weekStart,
        week_end: weekEnd,
        total_proofs_created: summary.total_proofs_created,
        total_proofs_verified: summary.total_proofs_verified,
        total_api_calls: summary.total_api_calls,
        unique_users: summary.unique_users,
        top_users: summary.top_users,
        generated_at: new Date().toISOString(),
      },
      {
        onConflict: "week_start,week_end",
      },
    );

    if (error) {
      throw new Error(`Failed to store weekly summary: ${error.message}`);
    }

    logger.info(
      {
        week_start: weekStart,
        week_end: weekEnd,
        total_proofs_created: summary.total_proofs_created,
        total_proofs_verified: summary.total_proofs_verified,
        total_api_calls: summary.total_api_calls,
        unique_users: summary.unique_users,
      },
      "Weekly summary generated and stored",
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
      },
      "Failed to automate weekly summary",
    );
    throw error;
  }
}

/**
 * Get current usage metrics for dashboard
 */
export async function getCurrentUsageMetrics(): Promise<{
  today: UsageStats;
  this_week: UsageStats;
  this_month: UsageStats;
}> {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const [todayStats, weekStats, monthStats] = await Promise.all([
    getUsageStats(today, today),
    getUsageStats(weekStartStr, today),
    getUsageStats(monthStartStr, today),
  ]);

  return {
    today: todayStats,
    this_week: weekStats,
    this_month: monthStats,
  };
}

/**
 * Record sign-off events for monitoring
 */
export async function recordSignOffEvent(
  event: "issued" | "sent" | "accepted" | "declined",
  proofId: string,
  userId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordUsageMetric({
    proof_id: proofId,
    event_type: `signoff.${event}` as UsageMetric["event_type"],
    timestamp: new Date().toISOString(),
    user_id: userId,
    metadata: {
      ...metadata,
      event,
    },
  });
}

export async function recordEvidenceExport(proofId: string, userId?: string): Promise<void> {
  await recordUsageMetric({
    proof_id: proofId,
    event_type: "evidence.export",
    timestamp: new Date().toISOString(),
    user_id: userId,
    metadata: {
      export_type: "evidence_pack",
    },
  });
}
