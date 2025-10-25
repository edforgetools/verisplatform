import { NextRequest } from "next/server";
import { validateCronAuth } from "@/lib/auth-server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { runRegressionTests, checkRegressionTests } from "@/lib/schema-version-control";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function handleRegressionTests(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Validate cron authentication
    if (!validateCronAuth(req)) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "run";

    logger.info(
      {
        action,
        requestId,
      },
      "Schema regression tests started",
    );

    if (action === "check") {
      // Run regression tests and check if they all pass
      const checkResult = await checkRegressionTests();

      logger.info(
        {
          allPassed: checkResult.allPassed,
          summary: checkResult.summary,
          requestId,
        },
        "Schema regression check completed",
      );

      return jsonOk(checkResult, requestId);
    } else {
      // Run regression tests and return detailed results
      const results = await runRegressionTests();

      logger.info(
        {
          totalVersions: results.length,
          passedVersions: results.filter((r) => r.passed).length,
          failedVersions: results.filter((r) => !r.passed).length,
          requestId,
        },
        "Schema regression tests completed",
      );

      return jsonOk({ results }, requestId);
    }
  } catch (error) {
    capture(error, { route: "/api/schema/regression" });
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        requestId,
      },
      "Schema regression tests failed",
    );
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}

export const GET = handleRegressionTests;
export const POST = handleRegressionTests;
