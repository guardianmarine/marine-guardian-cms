import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Bell,
  Phone,
  Mail,
  MessageSquare,
  Users,
  CheckSquare,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCRMStore } from '@/services/crmStore';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, startOfDay, isToday } from 'date-fns';
import { ActivityKind } from '@/types';

export function NotificationCenter() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activities, opportunities, leads, accounts } = useCRMStore();

  // Get user's activities that are incomplete and have due dates
  const userActivities = activities.filter(
    (a) => a.owner_user_id === user?.id && !a.completed_at && a.due_at
  );

  // Split into due today and overdue
  const dueToday = userActivities.filter((a) => isToday(new Date(a.due_at!)));
  const overdue = userActivities.filter(
    (a) => isPast(startOfDay(new Date(a.due_at!))) && !isToday(new Date(a.due_at!))
  );

  const totalCount = dueToday.length + overdue.length;

  const getKindIcon = (kind: ActivityKind) => {
    switch (kind) {
      case 'call':
        return <Phone className="h-3 w-3" />;
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'meeting':
        return <Users className="h-3 w-3" />;
      case 'task':
        return <CheckSquare className="h-3 w-3" />;
      case 'whatsapp':
        return <MessageSquare className="h-3 w-3" />;
      default:
        return <StickyNote className="h-3 w-3" />;
    }
  };

  const getParentLabel = (activity: typeof activities[0]) => {
    if (activity.parent_type === 'opportunity') {
      const opp = opportunities.find((o) => o.id === activity.parent_id);
      return { label: opp?.name || 'Opportunity', route: `/backoffice/crm/opportunities/${activity.parent_id}` };
    }
    if (activity.parent_type === 'lead') {
      const lead = leads.find((l) => l.id === activity.parent_id);
      const account = lead?.account_id ? accounts.find((a) => a.id === lead.account_id) : null;
      return { label: account?.name || 'Lead', route: `/backoffice/crm/leads/${activity.parent_id}` };
    }
    if (activity.parent_type === 'account') {
      const account = accounts.find((a) => a.id === activity.parent_id);
      return { label: account?.name || 'Account', route: `/backoffice/crm/accounts/${activity.parent_id}` };
    }
    return { label: activity.parent_type, route: '#' };
  };

  const renderActivityItem = (activity: typeof activities[0]) => {
    const dueDate = new Date(activity.due_at!);
    const parent = getParentLabel(activity);

    return (
      <Link
        key={activity.id}
        to={parent.route}
        target="_blank"
        className="block p-3 hover:bg-accent transition-colors duration-150 border-b last:border-b-0"
      >
        <div className="flex items-start gap-2">
          <div className="mt-1">{getKindIcon(activity.kind)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{activity.subject}</p>
            <p className="text-xs text-muted-foreground truncate">{parent.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(dueDate, 'h:mm a')}
            </p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative transition-all duration-200 hover:shadow-md hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <Badge
              variant={overdue.length > 0 ? 'destructive' : 'default'}
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 bg-card shadow-lg animate-scale-in p-0">
        <DropdownMenuLabel className="p-4 pb-2">
          {t('dashboard.notifications', 'Notifications')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        
        {totalCount === 0 ? (
          <div className="p-8 text-center">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm font-medium">
              {t('dashboard.allCaughtUp', "You're all caught up")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.noTasksDue', 'No tasks due today or overdue')}
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {overdue.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-destructive/10">
                  <p className="text-xs font-semibold text-destructive uppercase">
                    {t('dashboard.overdue', 'Overdue')} ({overdue.length})
                  </p>
                </div>
                {overdue.map(renderActivityItem)}
              </div>
            )}

            {dueToday.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-primary/10">
                  <p className="text-xs font-semibold text-primary uppercase">
                    {t('dashboard.dueToday', 'Due Today')} ({dueToday.length})
                  </p>
                </div>
                {dueToday.map(renderActivityItem)}
              </div>
            )}
          </div>
        )}

        <Separator className="m-0" />
        <div className="p-2">
          <Link to="/backoffice/crm/tasks">
            <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
              {t('dashboard.viewAllTasks', 'View all my tasks')}
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
