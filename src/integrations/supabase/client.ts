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
  auth: { persistSession: true, autoRefreshToken: true },
});
