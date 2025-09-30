import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Image, 
  Home, 
  Package, 
  LogOut,
  Menu,
  X,
  Users,
  ShoppingCart,
  ChevronDown,
  TrendingUp,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

interface BackofficeLayoutProps {
  children: ReactNode;
}

export function BackofficeLayout({ children }: BackofficeLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [purchasingOpen, setPurchasingOpen] = useState(
    location.pathname.startsWith('/backoffice/purchasing')
  );
  const [crmOpen, setCrmOpen] = useState(
    location.pathname.startsWith('/backoffice/crm')
  );
  const [dealsOpen, setDealsOpen] = useState(
    location.pathname.startsWith('/backoffice/deals') || location.pathname.startsWith('/backoffice/finance')
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/backoffice', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/backoffice/content', label: 'Content', icon: Home },
    { path: '/backoffice/media', label: 'Media Library', icon: Image },
    { path: '/backoffice/inventory', label: 'Inventory', icon: Package },
    { path: '/backoffice/buyer-requests', label: 'Buyer Requests', icon: Users },
    { path: '/backoffice/insights', label: 'Insights', icon: BarChart3, roles: ['sales', 'finance', 'admin'] },
  ];

  const purchasingItems = [
    { path: '/backoffice/purchasing/suppliers', label: 'Suppliers' },
    { path: '/backoffice/purchasing/intakes', label: 'Purchase Intakes' },
    { path: '/backoffice/purchasing/batches', label: 'Acquisition Batches' },
  ];

  const crmItems = [
    { path: '/backoffice/crm/accounts', label: 'Accounts' },
    { path: '/backoffice/crm/contacts', label: 'Contacts' },
    { path: '/backoffice/crm/leads', label: 'Leads' },
    { path: '/backoffice/crm/opportunities', label: 'Opportunities' },
    { path: '/backoffice/crm/tasks', label: 'My Tasks' },
  ];

  const dealsFinanceItems = [
    { path: '/backoffice/deals', label: 'Deals' },
    { path: '/backoffice/deals/tax-regimes', label: 'Tax Regimes' },
    { path: '/backoffice/finance/overview', label: 'Finance Overview' },
    { path: '/backoffice/finance/dashboard', label: 'Finance Dashboard' },
    { path: '/backoffice/finance/commissions', label: 'Commissions' },
    { path: '/backoffice/finance/commissions-report', label: 'Commissions Report' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path) && 
           !location.pathname.includes('/purchasing') && 
           !location.pathname.includes('/crm') &&
           !location.pathname.includes('/deals') &&
           !location.pathname.includes('/finance');
  };

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b">
            <img src={logo} alt="Guardian Marine" className="h-10" />
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              // Check role-based access
              if (item.roles && !item.roles.includes(user?.role || '')) {
                return null;
              }
              
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* Purchasing Submenu */}
            <div className="pt-2">
              <button
                onClick={() => setPurchasingOpen(!purchasingOpen)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors',
                  location.pathname.includes('/purchasing')
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-medium">Purchasing</span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    purchasingOpen && 'rotate-180'
                  )}
                />
              </button>
              {purchasingOpen && (
                <div className="ml-8 mt-1 space-y-1">
                  {purchasingItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        location.pathname === item.path
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* CRM Submenu */}
            <div className="pt-2">
              <button
                onClick={() => setCrmOpen(!crmOpen)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors',
                  location.pathname.includes('/crm')
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-medium">CRM</span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    crmOpen && 'rotate-180'
                  )}
                />
              </button>
              {crmOpen && (
                <div className="ml-8 mt-1 space-y-1">
                  {crmItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        location.pathname === item.path
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Deals & Finance Submenu */}
            <div className="pt-2">
              <button
                onClick={() => setDealsOpen(!dealsOpen)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors',
                  (location.pathname.includes('/deals') || location.pathname.includes('/finance'))
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-medium">Deals & Finance</span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    dealsOpen && 'rotate-180'
                  )}
                />
              </button>
              {dealsOpen && (
                <div className="ml-8 mt-1 space-y-1">
                  {dealsFinanceItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        location.pathname === item.path
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t">
            <div className="mb-3 px-3">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b flex items-center px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-4"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Backoffice</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
