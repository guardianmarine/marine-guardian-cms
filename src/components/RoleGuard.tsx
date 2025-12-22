import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ShieldX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { ModuleName, PermissionAction, AppRole } from '@/types/permissions';

interface RoleGuardProps {
  children: ReactNode;
  /** Legacy: allowed roles for backward compatibility (optional when module is provided) */
  allowedRoles?: string[];
  /** New: module to check granular permission for */
  module?: ModuleName;
  /** New: action to check (defaults to 'view') */
  action?: PermissionAction;
  /** Custom fallback component */
  fallback?: ReactNode;
}

/**
 * RoleGuard - Hybrid route protection with granular permissions
 * 
 * When `module` is provided, uses granular permission checking.
 * Otherwise, falls back to legacy role-based checking.
 * 
 * This provides backward compatibility while allowing gradual migration
 * to the new granular permission system.
 */
export function RoleGuard({ 
  children, 
  allowedRoles, 
  module,
  action = 'view',
  fallback 
}: RoleGuardProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading: permLoading, can, isAdmin, hasAnyRole, roles } = useModuleAccess();
  
  const [legacyLoading, setLegacyLoading] = useState(!module);
  const [legacyAuthorized, setLegacyAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Legacy role-based check (only runs if module is not provided)
  useEffect(() => {
    if (module) {
      // Using granular permissions, skip legacy check
      setLegacyLoading(false);
      return;
    }

    const checkAuthorization = async () => {
      if (!user) {
        setLegacyAuthorized(false);
        setLegacyLoading(false);
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
          setLegacyAuthorized(false);
        } else if (staff.status !== 'active') {
          setAuthError('inactiveAccount');
          setLegacyAuthorized(false);
        } else if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(staff.role)) {
          setAuthError('insufficientRole');
          setLegacyAuthorized(false);
        } else {
          setLegacyAuthorized(true);
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        setAuthError('checkError');
        setLegacyAuthorized(false);
      } finally {
        setLegacyLoading(false);
      }
    };

    checkAuthorization();
  }, [user, allowedRoles, module]);

  // Determine loading state
  const isLoading = module ? permLoading : legacyLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Determine authorization
  let isAuthorized: boolean;
  
  if (module) {
    // Granular permission check
    isAuthorized = can(module, action);
    
    // Also check if user has any of the allowed roles (hybrid mode)
    // This ensures backward compatibility with existing role requirements
    if (isAuthorized && !isAdmin && allowedRoles && allowedRoles.length > 0) {
      const hasRequiredRole = hasAnyRole(allowedRoles as AppRole[]);
      // If roles are specified but user doesn't have them, and they're not admin
      // Still allow if they have the module permission (granular takes precedence)
      isAuthorized = hasRequiredRole || can(module, action);
    }
  } else {
    // Legacy role-based check
    isAuthorized = legacyAuthorized;
  }

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    const getErrorMessage = () => {
      if (module) {
        return t(
          'common.noModulePermission',
          'You do not have permission to access this module. Contact your administrator if you need access.'
        );
      }
      
      switch (authError) {
        case 'noUserRecord':
          return t(
            'common.noUserRecordMessage',
            'Your account has not been set up. Contact your administrator to activate your access.'
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
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Alert variant="destructive" className="max-w-md">
          {module ? <ShieldX className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
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
