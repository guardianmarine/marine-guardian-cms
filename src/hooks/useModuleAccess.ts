import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole, ModuleName, ModulePermission, PermissionAction } from '@/types/permissions';

interface UseModuleAccessReturn {
  loading: boolean;
  error: string | null;
  roles: AppRole[];
  permissions: ModulePermission[];
  isAdmin: boolean;
  primaryRole: AppRole | null;
  
  // Permission check functions
  can: (module: ModuleName, action: PermissionAction) => boolean;
  canView: (module: ModuleName) => boolean;
  canCreate: (module: ModuleName) => boolean;
  canEdit: (module: ModuleName) => boolean;
  canDelete: (module: ModuleName) => boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  
  // Reload permissions
  refetch: () => Promise<void>;
}

export function useModuleAccess(): UseModuleAccessReturn {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);

  // Use auth.users UUID, not legacy users.id
  const authUserId = session?.user?.id;

  const fetchPermissions = useCallback(async () => {
    if (!authUserId || !session) {
      setLoading(false);
      setRoles([]);
      setPermissions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[useModuleAccess] Fetching permissions for auth user:', authUserId);

      // Fetch roles using auth.users UUID
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUserId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        // Fallback to legacy role if available
        if (user.role) {
          setRoles([user.role as AppRole]);
        }
      } else {
        setRoles((rolesData || []).map(r => r.role as AppRole));
      }

      // Fetch permissions using auth.users UUID
      const { data: permsData, error: permsError } = await supabase
        .from('user_permissions')
        .select('module_name, can_view, can_create, can_edit, can_delete')
        .eq('user_id', authUserId);

      console.log('[useModuleAccess] Roles:', rolesData, 'Permissions:', permsData?.length);

      if (permsError) {
        console.error('Error fetching permissions:', permsError);
        setPermissions([]);
      } else {
        setPermissions((permsData || []) as ModulePermission[]);
      }
    } catch (err) {
      console.error('Error in useModuleAccess:', err);
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [authUserId, session]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Memoized computed values
  const isAdmin = useMemo(() => roles.includes('admin'), [roles]);
  
  const primaryRole = useMemo((): AppRole | null => {
    const priority: AppRole[] = ['admin', 'finance', 'sales', 'inventory', 'viewer'];
    for (const role of priority) {
      if (roles.includes(role)) return role;
    }
    return roles[0] || null;
  }, [roles]);

  // Permission check functions
  const can = useCallback((module: ModuleName, action: PermissionAction): boolean => {
    // Admins have full access
    if (isAdmin) return true;
    
    const perm = permissions.find(p => p.module_name === module);
    if (!perm) return false;
    
    switch (action) {
      case 'view': return perm.can_view;
      case 'create': return perm.can_create;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      default: return false;
    }
  }, [permissions, isAdmin]);

  const canView = useCallback((module: ModuleName) => can(module, 'view'), [can]);
  const canCreate = useCallback((module: ModuleName) => can(module, 'create'), [can]);
  const canEdit = useCallback((module: ModuleName) => can(module, 'edit'), [can]);
  const canDelete = useCallback((module: ModuleName) => can(module, 'delete'), [can]);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);
  const hasAnyRole = useCallback((checkRoles: AppRole[]) => 
    checkRoles.some(role => roles.includes(role)), [roles]);

  return {
    loading,
    error,
    roles,
    permissions,
    isAdmin,
    primaryRole,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasRole,
    hasAnyRole,
    refetch: fetchPermissions,
  };
}

// Standalone permission check for use outside of React components
export async function checkModulePermission(
  userId: string,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
  try {
    // Check if user is admin first
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (roles?.some(r => r.role === 'admin')) return true;

    // Check specific permission
    const { data: perm } = await supabase
      .from('user_permissions')
      .select('can_view, can_create, can_edit, can_delete')
      .eq('user_id', userId)
      .eq('module_name', module)
      .single();

    if (!perm) return false;

    switch (action) {
      case 'view': return perm.can_view;
      case 'create': return perm.can_create;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      default: return false;
    }
  } catch {
    return false;
  }
}
