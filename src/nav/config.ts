export type Role = 'admin' | 'inventory' | 'sales' | 'finance' | 'viewer';

export type NavItem = {
  id: string;
  route: string;
  icon: string;
  label: { en: string; es: string };
  roles: Role[];
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  { 
    id: 'dashboard', 
    route: '/admin', 
    icon: 'Home', 
    label: { en: 'Company Dashboard', es: 'Panel de la Empresa' }, 
    roles: ['admin', 'inventory', 'sales', 'finance', 'viewer'] 
  },

  { 
    id: 'inventory', 
    route: '/backoffice/inventory', 
    icon: 'Truck', 
    label: { en: 'Inventory', es: 'Inventario' }, 
    roles: ['admin', 'inventory', 'sales', 'finance', 'viewer'],
    children: [
      { 
        id: 'units', 
        route: '/backoffice/inventory', 
        icon: 'Boxes', 
        label: { en: 'Units', es: 'Unidades' }, 
        roles: ['admin', 'inventory', 'sales', 'finance', 'viewer'] 
      },
      { 
        id: 'media', 
        route: '/backoffice/media', 
        icon: 'Images', 
        label: { en: 'Media Library', es: 'Librería de Medios' }, 
        roles: ['admin', 'inventory'] 
      },
    ]
  },

  { 
    id: 'cms', 
    route: '/backoffice/cms', 
    icon: 'Layout', 
    label: { en: 'CMS', es: 'CMS' }, 
    roles: ['admin', 'inventory'],
    children: [
      { 
        id: 'home-hero', 
        route: '/backoffice/cms/home-hero', 
        icon: 'Image', 
        label: { en: 'Home Hero', es: 'Hero Home' }, 
        roles: ['admin', 'inventory'] 
      },
      { 
        id: 'home-editor', 
        route: '/backoffice/content', 
        icon: 'PanelsTopLeft', 
        label: { en: 'Home Editor', es: 'Editor Home' }, 
        roles: ['admin', 'inventory'] 
      },
    ]
  },

  { 
    id: 'purchasing', 
    route: '/backoffice/purchasing', 
    icon: 'ShoppingCart', 
    label: { en: 'Purchasing', es: 'Compras' }, 
    roles: ['admin', 'inventory'],
    children: [
      { 
        id: 'suppliers', 
        route: '/backoffice/purchasing/suppliers', 
        icon: 'Building2', 
        label: { en: 'Suppliers', es: 'Proveedores' }, 
        roles: ['admin', 'inventory'] 
      },
      { 
        id: 'batches', 
        route: '/backoffice/purchasing/batches', 
        icon: 'PackageSearch', 
        label: { en: 'Batches/Lots', es: 'Lotes' }, 
        roles: ['admin', 'inventory'] 
      },
      { 
        id: 'intakes', 
        route: '/backoffice/purchasing/intakes', 
        icon: 'Inbox', 
        label: { en: 'Purchase Intakes', es: 'Intakes de Compra' }, 
        roles: ['admin', 'inventory'] 
      },
    ]
  },

  { 
    id: 'crm', 
    route: '/backoffice/crm', 
    icon: 'Users', 
    label: { en: 'CRM', es: 'CRM' }, 
    roles: ['admin', 'sales', 'finance', 'inventory', 'viewer'],
    children: [
      { 
        id: 'accounts', 
        route: '/backoffice/crm/accounts', 
        icon: 'Building', 
        label: { en: 'Accounts', es: 'Cuentas' }, 
        roles: ['admin', 'sales', 'finance', 'inventory', 'viewer'] 
      },
      { 
        id: 'contacts', 
        route: '/backoffice/crm/contacts', 
        icon: 'Contact', 
        label: { en: 'Contacts', es: 'Contactos' }, 
        roles: ['admin', 'sales', 'finance', 'inventory', 'viewer'] 
      },
      { 
        id: 'leads', 
        route: '/backoffice/crm/leads', 
        icon: 'Megaphone', 
        label: { en: 'Leads', es: 'Leads' }, 
        roles: ['admin', 'sales'] 
      },
      { 
        id: 'opportunities', 
        route: '/backoffice/crm/opportunities', 
        icon: 'Handshake', 
        label: { en: 'Opportunities', es: 'Oportunidades' }, 
        roles: ['admin', 'sales'] 
      },
      { 
        id: 'opportunities-kanban', 
        route: '/backoffice/crm/opportunities/kanban', 
        icon: 'Kanban', 
        label: { en: 'Opportunities Kanban', es: 'Oportunidades Kanban' }, 
        roles: ['admin', 'sales'] 
      },
      { 
        id: 'tasks', 
        route: '/backoffice/crm/tasks', 
        icon: 'CheckSquare', 
        label: { en: 'My Tasks', es: 'Mis Tareas' }, 
        roles: ['admin', 'sales'] 
      },
      { 
        id: 'inbound-requests', 
        route: '/backoffice/crm/inbound-requests', 
        icon: 'MessageSquare', 
        label: { en: 'Inbound Requests', es: 'Solicitudes Entrantes' }, 
        roles: ['admin', 'sales'] 
      },
    ]
  },

  { 
    id: 'deals', 
    route: '/backoffice/deals', 
    icon: 'ReceiptText', 
    label: { en: 'Deals & Invoices', es: 'Ventas & Facturas' }, 
    roles: ['admin', 'sales', 'finance'],
    children: [
      { 
        id: 'deals-list', 
        route: '/backoffice/deals', 
        icon: 'ListChecks', 
        label: { en: 'Deals', es: 'Ventas' }, 
        roles: ['admin', 'sales', 'finance'] 
      },
      { 
        id: 'tax-presets', 
        route: '/backoffice/deals/tax-regimes', 
        icon: 'Scale', 
        label: { en: 'Tax Presets', es: 'Presets de Impuestos' }, 
        roles: ['admin', 'finance'] 
      },
    ]
  },

  { 
    id: 'finance', 
    route: '/backoffice/finance', 
    icon: 'BarChart3', 
    label: { en: 'Finance', es: 'Finanzas' }, 
    roles: ['admin', 'finance'],
    children: [
      { 
        id: 'overview', 
        route: '/backoffice/finance/overview', 
        icon: 'ChartColumn', 
        label: { en: 'Overview', es: 'Resumen' }, 
        roles: ['admin', 'finance'] 
      },
      { 
        id: 'dashboard', 
        route: '/backoffice/finance/dashboard', 
        icon: 'TrendingUp', 
        label: { en: 'Dashboard', es: 'Panel' }, 
        roles: ['admin', 'finance'] 
      },
    ]
  },

  { 
    id: 'commissions', 
    route: '/backoffice/finance', 
    icon: 'Coins', 
    label: { en: 'Commissions', es: 'Comisiones' }, 
    roles: ['admin', 'finance', 'sales'],
    children: [
      { 
        id: 'commissions-list', 
        route: '/backoffice/finance/commissions', 
        icon: 'DollarSign', 
        label: { en: 'Commissions', es: 'Comisiones' }, 
        roles: ['admin', 'finance', 'sales'] 
      },
      { 
        id: 'commissions-report', 
        route: '/backoffice/finance/commissions-report', 
        icon: 'FileBarChart', 
        label: { en: 'Commissions Report', es: 'Reporte de Comisiones' }, 
        roles: ['admin', 'finance', 'sales'] 
      },
    ]
  },

  { 
    id: 'insights', 
    route: '/backoffice/insights', 
    icon: 'Brain', 
    label: { en: 'Insights', es: 'Analíticos' }, 
    roles: ['admin', 'finance', 'sales'] 
  },

  { 
    id: 'admin-settings',
    route: '/admin/settings', 
    icon: 'Settings', 
    label: { en: 'Admin Settings', es: 'Ajustes' }, 
    roles: ['admin'],
    children: [
      { 
        id: 'users', 
        route: '/admin/settings/users', 
        icon: 'UserCog', 
        label: { en: 'Users & Roles', es: 'Usuarios & Roles' }, 
        roles: ['admin'] 
      },
    ]
  },
];

// Helper function to filter nav items by user role
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
