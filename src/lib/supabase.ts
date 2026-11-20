import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sanitize URL by stripping any accidentally appended /rest/v1 or trailing slashes
const cleanUrl = rawUrl
  ? rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : '';
const cleanAnonKey = rawAnonKey ? rawAnonKey.trim() : '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(cleanUrl && cleanAnonKey && cleanUrl.startsWith('http'));
};

if (!isSupabaseConfigured()) {
  console.warn(
    '[Supabase] Warning: Missing or invalid VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase: SupabaseClient = createClient(
  cleanUrl || 'https://placeholder.supabase.co',
  cleanAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'kidea_supabase_auth',
    },
  }
);

