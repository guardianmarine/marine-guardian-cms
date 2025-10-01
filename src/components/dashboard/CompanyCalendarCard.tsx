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

  const upcomingActivities = filteredActivities.slice(0, 5);

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
    <Card className="rounded-2xl border-slate-200/70 shadow-sm" aria-labelledby="calendar-title">
      <CardHeader className="pb-3">
        <CardTitle id="calendar-title" className="flex items-center gap-2 text-lg">
          <CalendarIcon className="h-5 w-5 text-primary" />
          {t('dashboard.companyCalendar', 'Company Calendar')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'mine')}>
          <TabsList className="grid w-full grid-cols-2 mb-3 h-9">
            <TabsTrigger value="all" className="text-xs">{t('dashboard.allCompany', 'All Company')}</TabsTrigger>
            <TabsTrigger value="mine" className="text-xs">{t('dashboard.mySchedule', 'My Schedule')}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : upcomingActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CalendarIcon className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('dashboard.noUpcomingEvents', 'No upcoming events or tasks.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {upcomingActivities.map((activity) => {
                  const dueDate = new Date(activity.due_at);
                  const overdue = isOverdue(dueDate);

                  return (
                    <div
                      key={activity.id}
                      onClick={() => handleActivityClick(activity)}
                      className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
                        overdue
                          ? 'border-destructive/50 bg-destructive/5'
                          : 'border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="text-primary">{getKindIcon(activity.kind)}</div>
                          <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                            {activity.subject}
                          </h4>
                        </div>
                        <Badge
                          variant={overdue ? 'destructive' : 'secondary'}
                          className="text-xs shrink-0"
                        >
                          {getDateLabel(dueDate)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 ml-5">
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


