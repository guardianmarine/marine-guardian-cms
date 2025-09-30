import { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfDay, isBefore } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityKind } from '@/types';

interface Activity {
  id: string;
  kind: ActivityKind;
  subject: string;
  due_at: string;
  completed_at: string | null;
  parent_type: 'lead' | 'opportunity' | 'account' | 'contact';
  parent_id: string;
  owner_user_id: string;
}

export function CompanyCalendarCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const in30 = new Date(Date.now() + 30 * 86400000).toISOString();
        const { data, error } = await supabase
          .from('activities')
          .select('id,kind,subject,due_at,completed_at,parent_type,parent_id,owner_user_id')
          .is('completed_at', null)
          .gte('due_at', new Date().toISOString())
          .lte('due_at', in30)
          .in('kind', ['meeting', 'task'])
          .order('due_at', { ascending: true });

        if (error) throw error;
        setActivities(data || []);
      } catch (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const filteredActivities =
    activeTab === 'mine'
      ? activities.filter((a) => a.owner_user_id === user?.id)
      : activities;

  const upcomingActivities = filteredActivities.slice(0, 10);

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

  const handleActivityClick = (activity: Activity) => {
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('dashboard.noUpcomingEvents', 'No upcoming events or tasks.')}
              </p>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('dashboard.upcoming', 'Upcoming')}
                </h4>
                {upcomingActivities.map((activity) => {
                  const dueDate = new Date(activity.due_at);
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
                        <span className="truncate capitalize">{activity.parent_type}</span>
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


