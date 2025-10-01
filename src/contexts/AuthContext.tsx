import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Defer staff row fetch with setTimeout
          setTimeout(() => {
            fetchStaffUser(currentSession.user);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        fetchStaffUser(currentSession.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchStaffUser = async (authUser: SupabaseUser) => {
    try {
      // Try by auth_user_id first
      let { data: staff } = await supabase
        .from('users')
        .select('id,email,name,role,status,auth_user_id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      // Fallback by email
      if (!staff && authUser.email) {
        const res = await supabase
          .from('users')
          .select('id,email,name,role,status,auth_user_id')
          .eq('email', authUser.email)
          .maybeSingle();
        staff = res.data || null;
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    
    if (error) throw error;
  };

  const logout = async () => {
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
