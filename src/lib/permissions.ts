import { UserRole } from '@/types';

export interface CRMPermissions {
  canViewCRM: boolean;
  canEditCRM: boolean;
  canCreateCRM: boolean;
  canDeleteCRM: boolean;
  canViewCosts: boolean; // Always false for CRM - costs only in Deals/Finance
}

export interface DealsPermissions {
  canCreateDeal: boolean;
  canEditDeal: boolean;
  canEditPrices: boolean;
  canPreviewFees: boolean;
  canIssueDeal: boolean;
  canEditFees: boolean;
  canRecordPayment: boolean;
  canMarkDelivered: boolean;
  canCloseDeal: boolean;
  canViewCosts: boolean;
}

export interface FinancePermissions {
  canViewDashboards: boolean;
  canEditFeeOverrides: boolean;
  canRecordPayments: boolean;
  canManageCommissions: boolean;
  canMarkPaid: boolean;
  canViewAllDeals: boolean;
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
 * Get Deals permissions for a given user role
 * 
 * Sales: Can create/edit deals, prices, preview fees, issue deals
 * Finance: Can edit fees, record payments, mark delivered/close, view costs
 * Admin: Full access
 */
export const getDealsPermissions = (role: UserRole): DealsPermissions => {
  switch (role) {
    case 'admin':
      return {
        canCreateDeal: true,
        canEditDeal: true,
        canEditPrices: true,
        canPreviewFees: true,
        canIssueDeal: true,
        canEditFees: true,
        canRecordPayment: true,
        canMarkDelivered: true,
        canCloseDeal: true,
        canViewCosts: true,
      };
    
    case 'sales':
      return {
        canCreateDeal: true,
        canEditDeal: true,
        canEditPrices: true,
        canPreviewFees: true,
        canIssueDeal: true,
        canEditFees: false,
        canRecordPayment: false,
        canMarkDelivered: false,
        canCloseDeal: false,
        canViewCosts: false,
      };
    
    case 'finance':
      return {
        canCreateDeal: false,
        canEditDeal: false,
        canEditPrices: false,
        canPreviewFees: true,
        canIssueDeal: false,
        canEditFees: true,
        canRecordPayment: true,
        canMarkDelivered: true,
        canCloseDeal: true,
        canViewCosts: true,
      };
    
    default:
      return {
        canCreateDeal: false,
        canEditDeal: false,
        canEditPrices: false,
        canPreviewFees: false,
        canIssueDeal: false,
        canEditFees: false,
        canRecordPayment: false,
        canMarkDelivered: false,
        canCloseDeal: false,
        canViewCosts: false,
      };
  }
};

/**
 * Get Finance permissions for a given user role
 * 
 * Finance: Full access to dashboards, fee overrides, payments, commissions
 * Admin: Full access
 */
export const getFinancePermissions = (role: UserRole): FinancePermissions => {
  switch (role) {
    case 'admin':
    case 'finance':
      return {
        canViewDashboards: true,
        canEditFeeOverrides: true,
        canRecordPayments: true,
        canManageCommissions: true,
        canMarkPaid: true,
        canViewAllDeals: true,
      };
    
    default:
      return {
        canViewDashboards: false,
        canEditFeeOverrides: false,
        canRecordPayments: false,
        canManageCommissions: false,
        canMarkPaid: false,
        canViewAllDeals: false,
      };
  }
};

/**
 * Check if user has admin role
 */
export const isAdmin = (role: UserRole): boolean => {
  return role === 'admin';
};

/**
 * Check if user has finance or admin role
 */
export const isFinanceOrAdmin = (role: UserRole): boolean => {
  return role === 'finance' || role === 'admin';
};

/**
 * Check if user has sales role
 */
export const isSales = (role: UserRole): boolean => {
  return role === 'sales';
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
