/**
 * Launch Gate Status API Endpoint
 * 
 * GET /api/launch-gate/status
 * 
 * Returns the current launch gate status and readiness assessment for the Veris system.
 * This endpoint provides comprehensive information about pilot readiness criteria,
 * system validation, and launch preparation status as specified in the MVP checklist.
 */

import { NextRequest } from "next/server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { logger } from "@/lib/logger";
import { 
  getLaunchGateStatus, 
  storeLaunchGateStatus,
  getHistoricalLaunchGateStatus,
  LaunchGateStatus 
} from "@/lib/launch-gate";

export const runtime = "nodejs";

async function handleGetLaunchGateStatus(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    const includeHistory = url.searchParams.get('include_history') === 'true';
    
    // Get current launch gate status
    const launchGateStatus = await getLaunchGateStatus();
    
    // Store current status for historical tracking
    try {
      await storeLaunchGateStatus(launchGateStatus);
    } catch (error) {
      logger.warn({ error }, 'Failed to store launch gate status (non-critical)');
    }
    
    // Get historical data if requested
    let historicalStatus: LaunchGateStatus[] = [];
    if (includeHistory) {
      try {
        historicalStatus = await getHistoricalLaunchGateStatus(days);
      } catch (error) {
        logger.warn({ error }, 'Failed to get historical launch gate status (non-critical)');
      }
    }
    
    const response = {
      ...launchGateStatus,
      historical: includeHistory ? historicalStatus : undefined,
      generated_at: new Date().toISOString(),
    };
    
    logger.info(
      {
        overallStatus: launchGateStatus.overallStatus,
        readinessScore: launchGateStatus.readinessScore,
        completedChecks: launchGateStatus.completedChecks,
        totalChecks: launchGateStatus.totalChecks,
        requiredChecksCompleted: launchGateStatus.requiredChecksCompleted,
        blockersCount: launchGateStatus.blockers.length,
        nextStepsCount: launchGateStatus.nextSteps.length,
        includeHistory,
        days,
      },
      "Launch gate status retrieved successfully"
    );
    
    return jsonOk(response);
    
  } catch (error) {
    capture(error, { route: "/api/launch-gate/status" });
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to get launch gate status"
    );
    return jsonErr("Internal server error", 500);
  }
}

export const GET = handleGetLaunchGateStatus;
