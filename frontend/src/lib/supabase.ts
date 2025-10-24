import { createClient } from "@supabase/supabase-js";
import { ENV_CLIENT } from "./env";

export function supabaseClient() {
  const url = ENV_CLIENT.NEXT_PUBLIC_SUPABASE_URL;
  const key = ENV_CLIENT.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key);
}
