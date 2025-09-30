import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useCRMStore } from '@/services/crmStore';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isToday, isWithinInterval, addDays } from 'date-fns';

export default function MyTasks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getMyTasks, completeTask } = useCRMStore();

  const tasks = user ? getMyTasks(user.id) : [];

  const overdueTasks = tasks.filter((task) => task.due_at && isPast(new Date(task.due_at)));
  const todayTasks = tasks.filter((task) => task.due_at && isToday(new Date(task.due_at)));
  const upcomingTasks = tasks.filter(
    (task) =>
      task.due_at &&
      isWithinInterval(new Date(task.due_at), {
        start: addDays(new Date(), 1),
        end: addDays(new Date(), 7),
      })
  );
  const noDateTasks = tasks.filter((task) => !task.due_at);

  const TaskSection = ({
    title,
    tasks,
    icon: Icon,
    color,
  }: {
    title: string;
    tasks: any[];
    icon: any;
    color: string;
  }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <CardTitle>
            {title} ({tasks.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox
                checked={!!task.completed_at}
                onCheckedChange={() => completeTask(task.id)}
              />
              <div className="flex-1">
                <p className="font-medium">{task.subject}</p>
                {task.body && <p className="text-sm text-muted-foreground mt-1">{task.body}</p>}
                {task.due_at && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(task.due_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">{t('crm.myTasks')}</h2>
          <Badge variant="outline" className="text-lg">
            {tasks.length} {t('crm.activityTask')}s
          </Badge>
        </div>

        <div className="space-y-6">
          {overdueTasks.length > 0 && (
            <TaskSection
              title={t('crm.overdue')}
              tasks={overdueTasks}
              icon={AlertCircle}
              color="text-red-500"
            />
          )}

          <TaskSection
            title={t('crm.today')}
            tasks={todayTasks}
            icon={Calendar}
            color="text-blue-500"
          />

          <TaskSection
            title={t('crm.next7Days')}
            tasks={upcomingTasks}
            icon={Calendar}
            color="text-green-500"
          />

          {noDateTasks.length > 0 && (
            <TaskSection
              title="No Due Date"
              tasks={noDateTasks}
              icon={ClipboardList}
              color="text-gray-500"
            />
          )}
        </div>

        {tasks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tasks assigned to you.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </BackofficeLayout>
  );
}
