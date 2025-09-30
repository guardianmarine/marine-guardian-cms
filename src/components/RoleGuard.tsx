import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        // Query public.users to verify status and role
        const { data, error } = await supabase
          .from('users')
          .select('id,email,role,status')
          .eq('email', user.email)
          .single();

        if (error) {
          // If users table doesn't exist or user not found
          if (error.code === 'PGRST116' || error.message.includes('relation')) {
            // Fallback to checking role from auth context
            setIsAuthorized(allowedRoles.includes(user.role));
          } else {
            throw error;
          }
        } else if (!data) {
          setAuthError('noUserRecord');
          setIsAuthorized(false);
        } else if (data.status !== 'active') {
          setAuthError('inactiveAccount');
          setIsAuthorized(false);
        } else if (!allowedRoles.includes(data.role)) {
          setAuthError('insufficientRole');
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        // Fallback to auth context check
        setIsAuthorized(allowedRoles.includes(user.role));
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [user, allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    const getErrorMessage = () => {
      switch (authError) {
        case 'noUserRecord':
          return t(
            'common.noUserRecordMessage',
            'Your account has not been set up yet. Contact your administrator to grant you access.'
          );
        case 'inactiveAccount':
          return t(
            'common.inactiveAccountMessage',
            'Your account is not active. Contact your administrator to activate it.'
          );
        case 'insufficientRole':
          return t(
            'common.insufficientRoleMessage',
            'You do not have the required role to access this resource.'
          );
        default:
          return t(
            'common.notAuthorizedMessage',
            'You do not have permission to access this resource. Contact your administrator.'
          );
      }
    };

    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-lg font-semibold mb-2">
            {t('common.notAuthorized', 'Not Authorized')}
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{getErrorMessage()}</p>
            <Button onClick={() => navigate('/admin')} variant="outline" className="w-full">
              {t('common.backToDashboard', 'Back to Dashboard')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
