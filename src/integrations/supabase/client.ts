// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

// Read values injected in index.html
const cfg = (window as any).__SUPABASE__ || {};
const url = cfg.url || '';
const anonKey = cfg.anonKey || '';

if (!url || !anonKey) {
  console.warn('Missing Supabase config. Did you add window.__SUPABASE__ in public/index.html?');
}

export const supabase = createClient(url, anonKey, {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true,
    detectSessionInUrl: true 
  },
});

/**
 * Get the current authenticated user or null if no valid session exists.
 * This function checks for a valid session without throwing errors.
 */
export const getCurrentUserOrNull = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error getting session:', error);
      return null;
    }
    return session?.user ?? null;
  } catch (err) {
    console.warn('Unexpected error getting session:', err);
    return null;
  }
};
