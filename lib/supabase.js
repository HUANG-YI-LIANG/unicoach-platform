import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Default client for public/anon access
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend server-side operations (bypasses RLS)
export function getAdminSupabase() {
  if (!supabaseServiceKey || supabaseServiceKey === 'insert_your_service_role_key_here') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is perfectly required for backend administration.');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
