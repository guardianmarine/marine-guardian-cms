import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react';
import { ChevronDown, User, LogOut, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavItem, filterNavByRole, filterNavByPermissions, Role } from '@/nav/config';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import gmLogoDark from '@/assets/brand/gm-logo-dark.png';
import gmLogoLight from '@/assets/brand/gm-logo-light.png';
import gmMarkDark from '@/assets/brand/gm-mark-dark.png';
import gmMarkLight from '@/assets/brand/gm-mark-light.png';

interface ModernSidebarProps {
  items: NavItem[];
  userRole: Role;
  getBadge?: (item: NavItem) => number | null;
}

export function ModernSidebar({ items, userRole, getBadge }: ModernSidebarProps) {
  const { i18n, t } = useTranslation();
  const { user, logout } = useAuth();
  const { canView, isAdmin, loading: permissionsLoading } = useModuleAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const locale = (i18n.language === 'es' ? 'es' : 'en') as 'en' | 'es';
  
  // Hover state (always collapsed by default, expands on hover)
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  
  // Timers for hover intent
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  
  // Check if device has fine pointer (desktop with mouse)
  const allowHover = useMemo(
    () => window.matchMedia?.('(pointer: fine)').matches ?? true,
    []
  );

  // Sidebar-only theme state
  const [sidebarTheme, setSidebarTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('gm:sb:sidebarTheme') as any) || 'dark';
  });

  // Expanded groups state (for when expanded)
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

  // Filter items by granular permissions (with fallback to role-based during loading)
  const visibleItems = useMemo(() => {
    // If permissions are still loading, use legacy role-based filter
    if (permissionsLoading) {
      return filterNavByRole(items, userRole);
    }
    // Use granular permissions
    return filterNavByPermissions(items, canView, isAdmin);
  }, [items, userRole, canView, isAdmin, permissionsLoading]);

  // Cleanup legacy localStorage
  useEffect(() => {
    localStorage.removeItem('gm:sb:mode');
    localStorage.removeItem('gm:sb:collapsed');
  }, []);

  // Save expanded groups
  useEffect(() => {
    localStorage.setItem('gm:sb:expanded', JSON.stringify([...expandedGroups]));
  }, [expandedGroups]);

  // Auto-expand group containing current route
  useEffect(() => {
    if (isHoverOpen) {
      visibleItems.forEach(item => {
        if (item.children && item.children.some(child => 
          location.pathname.startsWith(child.route)
        )) {
          setExpandedGroups(prev => new Set([...prev, item.id]));
        }
      });
    }
  }, [location.pathname, isHoverOpen]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

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

  const getBrandAsset = () => {
    if (!isHoverOpen && allowHover) {
      return sidebarTheme === 'dark' ? gmMarkDark : gmMarkLight;
    }
    return sidebarTheme === 'dark' ? gmLogoDark : gmLogoLight;
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
    const collapsed = !isHoverOpen && allowHover;

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleGroup(item.id)}
            className={cn(
              'group relative flex items-center w-full rounded-xl transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-active-border))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sb-bg))]',
              collapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5',
              active
                ? 'bg-[hsl(var(--sb-active-bg))] text-[hsl(var(--sb-active-text))] border-l-2 border-[hsl(var(--sb-active-border))]'
                : 'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))]'
            )}
            aria-expanded={!collapsed && isExpanded}
            aria-label={item.label[locale]}
          >
            <div className="flex items-center gap-3">
              {getIcon(item.icon, cn(
                'transition-colors',
                active ? 'text-[hsl(var(--sb-active-text))]' : 'text-[hsl(var(--sb-icon))] group-hover:text-[hsl(var(--sb-active-border))]'
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
          </button>
          
          {!collapsed && isExpanded && (
            <div className="ml-8 mt-1 space-y-0.5 animate-fade-in">
              {item.children?.map(child => (
                <Link
                  key={child.id}
                  to={child.route}
                  className={cn(
                    'block px-3 py-2 rounded-lg text-sm transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-active-border))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sb-bg))]',
                    isActive(child.route)
                      ? 'bg-[hsl(var(--sb-active-bg))] text-[hsl(var(--sb-active-text))] font-medium border-l-2 border-[hsl(var(--sb-active-border))]'
                      : 'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))]'
                  )}
                  aria-current={isActive(child.route) ? 'page' : undefined}
                  aria-label={child.label[locale]}
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
      <Link
        key={item.id}
        to={item.route}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-active-border))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sb-bg))]',
          collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
          active
            ? 'bg-[hsl(var(--sb-active-bg))] text-[hsl(var(--sb-active-text))] font-medium border-l-2 border-[hsl(var(--sb-active-border))]'
            : 'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))]'
        )}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label[locale]}
      >
        {getIcon(item.icon, cn(
          'transition-colors',
          active ? 'text-[hsl(var(--sb-active-text))]' : 'text-[hsl(var(--sb-icon))] group-hover:text-[hsl(var(--sb-active-border))]'
        ))}
        {!collapsed && <span className="font-medium text-sm">{item.label[locale]}</span>}
        {!collapsed && badgeCount && badgeCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-semibold rounded-full bg-[hsl(var(--sb-accent))] text-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
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

  const collapsed = !isHoverOpen && allowHover;

  return (
    <aside
      onMouseEnter={() => {
        if (!allowHover) return;
        if (closeTimer.current) {
          clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
        if (!isHoverOpen) {
          openTimer.current = window.setTimeout(() => setIsHoverOpen(true), 80);
        }
      }}
      onMouseLeave={() => {
        if (!allowHover) return;
        if (openTimer.current) {
          clearTimeout(openTimer.current);
          openTimer.current = null;
        }
        closeTimer.current = window.setTimeout(() => setIsHoverOpen(false), 120);
      }}
      onFocusCapture={() => {
        if (openTimer.current) {
          clearTimeout(openTimer.current);
          openTimer.current = null;
        }
        setIsHoverOpen(true);
      }}
      onBlurCapture={(e) => {
        if (allowHover) return;
        const stillInside = (e.currentTarget as HTMLElement).contains(document.activeElement);
        if (!stillInside) setIsHoverOpen(false);
      }}
      className={cn(
        'fixed left-0 top-0 h-screen bg-[hsl(var(--sb-bg))] text-[hsl(var(--sb-text))] border-r border-[hsla(var(--sb-border))] transition-[width] duration-200 ease-out z-50',
        allowHover ? (collapsed ? 'w-16' : 'w-64') : 'w-64',
        sidebarTheme === 'dark' ? 'sidebar-dark' : 'sidebar-light'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Top: Logo */}
        <div className="h-16 flex items-center justify-center px-3 border-b border-[hsla(var(--sb-border))]">
          <img 
            src={getBrandAsset()} 
            alt="Guardian Marine" 
            className={cn(
              collapsed ? 'h-8 w-8' : 'h-10 md:h-11 w-auto object-contain',
            )} 
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {visibleItems.map(item => renderNavItem(item))}
        </nav>

        {/* Bottom Rail: Compact Footer */}
        <div className="border-t border-[hsla(var(--sb-border))] bg-[hsl(var(--sb-bg))] px-3 py-2 space-y-1.5">
          {/* Sidebar Theme Toggle */}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={handleSidebarThemeToggle}
            className={cn(
              'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))]',
              collapsed ? 'w-full' : 'w-full justify-start'
            )}
            aria-label={locale === 'es' ? 'Tema del sidebar' : 'Sidebar theme'}
          >
            {sidebarTheme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span className="ml-2 text-xs">{locale === 'es' ? 'Tema' : 'Theme'}</span>}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                className={cn(
                  'text-[hsl(var(--sb-text))] hover:bg-[hsl(var(--sb-bg-hover))]',
                  collapsed ? 'w-full' : 'w-full justify-start'
                )}
              >
                <div className="h-8 w-8 rounded-full bg-[hsl(var(--sb-accent))] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {getUserInitials()}
                </div>
                {!collapsed && (
                  <div className="ml-2 text-left flex-1 min-w-0">
                    <div className="text-xs font-medium text-[hsl(var(--sb-active-text))] truncate">{user?.name || 'User'}</div>
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
