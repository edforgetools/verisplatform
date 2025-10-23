import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

export function supabaseAdmin() {
  const url = ENV.client.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    ENV.server.supabaseservicekey ||
    ENV.client.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}
