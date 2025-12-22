import type { ModuleName, AppRole } from '@/types/permissions';

export type Role = 'admin' | 'inventory' | 'sales' | 'finance' | 'viewer';

export type NavItem = {
  id: string;
  route: string;
  icon: string;
  label: { en: string; es: string };
  roles: Role[];
  /** Optional: module name for granular permission check */
  module?: ModuleName;
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  { 
    id: 'dashboard', 
    route: '/admin', 
    icon: 'Home', 
    label: { en: 'Company Dashboard', es: 'Panel de la Empresa' }, 
    roles: ['admin', 'inventory', 'sales', 'finance', 'viewer'],
    module: 'dashboard'
  },

  { 
    id: 'inventory', 
    route: '/backoffice/inventory', 
    icon: 'Truck', 
    label: { en: 'Inventory', es: 'Inventario' }, 
    roles: ['admin', 'inventory', 'sales', 'finance', 'viewer'],
    module: 'inventory',
    children: [
      { 
        id: 'units', 
        route: '/backoffice/inventory', 
        icon: 'Boxes', 
        label: { en: 'Units', es: 'Unidades' }, 
        roles: ['admin', 'inventory', 'sales', 'finance', 'viewer'],
        module: 'inventory'
      },
      { 
        id: 'media', 
        route: '/backoffice/media', 
        icon: 'Images', 
        label: { en: 'Media Library', es: 'Librería de Medios' }, 
        roles: ['admin', 'inventory'],
        module: 'media'
      },
    ]
  },

  { 
    id: 'cms', 
    route: '/backoffice/cms', 
    icon: 'Layout', 
    label: { en: 'CMS', es: 'CMS' }, 
    roles: ['admin', 'inventory'],
    module: 'cms',
    children: [
      { 
        id: 'home-hero', 
        route: '/backoffice/cms/home-hero', 
        icon: 'Image', 
        label: { en: 'Home Hero', es: 'Hero Home' }, 
        roles: ['admin', 'inventory'],
        module: 'cms'
      },
      { 
        id: 'home-editor', 
        route: '/backoffice/content', 
        icon: 'PanelsTopLeft', 
        label: { en: 'Home Editor', es: 'Editor Home' }, 
        roles: ['admin', 'inventory'],
        module: 'cms'
      },
    ]
  },

  { 
    id: 'purchasing', 
    route: '/backoffice/purchasing', 
    icon: 'ShoppingCart', 
    label: { en: 'Purchasing', es: 'Compras' }, 
    roles: ['admin', 'inventory'],
    module: 'purchasing',
    children: [
      { 
        id: 'suppliers', 
        route: '/backoffice/purchasing/suppliers', 
        icon: 'Building2', 
        label: { en: 'Suppliers', es: 'Proveedores' }, 
        roles: ['admin', 'inventory'],
        module: 'purchasing'
      },
      { 
        id: 'batches', 
        route: '/backoffice/purchasing/batches', 
        icon: 'PackageSearch', 
        label: { en: 'Batches/Lots', es: 'Lotes' }, 
        roles: ['admin', 'inventory'],
        module: 'purchasing'
      },
      { 
        id: 'intakes', 
        route: '/backoffice/purchasing/intakes', 
        icon: 'Inbox', 
        label: { en: 'Purchase Intakes', es: 'Intakes de Compra' }, 
        roles: ['admin', 'inventory'],
        module: 'purchasing'
      },
    ]
  },

  { 
    id: 'crm', 
    route: '/backoffice/crm', 
    icon: 'Users', 
    label: { en: 'CRM', es: 'CRM' }, 
    roles: ['admin', 'sales', 'finance', 'inventory', 'viewer'],
    module: 'crm_accounts',
    children: [
      { 
        id: 'accounts', 
        route: '/backoffice/crm/accounts', 
        icon: 'Building', 
        label: { en: 'Accounts', es: 'Cuentas' }, 
        roles: ['admin', 'sales', 'finance', 'inventory', 'viewer'],
        module: 'crm_accounts'
      },
      { 
        id: 'contacts', 
        route: '/backoffice/crm/contacts', 
        icon: 'Contact', 
        label: { en: 'Contacts', es: 'Contactos' }, 
        roles: ['admin', 'sales', 'finance', 'inventory', 'viewer'],
        module: 'crm_contacts'
      },
      { 
        id: 'leads', 
        route: '/backoffice/crm/leads', 
        icon: 'Megaphone', 
        label: { en: 'Leads', es: 'Leads' }, 
        roles: ['admin', 'sales'],
        module: 'crm_leads'
      },
      { 
        id: 'opportunities', 
        route: '/backoffice/crm/opportunities', 
        icon: 'Handshake', 
        label: { en: 'Opportunities', es: 'Oportunidades' }, 
        roles: ['admin', 'sales'],
        module: 'crm_opportunities'
      },
      { 
        id: 'opportunities-kanban', 
        route: '/backoffice/crm/opportunities/kanban', 
        icon: 'Kanban', 
        label: { en: 'Opportunities Kanban', es: 'Oportunidades Kanban' }, 
        roles: ['admin', 'sales'],
        module: 'crm_opportunities'
      },
      { 
        id: 'tasks', 
        route: '/backoffice/crm/tasks', 
        icon: 'CheckSquare', 
        label: { en: 'My Tasks', es: 'Mis Tareas' }, 
        roles: ['admin', 'sales'],
        module: 'crm_tasks'
      },
      { 
        id: 'inbound-requests', 
        route: '/backoffice/crm/inbound-requests', 
        icon: 'MessageSquare', 
        label: { en: 'Inbound Requests', es: 'Solicitudes Entrantes' }, 
        roles: ['admin', 'sales'],
        module: 'crm_inbound'
      },
    ]
  },

  { 
    id: 'deals', 
    route: '/backoffice/deals', 
    icon: 'ReceiptText', 
    label: { en: 'Deals & Invoices', es: 'Ventas & Facturas' }, 
    roles: ['admin', 'sales', 'finance'],
    module: 'deals',
    children: [
      { 
        id: 'deals-list', 
        route: '/backoffice/deals', 
        icon: 'ListChecks', 
        label: { en: 'Deals', es: 'Ventas' }, 
        roles: ['admin', 'sales', 'finance'],
        module: 'deals'
      },
      { 
        id: 'tax-presets', 
        route: '/backoffice/deals/tax-regimes', 
        icon: 'Scale', 
        label: { en: 'Tax Presets', es: 'Presets de Impuestos' }, 
        roles: ['admin', 'finance'],
        module: 'tax_presets'
      },
    ]
  },

  { 
    id: 'finance', 
    route: '/backoffice/finance', 
    icon: 'BarChart3', 
    label: { en: 'Finance', es: 'Finanzas' }, 
    roles: ['admin', 'finance'],
    module: 'finance_overview',
    children: [
      { 
        id: 'overview', 
        route: '/backoffice/finance/overview', 
        icon: 'ChartColumn', 
        label: { en: 'Overview', es: 'Resumen' }, 
        roles: ['admin', 'finance'],
        module: 'finance_overview'
      },
      { 
        id: 'dashboard', 
        route: '/backoffice/finance/dashboard', 
        icon: 'TrendingUp', 
        label: { en: 'Dashboard', es: 'Panel' }, 
        roles: ['admin', 'finance'],
        module: 'finance_dashboard'
      },
      { 
        id: 'pac-fund', 
        route: '/backoffice/finance/pac-fund', 
        icon: 'Wallet', 
        label: { en: 'PAC Fund', es: 'Fondo PAC' }, 
        roles: ['admin'],
        module: 'pac_fund'
      },
    ]
  },

  { 
    id: 'commissions', 
    route: '/backoffice/finance', 
    icon: 'Coins', 
    label: { en: 'Commissions', es: 'Comisiones' }, 
    roles: ['admin', 'finance', 'sales'],
    module: 'commissions',
    children: [
      { 
        id: 'commissions-list', 
        route: '/backoffice/finance/commissions', 
        icon: 'DollarSign', 
        label: { en: 'Commissions', es: 'Comisiones' }, 
        roles: ['admin', 'finance', 'sales'],
        module: 'commissions'
      },
      { 
        id: 'commissions-report', 
        route: '/backoffice/finance/commissions-report', 
        icon: 'FileBarChart', 
        label: { en: 'Commissions Report', es: 'Reporte de Comisiones' }, 
        roles: ['admin', 'finance', 'sales'],
        module: 'commissions'
      },
    ]
  },

  { 
    id: 'insights', 
    route: '/backoffice/insights', 
    icon: 'Brain', 
    label: { en: 'Insights', es: 'Analíticos' }, 
    roles: ['admin', 'finance', 'sales'],
    module: 'insights'
  },

  { 
    id: 'admin-settings',
    route: '/admin/settings', 
    icon: 'Settings', 
    label: { en: 'Admin Settings', es: 'Ajustes' }, 
    roles: ['admin'],
    module: 'admin_users',
    children: [
      { 
        id: 'users', 
        route: '/admin/settings/users', 
        icon: 'UserCog', 
        label: { en: 'Users & Roles', es: 'Usuarios & Roles' }, 
        roles: ['admin'],
        module: 'admin_users'
      },
      { 
        id: 'permissions', 
        route: '/admin/settings/permissions', 
        icon: 'Shield', 
        label: { en: 'Permissions Matrix', es: 'Matriz de Permisos' }, 
        roles: ['admin'],
        module: 'admin_users'
      },
    ]
  },
];

// Helper function to filter nav items by user role (legacy)
export function filterNavByRole(items: NavItem[], userRole: Role): NavItem[] {
  return items
    .filter(item => item.roles.includes(userRole))
    .map(item => ({
      ...item,
      children: item.children 
        ? filterNavByRole(item.children, userRole)
        : undefined
    }))
    .filter(item => !item.children || item.children.length > 0);
}

// Permission check function type
type CanViewFn = (module: ModuleName) => boolean;

// Helper function to filter nav items by granular permissions
export function filterNavByPermissions(
  items: NavItem[], 
  canView: CanViewFn, 
  isAdmin: boolean
): NavItem[] {
  return items
    .filter(item => {
      // Admins see everything
      if (isAdmin) return true;
      
      // If item has a module, check permission
      if (item.module) {
        return canView(item.module);
      }
      
      // If no module specified, check if any children are visible
      if (item.children) {
        return item.children.some(child => {
          if (!child.module) return true;
          return canView(child.module);
        });
      }
      
      return true;
    })
    .map(item => ({
      ...item,
      children: item.children 
        ? filterNavByPermissions(item.children, canView, isAdmin)
        : undefined
    }))
    .filter(item => !item.children || item.children.length > 0);
}

// Helper function to find nav item by route
export function findNavItemByRoute(items: NavItem[], route: string): NavItem | null {
  for (const item of items) {
    if (item.route === route) return item;
    if (item.children) {
      const found = findNavItemByRoute(item.children, route);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to build breadcrumb trail
export function getBreadcrumbs(items: NavItem[], route: string): NavItem[] {
  const breadcrumbs: NavItem[] = [];
  
  function traverse(items: NavItem[], parents: NavItem[] = []): boolean {
    for (const item of items) {
      if (item.route === route) {
        breadcrumbs.push(...parents, item);
        return true;
      }
      if (item.children) {
        if (traverse(item.children, [...parents, item])) {
          return true;
        }
      }
    }
    return false;
  }
  
  traverse(items);
  return breadcrumbs;
}
