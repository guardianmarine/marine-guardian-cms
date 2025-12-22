import { ReactNode } from 'react';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { ModuleName, PermissionAction, AppRole } from '@/types/permissions';

interface PermissionGuardProps {
  children: ReactNode;
  /** Module to check permission for */
  module: ModuleName;
  /** Action to check (defaults to 'view') */
  action?: PermissionAction;
  /** Optional: also require one of these roles (hybrid check) */
  allowedRoles?: string[];
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Whether to show error UI when access denied (default: true) */
  showError?: boolean;
}

/**
 * PermissionGuard - Route-level protection based on granular module permissions
 * 
 * This component provides granular permission checking for routes.
 * It checks the user's permissions for a specific module and action.
 * 
 * Usage:
 * <PermissionGuard module="crm_leads" action="view">
 *   <LeadsPage />
 * </PermissionGuard>
 * 
 * Hybrid usage (require both module permission AND role):
 * <PermissionGuard module="pac_fund" action="view" allowedRoles={['admin']}>
 *   <PACFundPage />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  children, 
  module, 
  action = 'view',
  allowedRoles,
  fallback,
  showError = true 
}: PermissionGuardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, can, isAdmin, hasAnyRole } = useModuleAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check permission
  let hasPermission = can(module, action);
  
  // If allowedRoles is provided, also check role (hybrid mode)
  if (hasPermission && allowedRoles && allowedRoles.length > 0) {
    // Admins bypass role check
    if (!isAdmin) {
      hasPermission = hasAnyRole(allowedRoles as AppRole[]);
    }
  }

  if (!hasPermission) {
    if (fallback) return <>{fallback}</>;
    
    if (showError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Alert variant="destructive" className="max-w-md">
            <ShieldX className="h-4 w-4" />
            <AlertTitle className="text-lg font-semibold mb-2">
              {t('common.accessDenied', 'Access Denied')}
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                {t(
                  'common.noModulePermission', 
                  'You do not have permission to access this module. Contact your administrator if you need access.'
                )}
              </p>
              <Button onClick={() => navigate('/admin')} variant="outline" className="w-full">
                {t('common.backToDashboard', 'Back to Dashboard')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}
