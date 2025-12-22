import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UserPlus, 
  Loader2, 
  MoreHorizontal, 
  Trash2, 
  Shield, 
  Search,
  RefreshCw,
  Users,
  ShieldCheck,
  ShieldAlert,
  Mail,
  KeyRound,
  Send,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { AppRole } from '@/types/permissions';

// Input validation schema
const inviteSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  full_name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  role: z.enum(['admin', 'finance', 'sales', 'inventory', 'viewer']),
});

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: 'active' | 'invited' | 'inactive';
  created_at: string;
  roles: AppRole[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrator',
  finance: 'Finance',
  sales: 'Sales',
  inventory: 'Inventory',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  finance: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  sales: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  inventory: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  invited: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  invited: 'Invited',
  inactive: 'Inactive',
};

export default function UserManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser, session } = useAuth();
  
  // Data state
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Dialog states
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditRolesOpen, setIsEditRolesOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('viewer');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  
  // Edit roles state
  const [editRoles, setEditRoles] = useState<AppRole[]>([]);

  const fetchUsers = useCallback(async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, avatar_url, status, created_at')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: 'Error',
          description: 'Failed to load users. The profiles table may not exist yet.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }
      
      // Combine profiles with roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
        const userRoles = (allRoles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole);
        
        return {
          ...profile,
          status: (profile.status as 'active' | 'invited' | 'inactive') || 'inactive',
          roles: userRoles,
        };
      });
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter as AppRole);
    
    return matchesSearch && matchesRole;
  });

  // Stats
  const adminCount = users.filter(u => u.roles.includes('admin')).length;
  const totalUsers = users.length;

  const handleInviteUser = async () => {
    const validation = inviteSchema.safeParse({
      email: inviteEmail,
      full_name: inviteName,
      role: inviteRole,
    });

    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: 'Error',
        description: 'No active session',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      
      const response = await supabase?.functions.invoke('invite-user', {
        body: {
          email: validation.data.email.toLowerCase(),
          full_name: validation.data.full_name,
          role: validation.data.role,
        },
      });

      if (response?.error) {
        throw new Error(response.error.message || 'Failed to invite user');
      }

      if (response?.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Success',
        description: `Invitation sent to ${validation.data.email}`,
      });

      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('viewer');
      fetchUsers();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to invite user',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser || !session?.access_token) return;

    // Prevent removing admin's own admin role
    if (selectedUser.id === currentUser?.id && !editRoles.includes('admin') && selectedUser.roles.includes('admin')) {
      toast({
        title: 'Error',
        description: 'You cannot remove your own admin role',
        variant: 'destructive',
      });
      return;
    }

    // Ensure at least one role
    if (editRoles.length === 0) {
      toast({
        title: 'Error',
        description: 'User must have at least one role',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      
      const response = await supabase?.functions.invoke('update-user-roles', {
        body: {
          target_user_id: selectedUser.id,
          roles: editRoles,
          reseed_permissions: true,
        },
      });

      if (response?.error) {
        throw new Error(response.error.message || 'Failed to update roles');
      }

      if (response?.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Success',
        description: 'User roles updated successfully',
      });

      setIsEditRolesOpen(false);
      setSelectedUser(null);
      setEditRoles([]);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating roles:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update roles',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !session?.access_token) return;

    // Validate email confirmation
    if (deleteConfirmEmail.toLowerCase() !== selectedUser.email.toLowerCase()) {
      toast({
        title: 'Error',
        description: 'Email does not match',
        variant: 'destructive',
      });
      return;
    }

    // Prevent self-deletion
    if (selectedUser.id === currentUser?.id) {
      toast({
        title: 'Error',
        description: 'You cannot delete your own account',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      
      const response = await supabase?.functions.invoke('delete-user', {
        body: {
          target_user_id: selectedUser.id,
        },
      });

      if (response?.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      if (response?.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      setIsDeleteOpen(false);
      setSelectedUser(null);
      setDeleteConfirmEmail('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditRolesDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditRoles([...user.roles]);
    setIsEditRolesOpen(true);
  };

  const openDeleteDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDeleteConfirmEmail('');
    setIsDeleteOpen(true);
  };

  const toggleRole = (role: AppRole) => {
    setEditRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  // New action handlers
  const handleResendInvite = async (user: UserWithRoles) => {
    if (!session?.access_token) return;
    
    try {
      setActionLoading(true);
      const response = await supabase?.functions.invoke('resend-invite', {
        body: { user_id: user.id },
      });

      if (response?.error) throw new Error(response.error.message);
      if (response?.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Success',
        description: `Invitation resent to ${user.email}`,
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error resending invite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMagicLink = async (user: UserWithRoles) => {
    if (!session?.access_token) return;
    
    try {
      setActionLoading(true);
      const response = await supabase?.functions.invoke('send-magic-link', {
        body: { user_id: user.id },
      });

      if (response?.error) throw new Error(response.error.message);
      if (response?.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Success',
        description: `Magic link sent to ${user.email}`,
      });
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send magic link',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendPasswordReset = async (user: UserWithRoles) => {
    if (!session?.access_token) return;
    
    try {
      setActionLoading(true);
      const response = await supabase?.functions.invoke('send-password-reset', {
        body: { user_id: user.id },
      });

      if (response?.error) throw new Error(response.error.message);
      if (response?.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Success',
        description: `Password reset email sent to ${user.email}`,
      });
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage users, roles, and permissions
            </p>
          </div>
          <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <ShieldCheck className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Administrators</p>
                  <p className="text-2xl font-bold">{adminCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-chart-2/10">
                  <ShieldAlert className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Roles</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  All registered users in the system
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
                {searchQuery && (
                  <Button variant="link" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.full_name || 'No name'}
                              {user.id === currentUser?.id && (
                                <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={STATUS_COLORS[user.status] || STATUS_COLORS.inactive}
                        >
                          {STATUS_LABELS[user.status] || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map(role => (
                              <Badge 
                                key={role} 
                                variant="outline"
                                className={ROLE_COLORS[role]}
                              >
                                {ROLE_LABELS[role]}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* Resend Invite - only for invited users */}
                            {user.status === 'invited' && (
                              <DropdownMenuItem onClick={() => handleResendInvite(user)}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            
                            {/* Send Magic Link - for all users */}
                            <DropdownMenuItem onClick={() => handleSendMagicLink(user)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send Magic Link
                            </DropdownMenuItem>
                            
                            {/* Reset Password - for all users */}
                            <DropdownMenuItem onClick={() => handleSendPasswordReset(user)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem onClick={() => openEditRolesDialog(user)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Edit Roles
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(user)}
                              className="text-destructive focus:text-destructive"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Invite User Dialog */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invite New User
              </DialogTitle>
              <DialogDescription>
                Send an invitation email to add a new user to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full Name</Label>
                <Input
                  id="invite-name"
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="john@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Initial Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The user will receive permissions based on this role.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteUser} disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Roles Dialog */}
        <Dialog open={isEditRolesOpen} onOpenChange={setIsEditRolesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Edit User Roles
              </DialogTitle>
              <DialogDescription>
                {selectedUser && (
                  <>Manage roles for <strong>{selectedUser.full_name || selectedUser.email}</strong></>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {(['admin', 'finance', 'sales', 'inventory', 'viewer'] as AppRole[]).map(role => (
                <div key={role} className="flex items-center space-x-3">
                  <Checkbox
                    id={`role-${role}`}
                    checked={editRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    disabled={
                      // Prevent removing own admin role
                      role === 'admin' && 
                      selectedUser?.id === currentUser?.id && 
                      editRoles.includes('admin')
                    }
                  />
                  <Label htmlFor={`role-${role}`} className="flex items-center gap-2">
                    <Badge variant="outline" className={ROLE_COLORS[role]}>
                      {ROLE_LABELS[role]}
                    </Badge>
                    {role === 'admin' && selectedUser?.id === currentUser?.id && (
                      <span className="text-xs text-muted-foreground">(cannot remove own admin)</span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditRolesOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRoles} disabled={actionLoading || editRoles.length === 0}>
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. The user will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium mb-2">You are about to delete:</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback className="bg-destructive/10 text-destructive">
                        {getInitials(selectedUser.full_name, selectedUser.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedUser.full_name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-email">
                    Type <strong>{selectedUser.email}</strong> to confirm
                  </Label>
                  <Input
                    id="confirm-email"
                    placeholder="Enter email to confirm"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser} 
                disabled={actionLoading || deleteConfirmEmail.toLowerCase() !== selectedUser?.email.toLowerCase()}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete User'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BackofficeLayout>
  );
}
