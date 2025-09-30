import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Plus, Users, FileText, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function QuickActionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const actions = [
    {
      label: t('dashboard.newUnit', 'New Unit'),
      icon: Plus,
      route: '/backoffice/inventory/new',
      roles: ['admin', 'inventory'],
    },
    {
      label: t('dashboard.newLead', 'New Lead'),
      icon: Users,
      route: '/backoffice/crm/leads',
      roles: ['admin', 'sales'],
    },
    {
      label: t('dashboard.newDeal', 'New Deal'),
      icon: FileText,
      route: '/backoffice/deals/new',
      roles: ['admin', 'sales'],
    },
    {
      label: t('dashboard.viewInventory', 'View Inventory'),
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
              className="h-auto flex-col gap-2 py-4 transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
