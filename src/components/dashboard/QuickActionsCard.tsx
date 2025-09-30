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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {t('dashboard.quickActions', 'Quick Actions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.route}
              variant="outline"
              onClick={() => navigate(action.route)}
              className="h-auto flex-col gap-2 py-4 items-start text-left transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <Icon className="h-5 w-5" />
              <div>
                <div className="font-semibold text-xs mb-1">{action.label}</div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  {action.description}
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

