import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveUserForSession } from '@/services/authUser';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [state, setState] = useState<'checking' | 'allowed' | 'login' | 'noaccess'>('checking');
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  useEffect(() => {
    let mounted = true;
    
    // Wait for AuthContext to finish loading
    if (authLoading) return;
    
    (async () => {
      // If AuthContext says not authenticated, redirect to login immediately
      if (!isAuthenticated) {
        if (mounted) setState('login');
        return;
      }

      const { session, staff } = await getActiveUserForSession();
      
      if (!mounted) return;

      // No session → redirect to login
      if (!session) {
        setState('login');
        return;
      }

      // No staff record → redirect to no-access
      if (!staff) {
        setState('noaccess');
        return;
      }

      // Staff exists but not active → redirect to no-access
      if ((staff.status ?? '').toLowerCase() !== 'active') {
        setState('noaccess');
        return;
      }

      // All good → allow access
      setState('allowed');
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, authLoading, user]);

  if (state === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (state === 'login') {
    return <Navigate to="/login" replace />;
  }

  if (state === 'noaccess') {
    return <Navigate to="/no-access" replace />;
  }

  return <>{children}</>;
}
