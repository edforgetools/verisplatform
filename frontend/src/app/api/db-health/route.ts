import { ENV } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";

export async function GET() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    ENV.server.supabaseservicekey,
  );
  const { error } = await supa.from("app_users").select("count").limit(1);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
