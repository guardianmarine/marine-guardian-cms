import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { NAV_ITEMS } from '@/nav/config';
import { Sidebar } from '@/nav/Sidebar';
import { Topbar } from '@/nav/Topbar';
import { Breadcrumbs } from '@/nav/Breadcrumbs';
import logo from '@/assets/logo.png';

interface BackofficeLayoutProps {
  children: ReactNode;
}

export function BackofficeLayout({ children }: BackofficeLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <Sidebar
            items={NAV_ITEMS}
            userRole={user?.role || 'viewer'}
            onItemClick={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Breadcrumbs */}
        <Breadcrumbs items={NAV_ITEMS} />

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
