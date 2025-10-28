import { ENV } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import { capture } from "@/lib/observability";
import { jsonOk, jsonErr } from "@/lib/http";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      ENV.server.SUPABASE_SERVICE_ROLE_KEY,
    );
    const { error } = await supa.from("app_users").select("count").limit(1);
    if (error) return jsonErr("DB_ERROR", error.message, "db-health", 500);
    return jsonOk({ ok: true }, "db-health");
  } catch (error) {
    capture(error, { route: "/api/db-health" });
    return jsonErr("INTERNAL_ERROR", "Internal server error", "db-health", 500);
  }
}
