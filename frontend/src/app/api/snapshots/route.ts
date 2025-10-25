import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { supabaseService } from "@/lib/db";

export const runtime = "nodejs";

async function handleGetSnapshots(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Validate parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return jsonErr("VALIDATION_ERROR", "Limit must be between 1 and 100", requestId, 400);
    }
    if (isNaN(offset) || offset < 0) {
      return jsonErr("VALIDATION_ERROR", "Offset must be non-negative", requestId, 400);
    }

    const svc = supabaseService();

    // Get snapshots
    const { data: snapshots, error } = await svc
      .from("snapshot_meta")
      .select("*")
      .order("batch", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch snapshots: ${error.message}`);
    }

    // Get total count for pagination
    const { count, error: countError } = await svc
      .from("snapshot_meta")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw new Error(`Failed to fetch snapshot count: ${countError.message}`);
    }

    return jsonOk(
      {
        snapshots: snapshots || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
          hasMore: offset + limit < (count || 0),
        },
      },
      requestId,
    );
  } catch (error) {
    capture(error, { route: "/api/snapshots", event: "snapshots_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to fetch snapshots", requestId, 500);
  }
}

export const GET = withRateLimit(handleGetSnapshots, "/api/snapshots", {
  capacity: 100, // 100 requests
  refillRate: 10, // 10 tokens per second
  windowMs: 60000, // 1 minute window
});
