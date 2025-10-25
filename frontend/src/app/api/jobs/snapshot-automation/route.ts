import { NextRequest } from "next/server";
import { validateCronAuth } from "@/lib/auth-server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import {
  checkAndCreateSnapshot,
  getSnapshotStatus,
  verifyAllSnapshotsIntegrity,
  getSnapshotStatistics,
  cleanupOldSnapshots,
} from "@/lib/snapshot-automation";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function handleSnapshotAutomation(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Validate cron authentication
    if (!validateCronAuth(req)) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "check";

    logger.info(
      {
        action,
        requestId,
      },
      "Snapshot automation job started",
    );

    switch (action) {
      case "check":
        return await handleCheckAndCreate(req, requestId);

      case "status":
        return await handleGetStatus(req, requestId);

      case "verify":
        return await handleVerifyIntegrity(req, requestId);

      case "stats":
        return await handleGetStatistics(req, requestId);

      case "cleanup":
        return await handleCleanup(req, requestId);

      default:
        return jsonErr(
          "VALIDATION_ERROR",
          "Invalid action. Must be one of: check, status, verify, stats, cleanup",
          requestId,
          400,
        );
    }
  } catch (error) {
    capture(error, { route: "/api/jobs/snapshot-automation" });
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        requestId,
      },
      "Snapshot automation job failed",
    );
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}

async function handleCheckAndCreate(req: NextRequest, requestId: string) {
  const result = await checkAndCreateSnapshot();

  if (result.success) {
    logger.info(
      {
        batch: result.batch,
        count: result.count,
        retryCount: result.retryCount,
        requestId,
      },
      "Snapshot automation completed successfully",
    );
  } else {
    logger.warn(
      {
        error: result.error,
        retryCount: result.retryCount,
        requestId,
      },
      "Snapshot automation completed with issues",
    );
  }

  return jsonOk(result, requestId);
}

async function handleGetStatus(req: NextRequest, requestId: string) {
  const status = await getSnapshotStatus();
  return jsonOk(status, requestId);
}

async function handleVerifyIntegrity(req: NextRequest, requestId: string) {
  const result = await verifyAllSnapshotsIntegrity();

  logger.info(
    {
      totalSnapshots: result.totalSnapshots,
      verifiedSnapshots: result.verifiedSnapshots,
      failedSnapshots: result.failedSnapshots,
      requestId,
    },
    "Snapshot integrity verification completed",
  );

  return jsonOk(result, requestId);
}

async function handleGetStatistics(req: NextRequest, requestId: string) {
  const stats = await getSnapshotStatistics();
  return jsonOk(stats, requestId);
}

async function handleCleanup(req: NextRequest, requestId: string) {
  const url = new URL(req.url);
  const keepLastBatches = parseInt(url.searchParams.get("keep") || "10", 10);

  if (isNaN(keepLastBatches) || keepLastBatches < 1) {
    return jsonErr(
      "VALIDATION_ERROR",
      "Invalid keep parameter. Must be a positive integer",
      requestId,
      400,
    );
  }

  const result = await cleanupOldSnapshots(keepLastBatches);

  logger.info(
    {
      deletedBatches: result.deletedBatches,
      keepLastBatches,
      requestId,
    },
    "Snapshot cleanup completed",
  );

  return jsonOk(result, requestId);
}

export const GET = handleSnapshotAutomation;
export const POST = handleSnapshotAutomation;
