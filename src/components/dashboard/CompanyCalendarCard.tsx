import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  Users,
  CheckSquare,
  StickyNote,
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfDay, addDays, isBefore } from 'date-fns';
import { useCRMStore } from '@/services/crmStore';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityKind } from '@/types';

export function CompanyCalendarCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activities, opportunities, leads, accounts } = useCRMStore();
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');

  // Get activities for next 30 days (meetings and tasks only)
  const thirtyDaysFromNow = addDays(new Date(), 30);
  const upcomingActivities = activities
    .filter((a) => {
      if (!a.due_at || a.completed_at) return false;
      if (a.kind !== 'meeting' && a.kind !== 'task') return false;
      
      const dueDate = new Date(a.due_at);
      return isBefore(dueDate, thirtyDaysFromNow);
    })
    .filter((a) => {
      if (activeTab === 'mine') {
        return a.owner_user_id === user?.id;
      }
      return true;
    })
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 10);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) {
      return t('dashboard.today', 'Today');
    }
    if (isTomorrow(date)) {
      return t('dashboard.tomorrow', 'Tomorrow');
    }
    if (isPast(startOfDay(date))) {
      return t('dashboard.overdue', 'Overdue');
    }
    return format(date, 'MMM d');
  };

  const isOverdue = (date: Date) => isPast(startOfDay(date)) && !isToday(date);

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
      return opp?.name || 'Opportunity';
    }
    if (activity.parent_type === 'lead') {
      const lead = leads.find((l) => l.id === activity.parent_id);
      const account = lead?.account_id ? accounts.find((a) => a.id === lead.account_id) : null;
      return account?.name || 'Lead';
    }
    if (activity.parent_type === 'account') {
      const account = accounts.find((a) => a.id === activity.parent_id);
      return account?.name || 'Account';
    }
    return activity.parent_type;
  };

  const handleActivityClick = (activity: typeof activities[0]) => {
    if (activity.parent_type === 'opportunity') {
      window.open(`/backoffice/crm/opportunities/${activity.parent_id}`, '_blank');
    } else if (activity.parent_type === 'lead') {
      window.open(`/backoffice/crm/leads/${activity.parent_id}`, '_blank');
    } else if (activity.parent_type === 'account') {
      window.open(`/backoffice/crm/accounts/${activity.parent_id}`, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {t('dashboard.companyCalendar', 'Company Calendar')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'mine')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all">{t('dashboard.allCompany', 'All Company')}</TabsTrigger>
            <TabsTrigger value="mine">{t('dashboard.mySchedule', 'My Schedule')}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {upcomingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('dashboard.noUpcomingEvents', 'No upcoming events or tasks.')}
              </p>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('dashboard.upcoming', 'Upcoming')}
                </h4>
                {upcomingActivities.map((activity) => {
                  const dueDate = new Date(activity.due_at!);
                  const overdue = isOverdue(dueDate);

                  return (
                    <div
                      key={activity.id}
                      onClick={() => handleActivityClick(activity)}
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                        overdue
                          ? 'border-destructive bg-destructive/5'
                          : 'border-border bg-card hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getKindIcon(activity.kind)}
                          <h4 className="font-semibold text-sm truncate">{activity.subject}</h4>
                        </div>
                        <Badge
                          variant={overdue ? 'destructive' : 'secondary'}
                          className="text-xs shrink-0"
                        >
                          {getDateLabel(dueDate)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(dueDate, 'h:mm a')}</span>
                        </div>
                        <span className="truncate">{getParentLabel(activity)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

