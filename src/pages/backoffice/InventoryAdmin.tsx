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
import { useInventoryStore } from '@/services/inventoryStore';
import { Plus, Search, Eye, Edit, CheckCircle, XCircle } from 'lucide-react';
import { UnitStatus } from '@/types';

export default function InventoryAdmin() {
  const navigate = useNavigate();
  const { units, publishUnit, unpublishUnit, canPublish } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      searchTerm === '' ||
      unit.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.vin_or_serial.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !filterCategory || unit.category === filterCategory;
    const matchesStatus = !filterStatus || unit.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
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
      alert(`Cannot publish:\n${validation.errors.join('\n')}`);
      return;
    }
    publishUnit(id, '1');
  };

  const handleQuickUnpublish = (id: string) => {
    unpublishUnit(id, '1');
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

        {/* Filters */}
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
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="truck">Trucks</SelectItem>
              <SelectItem value="trailer">Trailers</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Statuses" />
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
          {(searchTerm || filterCategory || filterStatus) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('');
                setFilterStatus('');
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>VIN/Serial</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No units found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <div className="font-medium">
                        {unit.make} {unit.model}
                      </div>
                      <div className="text-sm text-muted-foreground">{unit.type}</div>
                    </TableCell>
                    <TableCell className="capitalize">{unit.category}</TableCell>
                    <TableCell>{unit.year}</TableCell>
                    <TableCell className="font-mono text-sm">{unit.vin_or_serial}</TableCell>
                    <TableCell>
                      <Badge variant={unit.photos.length >= 4 ? 'default' : 'destructive'}>
                        {unit.photos.length} photos
                      </Badge>
                    </TableCell>
                    <TableCell>${unit.display_price.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(unit.status)}>{unit.status}</Badge>
                    </TableCell>
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
                        {unit.status === 'published' ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleQuickUnpublish(unit.id)}
                            title="Unpublish"
                          >
                            <XCircle className="h-4 w-4 text-orange-600" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleQuickPublish(unit.id)}
                            title="Publish"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </BackofficeLayout>
  );
}
