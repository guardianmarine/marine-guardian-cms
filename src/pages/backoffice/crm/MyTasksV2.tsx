import { useState, useEffect } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Calendar, AlertCircle, Plus } from 'lucide-react';
import { format, isPast, isToday, isWithinInterval, addDays } from 'date-fns';
import { toast } from 'sonner';

type Task = {
  id: string;
  related_type: 'lead' | 'opportunity' | 'deal' | 'account';
  related_id: string;
  title: string;
  due_at: string | null;
  assigned_to: string;
  status: 'open' | 'done';
  created_at: string;
};

export default function MyTasksV2() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    due_at: '',
    related_type: 'lead' as Task['related_type'],
    related_id: '',
  });

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('status', 'open')
        .order('due_at', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success('Task completed');
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleAddTask = async () => {
    if (!user || !newTask.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const { error } = await supabase.from('tasks').insert({
        title: newTask.title,
        due_at: newTask.due_at || null,
        related_type: newTask.related_type,
        related_id: newTask.related_id || null,
        assigned_to: user.id,
        status: 'open',
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Task created');
      setAddDialogOpen(false);
      setNewTask({ title: '', due_at: '', related_type: 'lead', related_id: '' });
      loadTasks();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

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
                checked={false}
                onCheckedChange={() => completeTask(task.id)}
              />
              <div className="flex-1">
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Related: {task.related_type}
                </p>
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

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p>Loading tasks...</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">My Tasks</h2>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg">
              {tasks.length} Open Tasks
            </Badge>
            <Button type="button" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {overdueTasks.length > 0 && (
            <TaskSection
              title="Overdue"
              tasks={overdueTasks}
              icon={AlertCircle}
              color="text-red-500"
            />
          )}

          <TaskSection
            title="Today"
            tasks={todayTasks}
            icon={Calendar}
            color="text-blue-500"
          />

          <TaskSection
            title="Next 7 Days"
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
              <p className="text-muted-foreground">No open tasks assigned to you.</p>
            </CardContent>
          </Card>
        )}

        {/* Add Task Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div>
                <Label htmlFor="due_at">Due Date</Label>
                <Input
                  id="due_at"
                  type="datetime-local"
                  value={newTask.due_at}
                  onChange={(e) => setNewTask({ ...newTask, due_at: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="related_type">Related To</Label>
                <Select
                  value={newTask.related_type}
                  onValueChange={(v: Task['related_type']) =>
                    setNewTask({ ...newTask, related_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="deal">Deal</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="related_id">Related ID (Optional)</Label>
                <Input
                  id="related_id"
                  value={newTask.related_id}
                  onChange={(e) => setNewTask({ ...newTask, related_id: e.target.value })}
                  placeholder="UUID of related entity"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAddTask}>
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BackofficeLayout>
  );
}
