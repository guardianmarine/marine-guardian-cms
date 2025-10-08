import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { toast } from 'sonner';

/**
 * Global hook to detect 401/403 errors from Supabase queries
 * and handle session expiration gracefully
 */
export function useSessionErrorHandler() {
  const { logout } = useAuth();

  useEffect(() => {
    if (!isSupabaseReady() || !supabase) {
      return;
    }

    // Listen to auth state changes for SIGNED_OUT events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        // Session expired or signed out
        setTimeout(() => {
          toast.error('Your session has expired. Please log in again.');
          logout();
        }, 100);
      }
    });

    return () => subscription.unsubscribe();
  }, [logout]);
}

/**
 * Utility to check if an error is an authentication error (401/403)
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  // Check for Supabase auth errors
  if (error.message?.includes('JWT') || 
      error.message?.includes('session') ||
      error.message?.includes('not authenticated')) {
    return true;
  }
  
  // Check for HTTP 401/403 status codes
  if (error.status === 401 || error.status === 403) {
    return true;
  }
  
  return false;
}

/**
 * Wrapper for handling auth errors in query catch blocks
 */
export function handleQueryError(error: any, logout: () => void, customMessage?: string) {
  if (isAuthError(error)) {
    toast.error('Your session has expired. Please log in again.');
    setTimeout(() => logout(), 1000);
  } else {
    toast.error(customMessage || error?.message || 'An error occurred');
  }
}
