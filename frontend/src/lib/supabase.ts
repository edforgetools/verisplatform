import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

export function supabaseClient() {
  const url = ENV.client.NEXT_PUBLIC_SUPABASE_URL;
  const key = ENV.client.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key);
}
