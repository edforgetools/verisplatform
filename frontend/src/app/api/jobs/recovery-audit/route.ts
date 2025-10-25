import { NextRequest } from "next/server";
import { validateCronAuth } from "@/lib/auth-server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import {
  runRecoveryAudit,
  runRecoveryAuditIfNeeded,
  shouldRunRecoveryAudit,
  getRecoveryAuditHistory,
  getRecoveryAuditResults,
} from "@/lib/recovery-audit";
import {
  runEnhancedRecoveryAudit,
  getEnhancedRecoveryAuditHistory,
  getEnhancedRecoveryAuditResults,
  getCrossMirrorValidationResults,
} from "@/lib/recovery-audit-enhanced";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function handleRecoveryAudit(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Validate cron authentication
    if (!validateCronAuth(req)) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "check";
    const enhanced = url.searchParams.get("enhanced") === "true";

    logger.info(
      {
        action,
        enhanced,
        requestId,
      },
      "Recovery audit job started",
    );

    switch (action) {
      case "check":
        return await handleCheckAndRun(req, requestId, enhanced);

      case "run":
        return await handleRunAudit(req, requestId, enhanced);

      case "status":
        return await handleGetStatus(req, requestId);

      case "history":
        return await handleGetHistory(req, requestId, enhanced);

      case "results":
        return await handleGetResults(req, requestId, enhanced);

      case "cross-mirror":
        return await handleGetCrossMirror(req, requestId);

      default:
        return jsonErr(
          "VALIDATION_ERROR",
          "Invalid action. Must be one of: check, run, status, history, results, cross-mirror",
          requestId,
          400,
        );
    }
  } catch (error) {
    capture(error, { route: "/api/jobs/recovery-audit" });
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        requestId,
      },
      "Recovery audit job failed",
    );
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}

async function handleCheckAndRun(req: NextRequest, requestId: string, enhanced: boolean) {
  try {
    const { shouldRun, reason, lastAuditDate, proofCountSinceLastAudit } =
      await shouldRunRecoveryAudit();

    if (!shouldRun) {
      logger.info(
        {
          reason,
          lastAuditDate,
          proofCountSinceLastAudit,
          requestId,
        },
        "Recovery audit not needed",
      );

      return jsonOk(
        {
          ran: false,
          reason,
          lastAuditDate,
          proofCountSinceLastAudit,
        },
        requestId,
      );
    }

    // Run the audit
    const result = enhanced ? await runEnhancedRecoveryAudit() : await runRecoveryAudit();

    logger.info(
      {
        ran: true,
        reason,
        enhanced,
        totalAudited: result.totalAudited,
        successfulRecoveries: result.successfulRecoveries,
        failedRecoveries: result.failedRecoveries,
        requestId,
      },
      "Recovery audit completed",
    );

    return jsonOk(
      {
        ran: true,
        reason,
        lastAuditDate,
        proofCountSinceLastAudit,
        result,
      },
      requestId,
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        requestId,
      },
      "Recovery audit check and run failed",
    );

    return jsonOk(
      {
        ran: false,
        reason: "Audit failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      requestId,
    );
  }
}

async function handleRunAudit(req: NextRequest, requestId: string, enhanced: boolean) {
  try {
    const result = enhanced ? await runEnhancedRecoveryAudit() : await runRecoveryAudit();

    logger.info(
      {
        enhanced,
        totalAudited: result.totalAudited,
        successfulRecoveries: result.successfulRecoveries,
        failedRecoveries: result.failedRecoveries,
        requestId,
      },
      "Recovery audit executed",
    );

    return jsonOk(result, requestId);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        enhanced,
        requestId,
      },
      "Recovery audit execution failed",
    );

    return jsonErr("INTERNAL_ERROR", "Failed to run recovery audit", requestId, 500);
  }
}

async function handleGetStatus(req: NextRequest, requestId: string) {
  try {
    const status = await shouldRunRecoveryAudit();
    return jsonOk(status, requestId);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        requestId,
      },
      "Failed to get recovery audit status",
    );

    return jsonErr("INTERNAL_ERROR", "Failed to get recovery audit status", requestId, 500);
  }
}

async function handleGetHistory(req: NextRequest, requestId: string, enhanced: boolean) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const history = enhanced
      ? await getEnhancedRecoveryAuditHistory(limit)
      : await getRecoveryAuditHistory(limit);

    return jsonOk({ history }, requestId);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        enhanced,
        requestId,
      },
      "Failed to get recovery audit history",
    );

    return jsonErr("INTERNAL_ERROR", "Failed to get recovery audit history", requestId, 500);
  }
}

async function handleGetResults(req: NextRequest, requestId: string, enhanced: boolean) {
  try {
    const url = new URL(req.url);
    const auditDate = url.searchParams.get("date");

    if (!auditDate) {
      return jsonErr("VALIDATION_ERROR", "Date parameter is required", requestId, 400);
    }

    const results = enhanced
      ? await getEnhancedRecoveryAuditResults(auditDate)
      : await getRecoveryAuditResults(auditDate);

    return jsonOk({ results }, requestId);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        enhanced,
        requestId,
      },
      "Failed to get recovery audit results",
    );

    return jsonErr("INTERNAL_ERROR", "Failed to get recovery audit results", requestId, 500);
  }
}

async function handleGetCrossMirror(req: NextRequest, requestId: string) {
  try {
    const url = new URL(req.url);
    const auditDate = url.searchParams.get("date");

    if (!auditDate) {
      return jsonErr("VALIDATION_ERROR", "Date parameter is required", requestId, 400);
    }

    const crossMirrorResults = await getCrossMirrorValidationResults(auditDate);

    return jsonOk({ crossMirrorResults }, requestId);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        requestId,
      },
      "Failed to get cross-mirror validation results",
    );

    return jsonErr(
      "INTERNAL_ERROR",
      "Failed to get cross-mirror validation results",
      requestId,
      500,
    );
  }
}

export const GET = handleRecoveryAudit;
export const POST = handleRecoveryAudit;
