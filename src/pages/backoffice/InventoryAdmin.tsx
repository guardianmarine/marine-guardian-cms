import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnitsSupabase } from '@/hooks/useUnitsSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Eye, Edit, CheckCircle, XCircle, MoreVertical, Package, DollarSign, Archive, RefreshCw, Trash2, RotateCcw } from 'lucide-react';
import { UnitStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

type StatusTab = 'all' | 'draft' | 'published' | 'reserved' | 'sold' | 'archived' | 'trash';

export default function InventoryAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterMake, setFilterMake] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterYearMin, setFilterYearMin] = useState<string>('');
  const [filterYearMax, setFilterYearMax] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<{ id: string; name: string } | null>(null);
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [unitToHardDelete, setUnitToHardDelete] = useState<{ id: string; name: string } | null>(null);

  // Use Supabase hook for real data
  const { 
    units, 
    loading, 
    error, 
    refetch, 
    publishUnit, 
    unpublishUnit, 
    changeStatus,
    deleteUnit,
    restoreUnit,
    hardDeleteUnit
  } = useUnitsSupabase({ 
    statusFilter: statusTab === 'all' || statusTab === 'trash' ? 'all' : statusTab as UnitStatus,
    trashedOnly: statusTab === 'trash'
  });

  // Get unique makes for filter
  const uniqueMakes = Array.from(new Set(units.map(u => u.make).filter(Boolean))).sort();

  // Filter units based on search and filters
  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      searchTerm === '' ||
      unit.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.vin_or_serial?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !filterCategory || unit.category === filterCategory;
    const matchesMake = !filterMake || unit.make === filterMake;
    const matchesType = !filterType || unit.type === filterType;
    const matchesYearMin = !filterYearMin || unit.year >= parseInt(filterYearMin);
    const matchesYearMax = !filterYearMax || unit.year <= parseInt(filterYearMax);

    return matchesSearch && matchesCategory && matchesMake && matchesType && matchesYearMin && matchesYearMax;
  });

  const getStatusColor = (status: UnitStatus) => {
    const colors: Record<UnitStatus, string> = {
      draft: 'secondary',
      ready: 'outline',
      published: 'default',
      reserved: 'outline',
      sold: 'destructive',
      archived: 'secondary',
    };
    return colors[status] as any;
  };

  const handleQuickPublish = async (id: string) => {
    const success = await publishUnit(id);
    if (success) {
      toast({ title: 'Unit published', description: 'Unit is now live on the website' });
    }
  };

  const handleQuickUnpublish = async (id: string) => {
    const success = await unpublishUnit(id);
    if (success) {
      toast({ title: 'Unit unpublished', description: 'Unit moved to draft' });
    }
  };

  const handleReserve = async (id: string) => {
    const success = await changeStatus(id, 'reserved');
    if (success) {
      toast({ title: 'Unit reserved', description: 'Unit marked as reserved' });
    }
  };

  const handleMarkSold = async (id: string) => {
    if (user?.role !== 'admin') {
      toast({
        title: 'Permission denied',
        description: 'Only admins can mark units as sold',
        variant: 'destructive',
      });
      return;
    }
    const success = await changeStatus(id, 'sold');
    if (success) {
      toast({ title: 'Unit sold', description: 'Unit marked as sold' });
    }
  };

  const handleArchive = async (id: string) => {
    const success = await changeStatus(id, 'archived');
    if (success) {
      toast({ title: 'Unit archived', description: 'Unit moved to archive' });
    }
  };

  const handleDeleteClick = (id: string, make: string, model: string) => {
    setUnitToDelete({ id, name: `${make} ${model}` });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!unitToDelete) return;
    const success = await deleteUnit(unitToDelete.id);
    if (success) {
      toast({ title: 'Unit deleted', description: 'Unit has been moved to trash' });
    }
    setDeleteDialogOpen(false);
    setUnitToDelete(null);
  };

  const handleRestore = async (id: string, make: string, model: string) => {
    const success = await restoreUnit(id);
    if (success) {
      toast({ title: 'Unit restored', description: `${make} ${model} has been restored` });
    }
  };

  const handleHardDeleteClick = (id: string, make: string, model: string) => {
    setUnitToHardDelete({ id, name: `${make} ${model}` });
    setHardDeleteDialogOpen(true);
  };

  const handleConfirmHardDelete = async () => {
    if (!unitToHardDelete) return;
    const success = await hardDeleteUnit(unitToHardDelete.id);
    if (success) {
      toast({ title: 'Unit permanently deleted', description: 'Unit has been permanently removed' });
    }
    setHardDeleteDialogOpen(false);
    setUnitToHardDelete(null);
  };

  // Stats based on all units (not filtered)
  const stats = {
    total: units.length,
    published: units.filter(u => u.status === 'published').length,
    reserved: units.filter(u => u.status === 'reserved').length,
    soldThisMonth: units.filter(u => {
      if (u.status !== 'sold' || !u.sold_at) return false;
      const soldDate = new Date(u.sold_at);
      const now = new Date();
      return soldDate.getMonth() === now.getMonth() && soldDate.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Inventory Management</h2>
            <p className="text-muted-foreground">Manage units, photos, and publishing workflow</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate('/backoffice/inventory/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 border border-destructive rounded-lg bg-destructive/10 text-destructive">
            Error loading inventory: {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Total Units</div>
            <div className="text-2xl font-bold">{loading ? '...' : stats.total}</div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Published</div>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : stats.published}
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Reserved</div>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '...' : stats.reserved}
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Sold (This Month)</div>
            <div className="text-2xl font-bold text-orange-600">
              {loading ? '...' : stats.soldThisMonth}
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="reserved">Reserved</TabsTrigger>
            <TabsTrigger value="sold">Sold</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="trash" className="text-destructive data-[state=active]:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Trash
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by make, model, or VIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">Trucks</SelectItem>
                <SelectItem value="trailer">Trailers</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMake} onValueChange={setFilterMake}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Make" />
              </SelectTrigger>
              <SelectContent>
                {uniqueMakes.map(make => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sleeper">Sleeper</SelectItem>
                <SelectItem value="Daycab">Daycab</SelectItem>
                <SelectItem value="Dry Van">Dry Van</SelectItem>
                <SelectItem value="Reefer">Reefer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="number"
              placeholder="Year min"
              value={filterYearMin}
              onChange={(e) => setFilterYearMin(e.target.value)}
              className="w-full sm:w-32"
            />
            <Input
              type="number"
              placeholder="Year max"
              value={filterYearMax}
              onChange={(e) => setFilterYearMax(e.target.value)}
              className="w-full sm:w-32"
            />
            {(searchTerm || filterCategory || filterMake || filterType || filterYearMin || filterYearMax) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                  setFilterMake('');
                  setFilterType('');
                  setFilterYearMin('');
                  setFilterYearMax('');
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Photo</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cat</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>VIN/Serial</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Listed</TableHead>
                <TableHead>Sold</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="w-12 h-12 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                    No units found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnits.map((unit) => {
                  const photos = unit.photos || [];
                  const mainPhoto = photos.find(p => p.is_main) || photos[0];
                  return (
                    <TableRow key={unit.id}>
                      <TableCell>
                        {mainPhoto ? (
                          <img 
                            src={mainPhoto.url} 
                            alt={unit.make}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {unit.make} {unit.model}
                        </div>
                        <Badge variant={photos.length >= 4 ? 'secondary' : 'destructive'} className="text-xs">
                          {photos.length} photos
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-xs">{unit.category}</TableCell>
                      <TableCell>{unit.year}</TableCell>
                      <TableCell className="text-sm">{unit.type}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {unit.vin_or_serial?.substring(0, 10)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {unit.mileage ? unit.mileage.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">${unit.display_price?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(unit.status)}>{unit.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{unit.received_at || '-'}</TableCell>
                      <TableCell className="text-sm">{unit.listed_at || '-'}</TableCell>
                      <TableCell className="text-sm">{unit.sold_at || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {statusTab === 'trash' ? (
                            // Trash view actions
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestore(unit.id, unit.make || '', unit.model || '')}
                                title="Restore"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleHardDeleteClick(unit.id, unit.make || '', unit.model || '')}
                                title="Permanently Delete"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete Forever
                              </Button>
                            </>
                          ) : (
                            // Normal view actions
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => navigate(`/inventory/${unit.id}`)}
                                title="View public page"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => navigate(`/backoffice/inventory/${unit.id}`)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {unit.status === 'published' ? (
                                    <DropdownMenuItem onClick={() => handleQuickUnpublish(unit.id)}>
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Unpublish
                                    </DropdownMenuItem>
                                  ) : unit.status !== 'sold' && unit.status !== 'archived' ? (
                                    <DropdownMenuItem onClick={() => handleQuickPublish(unit.id)}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Publish
                                    </DropdownMenuItem>
                                  ) : null}
                                  {unit.status === 'published' && (
                                    <DropdownMenuItem onClick={() => handleReserve(unit.id)}>
                                      <Package className="h-4 w-4 mr-2" />
                                      Reserve
                                    </DropdownMenuItem>
                                  )}
                                  {unit.status === 'reserved' && (
                                    <DropdownMenuItem onClick={() => handleMarkSold(unit.id)}>
                                      <DollarSign className="h-4 w-4 mr-2" />
                                      Mark as Sold
                                    </DropdownMenuItem>
                                  )}
                                  {unit.status !== 'archived' && unit.status !== 'sold' && (
                                    <DropdownMenuItem onClick={() => handleArchive(unit.id)}>
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteClick(unit.id, unit.make || '', unit.model || '')}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete unit?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{unitToDelete?.name}</strong>? 
              The unit will be moved to trash and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Confirmation Dialog */}
      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete unit?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{unitToHardDelete?.name}</strong>? 
              This action cannot be undone and the unit will be removed forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmHardDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BackofficeLayout>
  );
}
