import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCog, Mail, UserPlus, Loader2, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  birthday?: string;
  created_at: string;
}

export default function UsersRoles() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [hasUsersTable, setHasUsersTable] = useState(true);
  const [hasBirthdayColumn, setHasBirthdayColumn] = useState(true);

  // Form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<string>('viewer');
  const [editBirthday, setEditBirthday] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Try to fetch users with birthday
      let query = supabase
        .from('users')
        .select('id,name,email,role,status,birthday,created_at')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        // Check if users table doesn't exist
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          setHasUsersTable(false);
          setLoading(false);
          return;
        }
        
        // Check if birthday column doesn't exist
        if (error.message.includes('birthday')) {
          setHasBirthdayColumn(false);
          // Retry without birthday column
          const retryResult = await supabase
            .from('users')
            .select('id,name,email,role,status,created_at')
            .order('created_at', { ascending: false });
          
          if (retryResult.error) throw retryResult.error;
          setUsers(retryResult.data || []);
        } else {
          throw error;
        }
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('admin.users.fetchError', 'Failed to load users'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteName) {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin.users.fillRequired', 'Please fill all required fields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);

      // Send invite using Supabase Auth admin methods
      // Note: This requires the user to have appropriate permissions
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
        data: {
          name: inviteName,
          role: inviteRole,
        },
      });

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('admin.users.inviteSent', 'Invitation email sent'),
      });

      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('viewer');
      
      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      
      // If admin methods are not available, fall back to direct insert
      if (error.message?.includes('admin') || error.status === 403) {
        try {
          // Insert user record directly
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              email: inviteEmail,
              name: inviteName,
              role: inviteRole,
              status: 'pending',
            });

          if (insertError) throw insertError;

          toast({
            title: t('common.success', 'Success'),
            description: t('admin.users.userCreated', 'User record created. Please set up password manually.'),
          });

          setIsInviteDialogOpen(false);
          setInviteEmail('');
          setInviteName('');
          setInviteRole('viewer');
          fetchUsers();
        } catch (fallbackError) {
          toast({
            title: t('common.error', 'Error'),
            description: t('admin.users.inviteError', 'Failed to send invitation'),
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: t('common.error', 'Error'),
          description: error.message || t('admin.users.inviteError', 'Failed to send invitation'),
          variant: 'destructive',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);

      const updateData: any = {
        name: editName,
        role: editRole,
      };

      if (hasBirthdayColumn && editBirthday) {
        updateData.birthday = editBirthday;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('admin.users.userUpdated', 'User updated successfully'),
      });

      setIsEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.users.updateError', 'Failed to update user'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('admin.users.resetSent', 'Password reset email sent'),
      });
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.users.resetError', 'Failed to send reset email'),
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditBirthday(user.birthday || '');
    setIsEditDialogOpen(true);
  };

  if (!hasUsersTable) {
    return (
      <BackofficeLayout>
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-3xl font-bold">
              {t('admin.users.title', 'Users & Roles')}
            </h2>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('admin.users.setupRequired', 'The users table does not exist yet. Please create a users table in your database with columns: id, name, email, role, status, birthday (optional), created_at.')}
            </AlertDescription>
          </Alert>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <UserCog className="h-8 w-8" />
              {t('admin.users.title', 'Users & Roles')}
            </h2>
            <p className="text-muted-foreground">
              {t('admin.users.subtitle', 'Manage staff members, roles, and access')}
            </p>
          </div>
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('admin.users.inviteUser', 'Invite User')}
          </Button>
        </div>

        {!hasBirthdayColumn && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('admin.users.birthdayColumnMissing', 'The birthday column is not available. To track birthdays, add a "birthday" column (type: date) to your users table.')}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.users.allUsers', 'All Users')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.users.noUsers', 'No users found. Invite your first user to get started.')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.users.name', 'Name')}</TableHead>
                    <TableHead>{t('admin.users.email', 'Email')}</TableHead>
                    <TableHead>{t('admin.users.role', 'Role')}</TableHead>
                    <TableHead>{t('admin.users.status', 'Status')}</TableHead>
                    {hasBirthdayColumn && <TableHead>{t('admin.users.birthday', 'Birthday')}</TableHead>}
                    <TableHead>{t('admin.users.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      {hasBirthdayColumn && (
                        <TableCell>
                          {user.birthday ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(user.birthday), 'MMM d')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            {t('common.edit', 'Edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendPasswordReset(user.email)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {t('admin.users.resetPassword', 'Reset')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.inviteUser', 'Invite User')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.inviteDescription', 'Send an invitation email to a new team member')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">{t('admin.users.email', 'Email')} *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-name">{t('admin.users.name', 'Name')} *</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">{t('admin.users.role', 'Role')}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleInviteUser} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Mail className="h-4 w-4 mr-2" />
              {t('admin.users.sendInvite', 'Send Invite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.editUser', 'Edit User')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.editDescription', 'Update user information and permissions')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('admin.users.name', 'Name')}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">{t('admin.users.role', 'Role')}</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasBirthdayColumn && (
              <div>
                <Label htmlFor="edit-birthday">{t('admin.users.birthday', 'Birthday')}</Label>
                <Input
                  id="edit-birthday"
                  type="date"
                  value={editBirthday}
                  onChange={(e) => setEditBirthday(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleUpdateUser} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BackofficeLayout>
  );
}
