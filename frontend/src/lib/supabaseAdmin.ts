import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is required");
  }
  const key = process.env.supabaseservicekey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "supabaseservicekey or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
