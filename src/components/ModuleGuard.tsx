import { ReactNode } from 'react';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX, Loader2 } from 'lucide-react';
import type { ModuleName, PermissionAction } from '@/types/permissions';

interface ModuleGuardProps {
  children: ReactNode;
  module: ModuleName;
  action?: PermissionAction;
  fallback?: ReactNode;
  showError?: boolean;
}

/**
 * ModuleGuard - Protects content based on granular module permissions
 * 
 * Usage:
 * <ModuleGuard module="crm_leads" action="edit">
 *   <LeadEditor />
 * </ModuleGuard>
 */
export function ModuleGuard({ 
  children, 
  module, 
  action = 'view',
  fallback = null,
  showError = true 
}: ModuleGuardProps) {
  const { t } = useTranslation();
  const { loading, can } = useModuleAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasPermission = can(module, action);

  if (!hasPermission) {
    if (fallback) return <>{fallback}</>;
    
    if (showError) {
      return (
        <Alert variant="destructive" className="max-w-md mx-auto mt-8">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>{t('common.accessDenied', 'Access Denied')}</AlertTitle>
          <AlertDescription>
            {t('common.noPermission', 'You do not have permission to access this resource.')}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}

/**
 * useCanAccess - Hook for conditional rendering based on permissions
 * 
 * Usage:
 * const { canEdit } = useCanAccess('crm_leads');
 * {canEdit && <EditButton />}
 */
export function useCanAccess(module: ModuleName) {
  const { can, loading } = useModuleAccess();
  
  return {
    loading,
    canView: can(module, 'view'),
    canCreate: can(module, 'create'),
    canEdit: can(module, 'edit'),
    canDelete: can(module, 'delete'),
  };
}

/**
 * PermissionButton - Button that only renders if user has permission
 */
interface PermissionButtonProps {
  module: ModuleName;
  action: PermissionAction;
  children: ReactNode;
}

export function PermissionButton({ module, action, children }: PermissionButtonProps) {
  const { can, loading } = useModuleAccess();
  
  if (loading || !can(module, action)) return null;
  
  return <>{children}</>;
}
