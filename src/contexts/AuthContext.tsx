import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Debug helper (optional)
if (typeof window !== 'undefined') {
  (window as any).sb = supabase;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar que Supabase esté configurado
    if (!isSupabaseReady() || !supabase) {
      console.error('[AuthContext] Supabase not configured');
      setLoading(false);
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('[AuthContext] Auth event:', event, 'Session:', !!currentSession);
        
        setSession(currentSession);
        
        // Handle session expiration or sign out
        if (event === 'SIGNED_OUT' || (!currentSession && event === 'TOKEN_REFRESHED')) {
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (currentSession?.user) {
          // Defer staff row fetch with setTimeout to avoid blocking the auth callback
          setTimeout(() => {
            fetchStaffUser(currentSession.user);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session and try to refresh it
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (currentSession) {
        // Try to refresh the session to ensure it's still valid
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.warn('[AuthContext] Session refresh failed:', refreshError?.message);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(refreshData.session);
        if (refreshData.session?.user) {
          fetchStaffUser(refreshData.session.user);
        } else {
          setLoading(false);
        }
      } else {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchStaffUser = async (authUser: SupabaseUser) => {
    if (!supabase) return;

    try {
      // Try by auth_user_id first
      let { data: staff } = await supabase
        .from('users')
        .select('id,email,name,role,status,auth_user_id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      // Fallback by email (for legacy accounts)
      if (!staff && authUser.email) {
        const res = await supabase
          .from('users')
          .select('id,email,name,role,status,auth_user_id')
          .ilike('email', authUser.email)
          .maybeSingle();
        staff = res.data || null;

        // Link auth_user_id if found by email but not linked
        if (staff && !staff.auth_user_id) {
          await supabase
            .from('users')
            .update({ auth_user_id: authUser.id })
            .eq('id', staff.id);
          staff.auth_user_id = authUser.id;
        }
      }

      if (staff) {
        // Check if status is not active - set user to null
        if (staff.status !== 'active') {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser({
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // No staff record found
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching staff user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase no está configurado');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    
    if (error) throw error;
  };

  const logout = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
