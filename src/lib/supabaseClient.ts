import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

// Configuración centralizada de Supabase con 3 fuentes de config
let supabaseInstance: SupabaseClient | null = null;
let configSource: 'env' | 'window' | 'none' = 'none';

function initializeSupabase() {
  // 1. Prioridad: Variables de entorno de build (Vite)
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    configSource = 'env';
    supabaseInstance = createClient(envUrl, envKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return;
  }

  // 2. Fallback: window.__SUPABASE__ (inyectado en index.html)
  const windowConfig = (window as any).__SUPABASE__;
  const windowUrl = windowConfig?.url;
  const windowKey = windowConfig?.anonKey;

  if (windowUrl && windowKey) {
    configSource = 'window';
    supabaseInstance = createClient(windowUrl, windowKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return;
  }

  // 3. No hay configuración disponible
  configSource = 'none';
  supabaseInstance = null;
  console.error(
    '[Supabase] No configuration found. Set VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY or window.__SUPABASE__'
  );
}

// Inicializar al importar
initializeSupabase();

/**
 * Cliente de Supabase (puede ser null si no hay config)
 */
export const supabase = supabaseInstance;

/**
 * Verifica si Supabase está listo para usarse
 */
export function isSupabaseReady(): boolean {
  return supabaseInstance !== null;
}

/**
 * Obtiene la fuente de configuración actual
 */
export function getConfigSource(): 'env' | 'window' | 'none' {
  return configSource;
}

/**
 * Obtiene la sesión actual de forma null-safe
 */
export async function getSession(): Promise<Session | null> {
  if (!supabaseInstance) {
    return null;
  }

  try {
    const { data, error } = await supabaseInstance.auth.getSession();
    if (error) {
      console.error('[Supabase] Error getting session:', error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('[Supabase] Exception getting session:', err);
    return null;
  }
}

/**
 * Refresca la sesión actual de forma null-safe
 */
export async function refreshSession(): Promise<Session | null> {
  if (!supabaseInstance) {
    return null;
  }

  try {
    const { data, error } = await supabaseInstance.auth.refreshSession();
    if (error) {
      console.error('[Supabase] Error refreshing session:', error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('[Supabase] Exception refreshing session:', err);
    return null;
  }
}

/**
 * Obtiene el usuario actual de forma null-safe
 */
export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}
