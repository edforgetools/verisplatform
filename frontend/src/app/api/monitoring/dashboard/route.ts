/**
 * Monitoring Dashboard API Endpoint
 * 
 * GET /api/monitoring/dashboard
 * 
 * Returns comprehensive system metrics and performance data for the monitoring dashboard.
 * This endpoint provides real-time insights into system health, performance thresholds,
 * and key performance indicators as specified in the MVP checklist.
 */

import { NextRequest } from "next/server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";
import { 
  getDashboardData, 
  storeDashboardMetrics,
  getHistoricalDashboardMetrics,
  SystemMetrics,
  DashboardData 
} from "@/lib/monitoring-dashboard";

export const runtime = "nodejs";

async function handleGetDashboard(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    const includeHistory = url.searchParams.get('include_history') === 'true';
    
    // Get current dashboard data
    const dashboardData = await getDashboardData();
    
    // Store current metrics for historical tracking
    try {
      await storeDashboardMetrics(dashboardData.metrics);
    } catch (error) {
      logger.warn({ error }, 'Failed to store dashboard metrics (non-critical)');
    }
    
    // Get historical data if requested
    let historicalMetrics: SystemMetrics[] = [];
    if (includeHistory) {
      try {
        historicalMetrics = await getHistoricalDashboardMetrics(days);
      } catch (error) {
        logger.warn({ error }, 'Failed to get historical metrics (non-critical)');
      }
    }
    
    const response = {
      ...dashboardData,
      historical: includeHistory ? historicalMetrics : undefined,
      generated_at: new Date().toISOString(),
    };
    
    logger.info(
      {
        overallStatus: dashboardData.overallStatus,
        metricsCount: dashboardData.thresholds.length,
        alertsCount: dashboardData.alerts.length,
        trendsCount: dashboardData.trends.length,
        includeHistory,
        days,
      },
      "Dashboard data retrieved successfully"
    );
    
    return jsonOk(response);
    
  } catch (error) {
    capture(error, { route: "/api/monitoring/dashboard" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to get dashboard data"
    );
    return jsonErr("Internal server error", 500);
  }
}

export const GET = handleGetDashboard;
