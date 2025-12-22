// =====================================================
// GRANULAR PERMISSIONS SYSTEM TYPES
// =====================================================

export type AppRole = 'admin' | 'inventory' | 'sales' | 'finance' | 'viewer';

// All available modules in the system
export type ModuleName =
  | 'dashboard'
  | 'inventory'
  | 'media'
  | 'cms'
  | 'purchasing'
  | 'crm_accounts'
  | 'crm_contacts'
  | 'crm_leads'
  | 'crm_opportunities'
  | 'crm_tasks'
  | 'crm_inbound'
  | 'deals'
  | 'tax_presets'
  | 'finance_overview'
  | 'finance_dashboard'
  | 'pac_fund'
  | 'commissions'
  | 'insights'
  | 'admin_users';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermission {
  module_name: ModuleName;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  emergency_contact: Record<string, any> | null;
  commission_percent: number;
  status: 'active' | 'inactive' | 'invited';
  created_at: string;
  updated_at: string;
}

export interface UserWithRolesAndPermissions extends UserProfile {
  roles: AppRole[];
  permissions: ModulePermission[];
}

// Module metadata for UI display
export interface ModuleMetadata {
  name: ModuleName;
  label: string;
  labelEs: string;
  description: string;
  descriptionEs: string;
  category: 'core' | 'crm' | 'finance' | 'admin';
}

export const MODULE_METADATA: ModuleMetadata[] = [
  // Core modules
  { name: 'dashboard', label: 'Dashboard', labelEs: 'Panel', description: 'Main dashboard', descriptionEs: 'Panel principal', category: 'core' },
  { name: 'inventory', label: 'Inventory', labelEs: 'Inventario', description: 'Manage units', descriptionEs: 'Gestionar unidades', category: 'core' },
  { name: 'media', label: 'Media Library', labelEs: 'Librería de Medios', description: 'Manage media files', descriptionEs: 'Gestionar archivos multimedia', category: 'core' },
  { name: 'cms', label: 'CMS', labelEs: 'CMS', description: 'Content management', descriptionEs: 'Gestión de contenido', category: 'core' },
  { name: 'purchasing', label: 'Purchasing', labelEs: 'Compras', description: 'Suppliers and purchase orders', descriptionEs: 'Proveedores y órdenes de compra', category: 'core' },
  
  // CRM modules
  { name: 'crm_accounts', label: 'Accounts', labelEs: 'Cuentas', description: 'Customer accounts', descriptionEs: 'Cuentas de clientes', category: 'crm' },
  { name: 'crm_contacts', label: 'Contacts', labelEs: 'Contactos', description: 'Contact management', descriptionEs: 'Gestión de contactos', category: 'crm' },
  { name: 'crm_leads', label: 'Leads', labelEs: 'Leads', description: 'Lead tracking', descriptionEs: 'Seguimiento de leads', category: 'crm' },
  { name: 'crm_opportunities', label: 'Opportunities', labelEs: 'Oportunidades', description: 'Sales opportunities', descriptionEs: 'Oportunidades de venta', category: 'crm' },
  { name: 'crm_tasks', label: 'Tasks', labelEs: 'Tareas', description: 'Task management', descriptionEs: 'Gestión de tareas', category: 'crm' },
  { name: 'crm_inbound', label: 'Inbound Requests', labelEs: 'Solicitudes Entrantes', description: 'Inbound lead requests', descriptionEs: 'Solicitudes de leads entrantes', category: 'crm' },
  
  // Finance modules
  { name: 'deals', label: 'Deals', labelEs: 'Ventas', description: 'Deal management', descriptionEs: 'Gestión de ventas', category: 'finance' },
  { name: 'tax_presets', label: 'Tax Presets', labelEs: 'Presets de Impuestos', description: 'Tax configuration', descriptionEs: 'Configuración de impuestos', category: 'finance' },
  { name: 'finance_overview', label: 'Finance Overview', labelEs: 'Resumen Financiero', description: 'Financial overview', descriptionEs: 'Resumen financiero', category: 'finance' },
  { name: 'finance_dashboard', label: 'Finance Dashboard', labelEs: 'Dashboard Financiero', description: 'Financial analytics', descriptionEs: 'Analíticas financieras', category: 'finance' },
  { name: 'pac_fund', label: 'PAC Fund', labelEs: 'Fondo PAC', description: 'PAC fund management', descriptionEs: 'Gestión del fondo PAC', category: 'finance' },
  { name: 'commissions', label: 'Commissions', labelEs: 'Comisiones', description: 'Commission tracking', descriptionEs: 'Seguimiento de comisiones', category: 'finance' },
  { name: 'insights', label: 'Insights', labelEs: 'Insights', description: 'Business analytics', descriptionEs: 'Analíticas de negocio', category: 'finance' },
  
  // Admin modules
  { name: 'admin_users', label: 'User Management', labelEs: 'Gestión de Usuarios', description: 'Manage users and permissions', descriptionEs: 'Gestionar usuarios y permisos', category: 'admin' },
];

// Helper to get module metadata
export function getModuleMetadata(moduleName: ModuleName): ModuleMetadata | undefined {
  return MODULE_METADATA.find(m => m.name === moduleName);
}

// Helper to get modules by category
export function getModulesByCategory(category: ModuleMetadata['category']): ModuleMetadata[] {
  return MODULE_METADATA.filter(m => m.category === category);
}
