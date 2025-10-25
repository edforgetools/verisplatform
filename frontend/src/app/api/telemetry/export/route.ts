import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rateLimit";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr, createAuthError } from "@/lib/http";
import { getRequestId } from "@/lib/request-id";
import { supabaseService } from "@/lib/db";

export const runtime = "nodejs";

async function handleTelemetryExport(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const formatParam = url.searchParams.get("format") || "json";
    const daysParam = url.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Validate parameters
    if (!["json", "csv"].includes(formatParam)) {
      return jsonErr("VALIDATION_ERROR", "Format must be 'json' or 'csv'", requestId, 400);
    }

    if (isNaN(days) || days < 1 || days > 365) {
      return jsonErr("VALIDATION_ERROR", "Days must be between 1 and 365", requestId, 400);
    }

    const svc = supabaseService();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get telemetry data
    const { data: telemetryData, error } = await svc
      .from("telemetry")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch telemetry data: ${error.message}`);
    }

    // Get daily aggregated data
    const { data: dailyData, error: dailyError } = await svc
      .from("telemetry_daily")
      .select("*")
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (dailyError) {
      throw new Error(`Failed to fetch daily telemetry data: ${dailyError.message}`);
    }

    const exportData = {
      metadata: {
        export_date: new Date().toISOString(),
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: days,
        },
        total_records: telemetryData?.length || 0,
        daily_records: dailyData?.length || 0,
      },
      raw_telemetry: telemetryData || [],
      daily_aggregates: dailyData || [],
    };

    if (formatParam === "csv") {
      // Convert to CSV format
      const csvHeaders = ["id", "user_id", "event", "value", "meta", "created_at"];

      const csvRows = (telemetryData || []).map((row) => [
        row.id,
        row.user_id || "",
        row.event,
        row.value || "",
        row.meta ? JSON.stringify(row.meta) : "",
        row.created_at,
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((field) => `"${field}"`).join(",")),
      ].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="telemetry-export-${
            startDate.toISOString().split("T")[0]
          }-to-${endDate.toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      // Return JSON format
      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="telemetry-export-${
            startDate.toISOString().split("T")[0]
          }-to-${endDate.toISOString().split("T")[0]}.json"`,
        },
      });
    }
  } catch (error) {
    capture(error, { route: "/api/telemetry/export", event: "telemetry_export_error" });
    return jsonErr("INTERNAL_ERROR", "Failed to export telemetry data", requestId, 500);
  }
}

export const GET = withRateLimit(
  async (req: NextRequest) => {
    const response = await handleTelemetryExport(req);
    return response as any; // Type assertion to work around Response vs NextResponse mismatch
  },
  "/api/telemetry/export",
  {
    capacity: 10, // 10 requests
    refillRate: 1, // 1 token per second
    windowMs: 60000, // 1 minute window
  },
);
