import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useCRMStore } from '@/services/crmStore';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, startOfDay, isToday } from 'date-fns';

export function NotificationCenter() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activities, completeTask } = useCRMStore();

  // Get user's tasks that are due or overdue
  const userTasks = activities.filter(
    (a) =>
      a.kind === 'task' &&
      a.owner_user_id === user?.id &&
      !a.completed_at &&
      a.due_at &&
      (isPast(startOfDay(new Date(a.due_at))) || isToday(new Date(a.due_at)))
  );

  const overdueCount = userTasks.filter(
    (t) => isPast(startOfDay(new Date(t.due_at!))) && !isToday(new Date(t.due_at!))
  ).length;

  const handleTaskClick = (taskId: string) => {
    completeTask(taskId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative transition-all duration-200 hover:shadow-md hover:scale-105"
        >
          <Bell className="h-4 w-4" />
          {userTasks.length > 0 && (
            <Badge
              variant={overdueCount > 0 ? 'destructive' : 'default'}
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {userTasks.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-card shadow-lg animate-scale-in">
        <DropdownMenuLabel>
          {t('dashboard.notifications', 'Notifications')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userTasks.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t('dashboard.noNotifications', 'No notifications at this time')}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {userTasks.map((task) => {
              const dueDate = new Date(task.due_at!);
              const isOverdue = isPast(startOfDay(dueDate)) && !isToday(dueDate);

              return (
                <DropdownMenuItem
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className="cursor-pointer p-3 flex-col items-start gap-1"
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <p className="font-semibold text-sm">{task.subject}</p>
                    <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                      {isOverdue
                        ? t('dashboard.overdue', 'Overdue')
                        : t('dashboard.today', 'Today')}
                    </Badge>
                  </div>
                  {task.body && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.due', 'Due')}: {format(dueDate, 'MMM d, h:mm a')}
                  </p>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
