import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInventoryStore } from '@/services/inventoryStore';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Eye, Edit, CheckCircle, XCircle, MoreVertical, Package, DollarSign, Archive } from 'lucide-react';
import { UnitStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function InventoryAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { units, publishUnit, unpublishUnit, changeStatus, canPublish } = useInventoryStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterMake, setFilterMake] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterYearMin, setFilterYearMin] = useState<string>('');
  const [filterYearMax, setFilterYearMax] = useState<string>('');

  // Get unique makes for filter
  const uniqueMakes = Array.from(new Set(units.map(u => u.make))).sort();

  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      searchTerm === '' ||
      unit.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.vin_or_serial.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !filterCategory || unit.category === filterCategory;
    const matchesMake = !filterMake || unit.make === filterMake;
    const matchesType = !filterType || unit.type === filterType;
    const matchesStatus = !filterStatus || unit.status === filterStatus;
    const matchesYearMin = !filterYearMin || unit.year >= parseInt(filterYearMin);
    const matchesYearMax = !filterYearMax || unit.year <= parseInt(filterYearMax);

    return matchesSearch && matchesCategory && matchesMake && matchesType && matchesStatus && matchesYearMin && matchesYearMax;
  });

  const getStatusColor = (status: UnitStatus) => {
    const colors = {
      draft: 'secondary',
      ready: 'outline',
      published: 'default',
      reserved: 'outline',
      sold: 'destructive',
      archived: 'secondary',
    };
    return colors[status] as any;
  };

  const handleQuickPublish = (id: string) => {
    const validation = canPublish(id);
    if (!validation.valid) {
      toast({
        title: 'Cannot publish',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }
    publishUnit(id, user?.id || '1');
    toast({ title: 'Unit published', description: 'Unit is now live' });
  };

  const handleQuickUnpublish = (id: string) => {
    unpublishUnit(id, user?.id || '1');
    toast({ title: 'Unit unpublished', description: 'Unit moved to draft' });
  };

  const handleReserve = (id: string) => {
    changeStatus(id, 'reserved', user?.id || '1');
    toast({ title: 'Unit reserved', description: 'Unit marked as reserved' });
  };

  const handleMarkSold = (id: string) => {
    if (user?.role !== 'admin') {
      toast({
        title: 'Permission denied',
        description: 'Only admins can mark units as sold',
        variant: 'destructive',
      });
      return;
    }
    changeStatus(id, 'sold', user?.id || '1');
    toast({ title: 'Unit sold', description: 'Unit marked as sold' });
  };

  const handleArchive = (id: string) => {
    changeStatus(id, 'archived', user?.id || '1');
    toast({ title: 'Unit archived', description: 'Unit moved to archive' });
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Inventory Management</h2>
            <p className="text-muted-foreground">Manage units, photos, and publishing workflow</p>
          </div>
          <Button onClick={() => navigate('/backoffice/inventory/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Total Units</div>
            <div className="text-2xl font-bold">{units.length}</div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Published</div>
            <div className="text-2xl font-bold text-green-600">
              {units.filter(u => u.status === 'published').length}
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Reserved</div>
            <div className="text-2xl font-bold text-blue-600">
              {units.filter(u => u.status === 'reserved').length}
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Sold (This Month)</div>
            <div className="text-2xl font-bold text-orange-600">
              {units.filter(u => u.status === 'sold' && u.sold_at && new Date(u.sold_at).getMonth() === new Date().getMonth()).length}
            </div>
          </div>
        </div>

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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || filterCategory || filterMake || filterType || filterStatus || filterYearMin || filterYearMax) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                  setFilterMake('');
                  setFilterType('');
                  setFilterStatus('');
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
              {filteredUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                    No units found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnits.map((unit) => {
                  const mainPhoto = unit.photos.find(p => p.is_main) || unit.photos[0];
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
                        <Badge variant={unit.photos.length >= 4 ? 'secondary' : 'destructive'} className="text-xs">
                          {unit.photos.length} photos
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-xs">{unit.category}</TableCell>
                      <TableCell>{unit.year}</TableCell>
                      <TableCell className="text-sm">{unit.type}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {unit.vin_or_serial.substring(0, 10)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {unit.mileage ? unit.mileage.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">${unit.display_price.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(unit.status)}>{unit.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{unit.received_at}</TableCell>
                      <TableCell className="text-sm">{unit.listed_at || '-'}</TableCell>
                      <TableCell className="text-sm">{unit.sold_at || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
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
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </BackofficeLayout>
  );
}
