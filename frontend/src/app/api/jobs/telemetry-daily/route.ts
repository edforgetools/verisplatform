import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateCronAuth } from "@/lib/auth-server";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  try {
    if (!validateCronAuth(req)) return new Response("Forbidden", { status: 403 });

    const supabase = supabaseAdmin();
    
    // Get counts from telemetry table for the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Count total telemetry events from yesterday
    const { count: totalEvents, error: countError } = await supabase
      .from("telemetry")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${yesterdayStr}T00:00:00.000Z`)
      .lte("created_at", `${yesterdayStr}T23:59:59.999Z`);

    if (countError) {
      return jsonErr(`Failed to count telemetry events: ${countError.message}`, 500);
    }

    // Count unique users from yesterday
    const { data: userData, error: userError } = await supabase
      .from("telemetry")
      .select("user_id")
      .gte("created_at", `${yesterdayStr}T00:00:00.000Z`)
      .lte("created_at", `${yesterdayStr}T23:59:59.999Z`)
      .not("user_id", "is", null);

    if (userError) {
      return jsonErr(`Failed to count unique users: ${userError.message}`, 500);
    }

    const uniqueUsers = new Set(userData?.map(row => row.user_id)).size;

    // Count events by type
    const { data: eventData, error: eventError } = await supabase
      .from("telemetry")
      .select("event")
      .gte("created_at", `${yesterdayStr}T00:00:00.000Z`)
      .lte("created_at", `${yesterdayStr}T23:59:59.999Z`);

    if (eventError) {
      return jsonErr(`Failed to count events by type: ${eventError.message}`, 500);
    }

    const eventBreakdown = eventData?.reduce((acc, row) => {
      acc[row.event] = (acc[row.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Log the job execution
    const { error } = await supabase.from("telemetry_daily").insert({
      ran_at_utc: new Date().toISOString(),
      ok: true,
    });
    
    if (error) {
      return jsonErr(`Failed to log job execution: ${error.message}`, 500);
    }

    return jsonOk({
      status: "ok",
      date: yesterdayStr,
      total_events: totalEvents || 0,
      unique_users: uniqueUsers,
      event_breakdown: eventBreakdown,
    });
  } catch (error) {
    capture(error, { route: "/api/jobs/telemetry-daily" });
    return jsonErr("Internal server error", 500);
  }
}
