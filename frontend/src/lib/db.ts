import { supabaseAdmin } from './supabaseAdmin';

// service client for server actions
export const supabaseService = () => {
  return supabaseAdmin();
};
