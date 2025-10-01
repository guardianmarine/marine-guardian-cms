import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS, NavItem } from '@/nav/config';
import { ModernSidebar } from '@/components/layout/ModernSidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { Topbar } from '@/nav/Topbar';
import { Breadcrumbs } from '@/nav/Breadcrumbs';
import { useInboundRequestsCount } from '@/hooks/useInboundRequestsCount';

interface BackofficeLayoutProps {
  children: ReactNode;
}

export function BackofficeLayout({ children }: BackofficeLayoutProps) {
  const { user } = useAuth();
  const inboundRequestsCount = useInboundRequestsCount();

  const getBadge = (item: NavItem): number | null => {
    if (item.id === 'inbound-requests') {
      return inboundRequestsCount;
    }
    return null;
  };

  return (
    <>
      <CommandPalette />
      <div className="flex h-screen bg-muted/30">
        {/* Modern Sidebar */}
        <ModernSidebar
          items={NAV_ITEMS}
          userRole={user?.role || 'viewer'}
          getBadge={getBadge}
        />

        {/* Main Content - with left padding for sidebar */}
        <div className="flex-1 flex flex-col overflow-hidden ml-16 lg:ml-64 transition-all duration-300">
          {/* Header */}
          <Topbar onMenuClick={() => {}} />

          {/* Breadcrumbs */}
          <Breadcrumbs items={NAV_ITEMS} />

          {/* Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
