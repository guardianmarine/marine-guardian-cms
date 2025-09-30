import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { useCRMStore } from '@/services/crmStore';
import { Badge } from '@/components/ui/badge';

export function CompanyCalendarCard() {
  const { t } = useTranslation();
  const { activities } = useCRMStore();

  // Get all activities with due dates, sorted by due date
  const upcomingActivities = activities
    .filter((a) => a.due_at && !a.completed_at)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 5);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('dashboard.companyCalendar', 'Company Calendar')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('dashboard.noUpcomingEvents', 'No upcoming events or tasks.')}
          </p>
        ) : (
          upcomingActivities.map((activity) => {
            const dueDate = new Date(activity.due_at!);
            const overdue = isOverdue(dueDate);

            return (
              <div
                key={activity.id}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  overdue ? 'border-destructive bg-destructive/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm flex-1">{activity.subject}</h4>
                  <Badge variant={overdue ? 'destructive' : 'secondary'} className="text-xs">
                    {getDateLabel(dueDate)}
                  </Badge>
                </div>
                {activity.body && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {activity.body}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(dueDate, 'h:mm a')}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
