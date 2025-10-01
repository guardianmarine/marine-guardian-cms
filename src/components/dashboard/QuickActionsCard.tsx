import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Plus, Users, FileText, Package, Image, Inbox } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function QuickActionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const actions = [
    {
      label: t('dashboard.newUnit', 'New Unit'),
      description: t('dashboard.newUnitDesc', 'Add a unit to inventory'),
      icon: Plus,
      route: '/backoffice/inventory/new',
      roles: ['admin', 'inventory'],
    },
    {
      label: t('dashboard.newLead', 'New Lead'),
      description: t('dashboard.newLeadDesc', 'Create a new sales lead'),
      icon: Users,
      route: '/backoffice/crm/leads',
      roles: ['admin', 'sales'],
    },
    {
      label: t('dashboard.newDeal', 'New Deal'),
      description: t('dashboard.newDealDesc', 'Start a new deal'),
      icon: FileText,
      route: '/backoffice/deals/new',
      roles: ['admin', 'sales'],
    },
    {
      label: t('dashboard.mediaLibrary', 'Media Library'),
      description: t('dashboard.mediaLibraryDesc', 'Manage images and media'),
      icon: Image,
      route: '/backoffice/media',
      roles: ['admin', 'inventory'],
    },
    {
      label: t('dashboard.buyerRequests', 'Buyer Requests'),
      description: t('dashboard.buyerRequestsDesc', 'View request submissions'),
      icon: Inbox,
      route: '/backoffice/buyer-requests',
      roles: ['admin', 'inventory', 'sales'],
    },
    {
      label: t('dashboard.viewInventory', 'View Inventory'),
      description: t('dashboard.viewInventoryDesc', 'Browse all units'),
      icon: Package,
      route: '/backoffice/inventory',
      roles: ['admin', 'inventory', 'sales', 'finance', 'viewer'],
    },
  ];

  const visibleActions = actions.filter((action) =>
    user?.role ? action.roles.includes(user.role) : false
  );

  return (
    <Card className="rounded-2xl border-slate-200/70 shadow-sm" aria-labelledby="quick-actions-title">
      <CardHeader className="pb-3">
        <CardTitle id="quick-actions-title" className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          {t('dashboard.quickActions', 'Quick Actions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 px-5 pb-5">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.route}
              onClick={() => navigate(action.route)}
              className="group relative p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md hover:border-primary/20 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 text-left"
              aria-label={action.label}
            >
              <div className="flex flex-col gap-2">
                <Icon className="h-6 w-6 text-primary" />
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 mb-0.5">
                    {action.label}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                    {action.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

