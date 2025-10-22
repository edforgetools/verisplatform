import { supabaseAdmin } from './supabaseAdmin';
import { supabaseClient } from './supabase';

// service client for server actions
export const supabaseService = () => {
  return supabaseAdmin();
};
