import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
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
import { UserCog, Mail, UserPlus, Loader2, Calendar, RefreshCw, AlertCircle, Info, Ban, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Input validation schema
const userSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  role: z.enum(['admin', 'inventory', 'sales', 'finance', 'viewer']),
  birth_date: z.string().optional(),
});

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  birth_date?: string;
  created_at: string;
}

export default function UsersRoles() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [hasUsersTable, setHasUsersTable] = useState(true);
  const [hasBirthDateColumn, setHasBirthDateColumn] = useState(true);
  const [hasStatusColumn, setHasStatusColumn] = useState(true);
  const [editingBirthDate, setEditingBirthDate] = useState<{ [key: string]: string }>({});

  // Filters
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add User Form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<string>('viewer');
  const [addBirthDate, setAddBirthDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchText, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Try to fetch users with birth_date
      let query = supabase
        .from('users')
        .select('id,name,email,role,status,birth_date,created_at')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        // Check if users table doesn't exist
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          setHasUsersTable(false);
          setLoading(false);
          return;
        }
        
        // Check if birth_date column doesn't exist
        if (error.message.includes('birth_date')) {
          setHasBirthDateColumn(false);
          // Retry without birth_date column
          const retryResult = await supabase
            .from('users')
            .select('id,name,email,role,status,created_at')
            .order('created_at', { ascending: false });
          
          if (retryResult.error) {
            // Check if status column doesn't exist
            if (retryResult.error.message.includes('status')) {
              setHasStatusColumn(false);
              // Retry without status column
              const finalResult = await supabase
                .from('users')
                .select('id,name,email,role,created_at')
                .order('created_at', { ascending: false });
              
              if (finalResult.error) throw finalResult.error;
              setUsers(finalResult.data || []);
            } else {
              throw retryResult.error;
            }
          } else {
            setUsers(retryResult.data || []);
          }
        } else if (error.message.includes('status')) {
          setHasStatusColumn(false);
          // Retry without status column
          const retryResult = await supabase
            .from('users')
            .select('id,name,email,role,created_at')
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

  const applyFilters = () => {
    let filtered = [...users];

    // Text search (name or email)
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    // Status filter (only if status column exists)
    if (hasStatusColumn && statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleAddUser = async () => {
    // Validate inputs
    const validation = userSchema.safeParse({
      name: addName,
      email: addEmail,
      role: addRole,
      birth_date: addBirthDate,
    });

    if (!validation.success) {
      toast({
        title: t('common.error', 'Error'),
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);

      const insertData: any = {
        email: validation.data.email.toLowerCase(),
        name: validation.data.name,
        role: validation.data.role,
      };

      if (hasStatusColumn) {
        insertData.status = 'pending';
      }

      if (hasBirthDateColumn && validation.data.birth_date) {
        insertData.birth_date = validation.data.birth_date;
      }

      const { error } = await supabase
        .from('users')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('admin.users.userAdded', 'User added successfully'),
      });

      setIsAddDialogOpen(false);
      setAddEmail('');
      setAddName('');
      setAddRole('viewer');
      setAddBirthDate('');
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.users.addError', 'Failed to add user'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendInvite = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: `${window.location.origin}/backoffice/login`
        }
      });

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('admin.users.inviteSent', 'Invite sent to ' + email),
      });
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.users.inviteError', 'Failed to send invitation'),
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (email: string) => {
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

  const handleToggleStatus = async (userId: string, currentStatus?: string) => {
    if (!hasStatusColumn) {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin.users.statusColumnMissing', 'Status column not available'),
        variant: 'destructive',
      });
      return;
    }

    if (!currentStatus) {
      currentStatus = 'pending'; // Default if not set
    }

    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('admin.users.statusUpdated', 'Status updated'),
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.users.updateError', 'Failed to update status'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('admin.users.roleUpdated', 'Role updated'),
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.users.updateError', 'Failed to update role'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdateBirthDate = async (userId: string, newBirthDate: string) => {
    if (!newBirthDate) {
      // Clear the editing state if empty
      setEditingBirthDate(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ birth_date: newBirthDate })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('admin.users.birthDateUpdated', 'Birth date updated'),
      });

      // Clear editing state
      setEditingBirthDate(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.users.updateError', 'Failed to update birth date'),
        variant: 'destructive',
      });
    }
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
              {t('admin.users.setupRequired', 'The users table does not exist yet. Please create a users table in your database with columns: id, name, email, role, status, birth_date (optional), created_at.')}
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
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('admin.users.addUser', 'Add User')}
          </Button>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('admin.users.accessNote', 'Changes here affect backoffice access.')}
          </AlertDescription>
        </Alert>

        {!hasBirthDateColumn && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('admin.users.birthDateColumnMissing', 'Birth date column not found. Ask admin to add it in the database.')}
            </AlertDescription>
          </Alert>
        )}

        {!hasStatusColumn && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('admin.users.statusColumnMissing', 'Status column not found. Ask admin to add it in the database.')}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.users.filters', 'Filters')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">{t('admin.users.searchNameEmail', 'Search Name / Email')}</Label>
                <Input
                  id="search"
                  placeholder={t('admin.users.searchPlaceholder', 'Type to search...')}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role-filter">{t('admin.users.filterRole', 'Filter by Role')}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.users.allRoles', 'All Roles')}</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasStatusColumn && (
                <div>
                  <Label htmlFor="status-filter">{t('admin.users.filterStatus', 'Filter by Status')}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin.users.allStatuses', 'All Statuses')}</SelectItem>
                      <SelectItem value="active">{t('admin.users.active', 'Active')}</SelectItem>
                      <SelectItem value="pending">{t('admin.users.pending', 'Pending')}</SelectItem>
                      <SelectItem value="disabled">{t('admin.users.disabled', 'Disabled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('admin.users.allUsers', 'All Users')} 
              <span className="text-muted-foreground text-sm ml-2">
                ({filteredUsers.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.users.noUsersFound', 'No users found matching your filters.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.users.name', 'Name')}</TableHead>
                      <TableHead>{t('admin.users.email', 'Email')}</TableHead>
                      <TableHead>{t('admin.users.role', 'Role')}</TableHead>
                      {hasStatusColumn && <TableHead>{t('admin.users.status', 'Status')}</TableHead>}
                      {hasBirthDateColumn && <TableHead>{t('admin.users.birthDate', 'Birth Date')}</TableHead>}
                      <TableHead>{t('admin.users.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleUpdateRole(user.id, value)}
                          >
                            <SelectTrigger className="w-32">
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
                        </TableCell>
                        {hasStatusColumn && (
                          <TableCell>
                            <Badge 
                              variant={
                                user.status === 'active' ? 'default' : 
                                user.status === 'pending' ? 'secondary' : 
                                'destructive'
                              }
                            >
                              {user.status}
                            </Badge>
                          </TableCell>
                        )}
                        {hasBirthDateColumn && (
                          <TableCell>
                            <Input
                              type="date"
                              value={editingBirthDate[user.id] !== undefined ? editingBirthDate[user.id] : (user.birth_date || '')}
                              onChange={(e) => setEditingBirthDate(prev => ({ ...prev, [user.id]: e.target.value }))}
                              onBlur={(e) => handleUpdateBirthDate(user.id, e.target.value)}
                              className="w-36"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendInvite(user.email)}
                              title={t('admin.users.sendInvite', 'Send Invite')}
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user.email)}
                              title={t('admin.users.resetPassword', 'Reset Password')}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            {hasStatusColumn && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(user.id, user.status)}
                                title={
                                  user.status === 'active' 
                                    ? t('admin.users.disable', 'Disable') 
                                    : t('admin.users.enable', 'Enable')
                                }
                              >
                                {user.status === 'active' ? (
                                  <Ban className="h-3 w-3 text-destructive" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.addUser', 'Add User')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.addDescription', 'Create a new user account with pending status')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-name">{t('admin.users.name', 'Name')} *</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="add-email">{t('admin.users.email', 'Email')} *</Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="add-role">{t('admin.users.role', 'Role')}</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger id="add-role">
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
            {hasBirthDateColumn && (
              <div>
                <Label htmlFor="add-birth-date">
                  {t('admin.users.birthDate', 'Birth Date')} ({t('admin.users.optional', 'optional')})
                </Label>
                <Input
                  id="add-birth-date"
                  type="date"
                  value={addBirthDate}
                  onChange={(e) => setAddBirthDate(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleAddUser} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('admin.users.addUser', 'Add User')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BackofficeLayout>
  );
}
