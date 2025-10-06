import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Gets the current session or returns null if not authenticated.
 * This is a lightweight check without refreshing.
 */
export async function getSessionOrPromptLogin(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return null;
    }
    return session;
  } catch (err) {
    console.warn('Error getting session:', err);
    return null;
  }
}

/**
 * Ensures we have a fresh session by refreshing if needed.
 * Returns the session or null if authentication fails.
 */
export async function ensureFreshSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }
    
    // Try to refresh the session (no-op if already fresh)
    const { data } = await supabase.auth.refreshSession();
    return data.session ?? session;
  } catch (err) {
    console.warn('Error refreshing session:', err);
    return null;
  }
}

/**
 * Requires a valid authenticated user.
 * Returns the user object or null if not authenticated.
 * Use this before performing authenticated operations.
 */
export async function requireUser(): Promise<User | null> {
  const session = await ensureFreshSession();
  return session?.user ?? null;
}

/**
 * Redirects to the login page with a return URL.
 */
export function redirectToLogin(returnUrl?: string): void {
  const url = returnUrl || window.location.pathname;
  window.location.href = `/backoffice/login?returnUrl=${encodeURIComponent(url)}`;
}
