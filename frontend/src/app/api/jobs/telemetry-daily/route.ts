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
    const { error } = await supabase.from("telemetry_daily").insert({
      ran_at_utc: new Date().toISOString(),
      ok: true,
    });
    if (error) return new NextResponse("db error", { status: 500 });
    return jsonOk({ status: "ok" });
  } catch (error) {
    capture(error, { route: "/api/jobs/telemetry-daily" });
    return new NextResponse("Internal server error", { status: 500 });
  }
}
