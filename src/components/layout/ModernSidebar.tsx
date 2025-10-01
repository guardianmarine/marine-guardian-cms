import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  User, 
  LogOut, 
  Sun, 
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavItem, filterNavByRole, Role } from '@/nav/config';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

interface ModernSidebarProps {
  items: NavItem[];
  userRole: Role;
  getBadge?: (item: NavItem) => number | null;
}

export function ModernSidebar({ items, userRole, getBadge }: ModernSidebarProps) {
  const { i18n, t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locale = (i18n.language === 'es' ? 'es' : 'en') as 'en' | 'es';
  
  // Collapse state
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('gm:sb:collapsed');
    return saved === 'true';
  });

  // Expanded groups state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('gm:sb:expanded');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Flyout state for collapsed sidebar
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);

  // Sidebar-only theme state
  const [sidebarTheme, setSidebarTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('gm:sb:sidebarTheme') as any) || 'dark';
  });

  // Filter items by role
  const visibleItems = filterNavByRole(items, userRole);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem('gm:sb:collapsed', String(collapsed));
  }, [collapsed]);

  // Save expanded groups
  useEffect(() => {
    localStorage.setItem('gm:sb:expanded', JSON.stringify([...expandedGroups]));
  }, [expandedGroups]);

  // Auto-expand group containing current route
  useEffect(() => {
    if (!collapsed) {
      visibleItems.forEach(item => {
        if (item.children && item.children.some(child => 
          location.pathname.startsWith(child.route)
        )) {
          setExpandedGroups(prev => new Set([...prev, item.id]));
        }
      });
    }
  }, [location.pathname, collapsed]);

  const toggleCollapse = () => setCollapsed(!collapsed);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isActive = (route: string) => {
    if (route === '/admin') {
      return location.pathname === '/admin';
    }
    if (route === '/backoffice') {
      return location.pathname === '/backoffice';
    }
    return location.pathname.startsWith(route);
  };

  const getIcon = (iconName: string, className?: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className={cn('h-5 w-5', className)} /> : null;
  };

  const handleSidebarThemeToggle = () => {
    const newTheme = sidebarTheme === 'dark' ? 'light' : 'dark';
    setSidebarTheme(newTheme);
    localStorage.setItem('gm:sb:sidebarTheme', newTheme);
  };


  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.has(item.id);
    const active = isActive(item.route);
    const badgeCount = getBadge?.(item) ?? null;

    if (hasChildren) {
      return (
        <div key={item.id}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => collapsed ? setFlyoutGroup(item.id) : toggleGroup(item.id)}
                  onMouseEnter={() => collapsed && setFlyoutGroup(item.id)}
                  onMouseLeave={() => collapsed && setFlyoutGroup(null)}
                  className={cn(
                    'group relative flex items-center w-full rounded-xl transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sb-bg))]',
                    collapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5',
                    active
                      ? 'bg-[hsl(var(--sb-bg-hover))] text-white border-l-2 border-[hsl(var(--sb-accent))]'
                      : 'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))] hover:text-white'
                  )}
                  aria-expanded={!collapsed && isExpanded}
                >
                  <div className="flex items-center gap-3">
                    {getIcon(item.icon, cn(
                      'transition-colors',
                      active ? 'text-white' : 'text-[hsl(var(--sb-text))] group-hover:text-white'
                    ))}
                    {!collapsed && (
                      <>
                        <span className="font-medium text-sm">{item.label[locale]}</span>
                        {badgeCount && badgeCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-semibold rounded-full bg-[hsl(var(--sb-accent))] text-white">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  )}
                  
                  {/* Flyout for collapsed state */}
                  {collapsed && flyoutGroup === item.id && (
                    <div 
                      className="absolute left-full ml-2 top-0 z-50 min-w-[200px] rounded-xl border border-[hsla(var(--sb-border))] bg-[hsl(var(--sb-bg))] shadow-lg p-2 animate-scale-in"
                      onMouseEnter={() => setFlyoutGroup(item.id)}
                      onMouseLeave={() => setFlyoutGroup(null)}
                    >
                      <div className="px-2 py-1.5 text-xs font-semibold text-[hsl(var(--sb-text))] opacity-60 mb-1">
                        {item.label[locale]}
                      </div>
                      {item.children?.map(child => (
                        <Link
                          key={child.id}
                          to={child.route}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive(child.route)
                              ? 'bg-[hsl(var(--sb-bg-hover))] text-white'
                              : 'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))] hover:text-white'
                          )}
                        >
                          {getIcon(child.icon, 'h-4 w-4')}
                          <span>{child.label[locale]}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{item.label[locale]}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
          
          {!collapsed && isExpanded && (
            <div className="ml-8 mt-1 space-y-0.5 animate-fade-in">
              {item.children?.map(child => (
                <Link
                  key={child.id}
                  to={child.route}
                  className={cn(
                    'block px-3 py-2 rounded-lg text-sm transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sb-bg))]',
                    isActive(child.route)
                      ? 'bg-[hsl(var(--sb-bg-hover))] text-white font-medium border-l-2 border-[hsl(var(--sb-accent))]'
                      : 'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))] hover:text-white'
                  )}
                  aria-current={isActive(child.route) ? 'page' : undefined}
                >
                  {child.label[locale]}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <TooltipProvider key={item.id} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={item.route}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sb-bg))]',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                active
                  ? 'bg-[hsl(var(--sb-bg-hover))] text-white font-medium border-l-2 border-[hsl(var(--sb-accent))]'
                  : 'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))] hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {getIcon(item.icon, cn(
                'transition-colors',
                active ? 'text-white' : 'text-[hsl(var(--sb-text))] group-hover:text-white'
              ))}
              {!collapsed && <span className="font-medium text-sm">{item.label[locale]}</span>}
              {!collapsed && badgeCount && badgeCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-semibold rounded-full bg-[hsl(var(--sb-accent))] text-white">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">{item.label[locale]}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-[hsl(var(--sb-bg))] text-[hsl(var(--sb-text))] border-r border-[hsla(var(--sb-border))] transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-64',
        sidebarTheme === 'dark' ? 'sidebar-dark' : 'sidebar-light'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Top: Logo + Collapse Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[hsla(var(--sb-border))]">
          {!collapsed ? (
            <img src={logo} alt="Guardian Marine" className="h-8" />
          ) : (
            <div className="w-full flex justify-center">
              <div className="h-8 w-8 rounded-lg bg-[hsl(var(--sb-accent))] flex items-center justify-center text-white font-bold text-sm">
                GM
              </div>
            </div>
          )}
          {!collapsed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleCollapse}
                    className="h-8 w-8 text-[hsl(var(--sb-text))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))]"
                    aria-label={t('sidebar.collapse', 'Collapse')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{locale === 'es' ? 'Colapsar' : 'Collapse'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="px-2 py-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleCollapse}
                    className="w-full h-10 text-[hsl(var(--sb-text))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))]"
                    aria-label={t('sidebar.expand', 'Expand')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{locale === 'es' ? 'Expandir' : 'Expand'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {visibleItems.map(item => renderNavItem(item))}
        </nav>

        {/* Bottom Rail: Compact Footer */}
        <div className="border-t border-[hsla(var(--sb-border))] px-3 py-2 space-y-1.5">
          {/* Sidebar Theme Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? 'icon' : 'sm'}
                  onClick={handleSidebarThemeToggle}
                  className={cn(
                    'text-[hsl(var(--sb-text))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))]',
                    collapsed ? 'w-full' : 'w-full justify-start'
                  )}
                  aria-label={locale === 'es' ? 'Tema del sidebar' : 'Sidebar theme'}
                >
                  {sidebarTheme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {!collapsed && <span className="ml-2 text-xs">{locale === 'es' ? 'Tema' : 'Theme'}</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{locale === 'es' ? 'Tema del sidebar' : 'Sidebar theme'}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                className={cn(
                  'text-[hsl(var(--sb-text))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))]',
                  collapsed ? 'w-full' : 'w-full justify-start'
                )}
              >
                <div className="h-8 w-8 rounded-full bg-[hsl(var(--sb-accent))] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {getUserInitials()}
                </div>
                {!collapsed && (
                  <div className="ml-2 text-left flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{user?.name || 'User'}</div>
                    <div className="text-[10px] text-[hsl(var(--sb-text))] capitalize truncate">{user?.role || 'viewer'}</div>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-48">
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/backoffice/profile')}>
                <User className="mr-2 h-4 w-4" />
                {locale === 'es' ? 'Perfil' : 'Profile'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                {locale === 'es' ? 'Cerrar sesión' : 'Logout'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
