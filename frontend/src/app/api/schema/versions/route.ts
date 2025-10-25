import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { getSchemaVersionInfo } from "@/lib/schema-version-control";

export const runtime = "nodejs";

async function handleGetSchemaVersions(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    // Get schema version information
    const versionInfo = getSchemaVersionInfo();

    return jsonOk(versionInfo, requestId);
  } catch (error) {
    capture(error, { route: "/api/schema/versions", event: "schema_versions_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to fetch schema versions", requestId, 500);
  }
}

export const GET = withRateLimit(handleGetSchemaVersions, "/api/schema/versions", {
  capacity: 100, // 100 requests
  refillRate: 10, // 10 tokens per second
  windowMs: 60000, // 1 minute window
});
