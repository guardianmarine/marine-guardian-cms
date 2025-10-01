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
        // Check if we have an auth session but no staff user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Authenticated but no staff record - show self-provision option
          setAuthError('noUserRecord');
          setIsAuthorized(false);
        } else {
          setIsAuthorized(false);
        }
        setLoading(false);
        return;
      }

      try {
        // Query public.users by auth_user_id or email
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        let { data: staff } = await supabase
          .from('users')
          .select('id,email,role,status,auth_user_id')
          .eq('auth_user_id', authUser?.id)
          .maybeSingle();

        // Fallback by email
        if (!staff && user.email) {
          const res = await supabase
            .from('users')
            .select('id,email,role,status,auth_user_id')
            .eq('email', user.email)
            .maybeSingle();
          staff = res.data || null;
        }

        if (!staff) {
          setAuthError('noUserRecord');
          setIsAuthorized(false);
        } else if (staff.status !== 'active') {
          setAuthError('inactiveAccount');
          setIsAuthorized(false);
        } else if (!allowedRoles.includes(staff.role)) {
          setAuthError('insufficientRole');
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        setAuthError('checkError');
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [user, allowedRoles]);

  const handleSelfProvision = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return;

      await supabase.from('users').upsert(
        {
          email: authUser.email,
          auth_user_id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email,
          status: 'pending',
          role: 'viewer',
        },
        { onConflict: 'email' }
      );

      // Reload the page to re-check authorization
      window.location.reload();
    } catch (error) {
      console.error('Error self-provisioning:', error);
    }
  };

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
          return {
            message: t(
              'common.noUserRecordMessage',
              'Your account has not been set up yet. You can sync your profile or contact your administrator.'
            ),
            showSyncButton: true,
          };
        case 'inactiveAccount':
          return {
            message: t(
              'common.inactiveAccountMessage',
              'Your account is not active. Contact your administrator to activate it.'
            ),
            showSyncButton: false,
          };
        case 'insufficientRole':
          return {
            message: t(
              'common.insufficientRoleMessage',
              'You do not have the required role to access this resource.'
            ),
            showSyncButton: false,
          };
        default:
          return {
            message: t(
              'common.notAuthorizedMessage',
              'You do not have permission to access this resource. Contact your administrator.'
            ),
            showSyncButton: false,
          };
      }
    };

    const errorInfo = getErrorMessage();

    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-lg font-semibold mb-2">
            {t('common.notAuthorized', 'Not Authorized')}
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{errorInfo.message}</p>
            <div className="space-y-2">
              {errorInfo.showSyncButton && (
                <Button onClick={handleSelfProvision} variant="default" className="w-full">
                  {t('common.syncMyProfile', 'Sync my profile')}
                </Button>
              )}
              <Button onClick={() => navigate('/admin')} variant="outline" className="w-full">
                {t('common.backToDashboard', 'Back to Dashboard')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
