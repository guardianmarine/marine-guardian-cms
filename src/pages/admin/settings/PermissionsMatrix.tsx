import { useState, useEffect, useCallback } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Search,
  RefreshCw,
  Save,
  Shield,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Info,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MODULE_METADATA, type ModuleName, type AppRole } from '@/types/permissions';

interface UserPermission {
  id?: string;
  user_id: string;
  module_name: ModuleName;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface UserWithPermissions {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
  permissions: UserPermission[];
}

// Group modules by category
const MODULE_GROUPS: Record<string, ModuleName[]> = {
  'Dashboard': ['dashboard'],
  'Inventory': ['inventory', 'media', 'purchasing'],
  'CRM': ['crm_accounts', 'crm_contacts', 'crm_leads', 'crm_opportunities', 'crm_tasks', 'crm_inbound'],
  'Sales': ['deals', 'tax_presets'],
  'Finance': ['finance_overview', 'finance_dashboard', 'pac_fund', 'commissions'],
  'Analytics': ['insights'],
  'Content': ['cms'],
  'Admin': ['admin_users'],
};

const ACTION_ICONS = {
  view: Eye,
  create: Plus,
  edit: Pencil,
  delete: Trash2,
};

const ACTION_COLORS = {
  view: 'text-blue-500',
  create: 'text-green-500',
  edit: 'text-amber-500',
  delete: 'text-red-500',
};

export default function PermissionsMatrix() {
  const { toast } = useToast();
  const { user: currentUser, session } = useAuth();
  
  // Data state
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  // Track unsaved changes
  const [pendingChanges, setPendingChanges] = useState<Map<string, UserPermission>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name', { ascending: true });
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        });
        return;
      }
      
      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }
      
      // Fetch all permissions
      const { data: allPerms, error: permsError } = await supabase
        .from('user_permissions')
        .select('id, user_id, module_name, can_view, can_create, can_edit, can_delete');
      
      if (permsError) {
        console.error('Error fetching permissions:', permsError);
      }
      
      // Combine data
      const usersWithPerms: UserWithPermissions[] = (profiles || []).map(profile => {
        const userRoles = (allRoles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole);
        
        const userPerms = (allPerms || [])
          .filter(p => p.user_id === profile.id)
          .map(p => ({
            id: p.id,
            user_id: p.user_id,
            module_name: p.module_name as ModuleName,
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          }));
        
        return {
          ...profile,
          roles: userRoles,
          permissions: userPerms,
        };
      });
      
      setUsers(usersWithPerms);
      setPendingChanges(new Map());
      setHasChanges(false);
    } catch (error) {
      console.error('Error in fetchData:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permissions data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get permission for a user/module combo
  const getPermission = (userId: string, moduleName: ModuleName): UserPermission => {
    const changeKey = `${userId}-${moduleName}`;
    
    // Check pending changes first
    if (pendingChanges.has(changeKey)) {
      return pendingChanges.get(changeKey)!;
    }
    
    // Find existing permission
    const user = users.find(u => u.id === userId);
    const existing = user?.permissions.find(p => p.module_name === moduleName);
    
    if (existing) {
      return existing;
    }
    
    // Return default (all false)
    return {
      user_id: userId,
      module_name: moduleName,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };
  };

  // Toggle a single permission
  const togglePermission = (userId: string, moduleName: ModuleName, action: 'view' | 'create' | 'edit' | 'delete') => {
    const changeKey = `${userId}-${moduleName}`;
    const current = getPermission(userId, moduleName);
    
    const updated: UserPermission = {
      ...current,
      [`can_${action}`]: !current[`can_${action}` as keyof UserPermission],
    };
    
    // Find original permission to check if this is actually a change
    const user = users.find(u => u.id === userId);
    const original = user?.permissions.find(p => p.module_name === moduleName);
    
    const isChanged = !original || 
      original.can_view !== updated.can_view ||
      original.can_create !== updated.can_create ||
      original.can_edit !== updated.can_edit ||
      original.can_delete !== updated.can_delete;
    
    const newChanges = new Map(pendingChanges);
    
    if (isChanged) {
      newChanges.set(changeKey, updated);
    } else {
      newChanges.delete(changeKey);
    }
    
    setPendingChanges(newChanges);
    setHasChanges(newChanges.size > 0);
  };

  // Save all pending changes
  const saveChanges = async () => {
    if (!supabase || pendingChanges.size === 0) return;
    
    try {
      setSaving(true);
      
      const changes = Array.from(pendingChanges.values());
      
      // Upsert all changes
      for (const change of changes) {
        const { error } = await supabase
          .from('user_permissions')
          .upsert({
            user_id: change.user_id,
            module_name: change.module_name,
            can_view: change.can_view,
            can_create: change.can_create,
            can_edit: change.can_edit,
            can_delete: change.can_delete,
          }, {
            onConflict: 'user_id,module_name',
          });
        
        if (error) {
          console.error('Error saving permission:', error);
          throw error;
        }
      }
      
      toast({
        title: 'Success',
        description: `Saved ${changes.length} permission change(s)`,
      });
      
      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    return user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Get modules to display based on group filter
  const getVisibleModules = (): ModuleName[] => {
    if (selectedGroup === 'all') {
      return Object.values(MODULE_GROUPS).flat();
    }
    return MODULE_GROUPS[selectedGroup] || [];
  };

  const visibleModules = getVisibleModules();

  // Check if user is admin (admins have all permissions implicitly)
  const isUserAdmin = (userId: string): boolean => {
    const user = users.find(u => u.id === userId);
    return user?.roles.includes('admin') || false;
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Permissions Matrix
            </h1>
            <p className="text-muted-foreground">
              View and edit granular CRUD permissions for each user
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                {pendingChanges.size} unsaved change(s)
              </Badge>
            )}
            <Button 
              onClick={saveChanges} 
              disabled={saving || !hasChanges}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Permission Actions:</span>
              </div>
              {Object.entries(ACTION_ICONS).map(([action, Icon]) => (
                <div key={action} className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${ACTION_COLORS[action as keyof typeof ACTION_COLORS]}`} />
                  <span className="text-sm capitalize">{action}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-4">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm">Admin (full access)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <CardTitle>User Permissions</CardTitle>
                <CardDescription>
                  Click on permission checkboxes to toggle access
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
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Module group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {Object.keys(MODULE_GROUPS).map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-[200px]" />
                    {[1, 2, 3, 4, 5].map(j => (
                      <Skeleton key={j} className="h-8 w-24" />
                    ))}
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                          User
                        </TableHead>
                        {visibleModules.map(moduleName => (
                          <TableHead key={moduleName} className="text-center min-w-[120px]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <div className="text-xs font-medium truncate">
                                      {MODULE_METADATA[moduleName]?.label || moduleName}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{MODULE_METADATA[moduleName]?.description || moduleName}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => {
                        const isAdmin = isUserAdmin(user.id);
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="sticky left-0 bg-background z-10">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium text-sm">
                                    {user.full_name || 'No name'}
                                    {user.id === currentUser?.id && (
                                      <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                                {isAdmin && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                                          Admin
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Admins have full access to all modules
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </TableCell>
                            {visibleModules.map(moduleName => {
                              const perm = getPermission(user.id, moduleName);
                              const changeKey = `${user.id}-${moduleName}`;
                              const hasChange = pendingChanges.has(changeKey);
                              
                              return (
                                <TableCell key={moduleName} className="text-center">
                                  {isAdmin ? (
                                    <div className="flex justify-center gap-1">
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                    </div>
                                  ) : (
                                    <div className={`flex justify-center gap-1 p-1 rounded ${hasChange ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : ''}`}>
                                      <TooltipProvider>
                                        {(['view', 'create', 'edit', 'delete'] as const).map(action => {
                                          const Icon = ACTION_ICONS[action];
                                          const isChecked = perm[`can_${action}` as keyof UserPermission] as boolean;
                                          
                                          return (
                                            <Tooltip key={action}>
                                              <TooltipTrigger asChild>
                                                <button
                                                  onClick={() => togglePermission(user.id, moduleName, action)}
                                                  className={`p-1 rounded transition-colors ${
                                                    isChecked 
                                                      ? `${ACTION_COLORS[action]} bg-current/10` 
                                                      : 'text-muted-foreground/30 hover:text-muted-foreground/50'
                                                  }`}
                                                >
                                                  <Icon className="h-3.5 w-3.5" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom">
                                                <p className="capitalize">{action}: {isChecked ? 'Enabled' : 'Disabled'}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          );
                                        })}
                                      </TooltipProvider>
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Module Groups Quick Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Module Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(MODULE_GROUPS).map(([group, modules]) => (
                <div key={group} className="space-y-2">
                  <h4 className="font-medium text-sm">{group}</h4>
                  <div className="space-y-1">
                    {modules.map(moduleName => (
                      <div key={moduleName} className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                        {MODULE_METADATA[moduleName]?.label || moduleName}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
