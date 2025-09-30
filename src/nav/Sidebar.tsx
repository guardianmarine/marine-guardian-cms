import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavItem, filterNavByRole, Role } from './config';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  items: NavItem[];
  userRole: Role;
  onItemClick?: () => void;
}

export function Sidebar({ items, userRole, onItemClick }: SidebarProps) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const locale = i18n.language as 'en' | 'es';
  
  // Filter items by role
  const visibleItems = filterNavByRole(items, userRole);
  
  // Load expanded state from localStorage
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('nav-expanded-groups');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    // By default, expand groups that contain the current route
    const initialExpanded = new Set<string>();
    visibleItems.forEach(item => {
      if (item.children && item.children.some(child => 
        location.pathname.startsWith(child.route)
      )) {
        initialExpanded.add(item.id);
      }
    });
    return initialExpanded;
  });

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('nav-expanded-groups', JSON.stringify([...expandedGroups]));
  }, [expandedGroups]);

  // Auto-expand group containing current route
  useEffect(() => {
    visibleItems.forEach(item => {
      if (item.children && item.children.some(child => 
        location.pathname.startsWith(child.route)
      )) {
        setExpandedGroups(prev => new Set([...prev, item.id]));
      }
    });
  }, [location.pathname]);

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
    if (route === '/backoffice') {
      return location.pathname === '/backoffice';
    }
    return location.pathname.startsWith(route);
  };

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.has(item.id);
    const active = isActive(item.route);

    if (hasChildren) {
      return (
        <div key={item.id} className={level === 0 ? 'pt-2' : ''}>
          <button
            onClick={() => toggleGroup(item.id)}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <div className="flex items-center space-x-3">
              {getIcon(item.icon)}
              <span className="font-medium">{item.label[locale]}</span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
          {isExpanded && (
            <div className="ml-8 mt-1 space-y-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        to={item.route}
        onClick={onItemClick}
        className={cn(
          level === 0 
            ? 'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors'
            : 'block px-3 py-2 rounded-lg text-sm transition-colors',
          active
            ? level === 0 
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/10 text-primary font-medium'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        {level === 0 && getIcon(item.icon)}
        <span className={level === 0 ? 'font-medium' : ''}>{item.label[locale]}</span>
      </Link>
    );
  };

  return (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {visibleItems.map(item => renderNavItem(item))}
    </nav>
  );
}
