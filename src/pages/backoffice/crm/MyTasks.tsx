import { useState, useEffect } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Calendar, AlertCircle, Trash2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isToday, isWithinInterval, addDays } from 'date-fns';
import { toast } from 'sonner';

type Task = {
  id: string;
  title: string;
  due_at: string | null;
  status: 'open' | 'done' | 'canceled';
  created_at: string;
  deleted_at: string | null;
  completed_at?: string | null;
};

export default function MyTasks() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'active' | 'trash' | 'all'>('active');

  useEffect(() => {
    if (user?.id) {
      loadTasks();
    }
  }, [user?.id, viewFilter]);

  const loadTasks = async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('tasks')
        .select('id, title, due_at, status, created_at, deleted_at')
        .eq('assigned_to', user.id)
        .order('due_at', { ascending: true, nullsFirst: false });

      if (viewFilter === 'active') {
        query = query.is('deleted_at', null);
      } else if (viewFilter === 'trash') {
        query = query.not('deleted_at', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al cargar tareas' : 'Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const newStatus = task?.status === 'done' ? 'open' : 'done';

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success(i18n.language === 'es' ? 'Tarea actualizada' : 'Task updated');
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al actualizar' : 'Failed to update'));
    }
  };

  const handleMoveToTrash = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success(i18n.language === 'es' ? 'Movido a papelera' : 'Moved to trash');
      await loadTasks();
    } catch (error: any) {
      console.error('Error moving to trash:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al mover' : 'Failed to move'));
    }
  };

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
      toast.success(i18n.language === 'es' ? 'Restaurado' : 'Restored');
      await loadTasks();
    } catch (error: any) {
      console.error('Error restoring:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al restaurar' : 'Failed to restore'));
    }
  };

  const activeTasks = tasks.filter(t => viewFilter === 'active' || !t.deleted_at);
  const overdueTasks = activeTasks.filter((task) => task.due_at && isPast(new Date(task.due_at)) && task.status !== 'done');
  const todayTasks = activeTasks.filter((task) => task.due_at && isToday(new Date(task.due_at)) && task.status !== 'done');
  const upcomingTasks = activeTasks.filter(
    (task) =>
      task.due_at &&
      task.status !== 'done' &&
      isWithinInterval(new Date(task.due_at), {
        start: addDays(new Date(), 1),
        end: addDays(new Date(), 7),
      })
  );
  const noDateTasks = activeTasks.filter((task) => !task.due_at && task.status !== 'done');

  const TaskSection = ({
    title,
    tasks,
    icon: Icon,
    color,
  }: {
    title: string;
    tasks: Task[];
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
                checked={task.status === 'done'}
                onCheckedChange={() => completeTask(task.id)}
              />
              <div className="flex-1">
                <p className="font-medium">{task.title}</p>
                {task.due_at && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(task.due_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
              {viewFilter === 'trash' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => handleRestore(task.id, e)}
                  title={i18n.language === 'es' ? 'Restaurar' : 'Restore'}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => handleMoveToTrash(task.id, e)}
                  title={i18n.language === 'es' ? 'Mover a Papelera' : 'Move to Trash'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-6">{t('crm.myTasks')}</h2>
          <p className="text-muted-foreground">{i18n.language === 'es' ? 'Cargando...' : 'Loading...'}</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">{t('crm.myTasks')}</h2>
          <div className="flex items-center gap-4">
            <Select value={viewFilter} onValueChange={(v: any) => setViewFilter(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{i18n.language === 'es' ? 'Activos' : 'Active'}</SelectItem>
                <SelectItem value="trash">{i18n.language === 'es' ? 'Papelera' : 'Trash'}</SelectItem>
                <SelectItem value="all">{i18n.language === 'es' ? 'Todos' : 'All'}</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-lg">
              {tasks.length} {t('crm.activityTask')}s
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          {viewFilter === 'active' && (
            <>
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
            </>
          )}

          {viewFilter !== 'active' && (
            <TaskSection
              title={viewFilter === 'trash' ? (i18n.language === 'es' ? 'Tareas en Papelera' : 'Trashed Tasks') : (i18n.language === 'es' ? 'Todas las Tareas' : 'All Tasks')}
              tasks={tasks}
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
