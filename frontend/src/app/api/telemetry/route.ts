import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/db";
import { assertEntitled } from "@/lib/entitlements";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { event, value, meta, userId } = await req.json();

    if (!event) {
      return jsonErr("VALIDATION_ERROR", "event is required", "telemetry", 400);
    }

    // Check entitlement for telemetry tracking (only if userId is provided)
    if (userId) {
      try {
        await assertEntitled(userId, "telemetry_tracking");
      } catch {
        return jsonErr(
          "AUTH_ERROR",
          "Insufficient permissions to track telemetry",
          "telemetry",
          403,
        );
      }
    }

    const svc = supabaseService();
    const { error } = await svc.from("telemetry").insert({
      user_id: userId || null,
      event,
      value: value || 1,
      meta: meta || null,
    });

    if (error) {
      return jsonErr("DB_ERROR", error.message, "telemetry", 500);
    }

    return jsonOk({ success: true }, "telemetry");
  } catch (error) {
    capture(error, { route: "/api/telemetry" });
    return jsonErr("INTERNAL_ERROR", "Internal server error", "telemetry", 500);
  }
}
