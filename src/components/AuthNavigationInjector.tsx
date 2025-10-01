import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * This component injects the navigate function into AuthContext
 * so it can perform SPA navigation instead of hard reloads
 */
export function AuthNavigationInjector() {
  const navigate = useNavigate();
  const { setNavigateFn } = useAuth();

  useEffect(() => {
    if (setNavigateFn) {
      setNavigateFn((path: string) => navigate(path, { replace: true }));
    }
  }, [navigate, setNavigateFn]);

  return null;
}
