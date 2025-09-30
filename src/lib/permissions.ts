import { UserRole } from '@/types';

export interface CRMPermissions {
  canViewCRM: boolean;
  canEditCRM: boolean;
  canCreateCRM: boolean;
  canDeleteCRM: boolean;
  canViewCosts: boolean; // Always false for CRM - costs only in Deals/Finance
}

/**
 * Get CRM permissions for a given user role
 * 
 * Sales: Full access to CRM (view, edit, create, delete)
 * Finance: Read-only CRM access
 * Inventory: Read-only CRM access
 * Admin: Full access to everything
 * Viewer: Read-only access
 * 
 * IMPORTANT: Cost/margin data is NEVER exposed in CRM views
 */
export const getCRMPermissions = (role: UserRole): CRMPermissions => {
  switch (role) {
    case 'admin':
      return {
        canViewCRM: true,
        canEditCRM: true,
        canCreateCRM: true,
        canDeleteCRM: true,
        canViewCosts: false, // Costs only visible in Deals/Finance module
      };
    
    case 'sales':
      return {
        canViewCRM: true,
        canEditCRM: true,
        canCreateCRM: true,
        canDeleteCRM: true,
        canViewCosts: false, // Sales cannot see costs/margins
      };
    
    case 'finance':
      return {
        canViewCRM: true,
        canEditCRM: false,
        canCreateCRM: false,
        canDeleteCRM: false,
        canViewCosts: false, // Costs only in Deals/Finance module, not CRM
      };
    
    case 'inventory':
      return {
        canViewCRM: true,
        canEditCRM: false,
        canCreateCRM: false,
        canDeleteCRM: false,
        canViewCosts: false,
      };
    
    case 'viewer':
      return {
        canViewCRM: true,
        canEditCRM: false,
        canCreateCRM: false,
        canDeleteCRM: false,
        canViewCosts: false,
      };
    
    default:
      return {
        canViewCRM: false,
        canEditCRM: false,
        canCreateCRM: false,
        canDeleteCRM: false,
        canViewCosts: false,
      };
  }
};

/**
 * Check if user has permission to access a specific CRM action
 */
export const canUserAccessCRM = (role: UserRole, action: 'view' | 'edit' | 'create' | 'delete'): boolean => {
  const permissions = getCRMPermissions(role);
  
  switch (action) {
    case 'view':
      return permissions.canViewCRM;
    case 'edit':
      return permissions.canEditCRM;
    case 'create':
      return permissions.canCreateCRM;
    case 'delete':
      return permissions.canDeleteCRM;
    default:
      return false;
  }
};

/**
 * Get user-friendly permission error message
 */
export const getPermissionErrorMessage = (action: 'view' | 'edit' | 'create' | 'delete'): string => {
  const messages = {
    view: 'You do not have permission to view this resource.',
    edit: 'You do not have permission to edit this resource. Contact your administrator.',
    create: 'You do not have permission to create new items. Contact your administrator.',
    delete: 'You do not have permission to delete this resource. Contact your administrator.',
  };
  
  return messages[action] || 'Permission denied.';
};
