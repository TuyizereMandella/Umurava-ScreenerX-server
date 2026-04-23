import { createClient } from '@supabase/supabase-js';
import { config } from './env';

// We use the Service Role Key for the backend to bypass RLS and perform admin operations
if (!config.supabase.url || !config.supabase.serviceKey) {
  console.warn('Supabase URL or Service Key is missing. Check your .env.local file.');
}

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);
