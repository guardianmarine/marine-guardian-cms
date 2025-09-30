import { useState } from 'react';
import { CSVImportWizard } from '@/components/purchasing/CSVImportWizard';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { usePurchasingStore } from '@/services/purchasingStore';
import { useInventoryStore } from '@/services/inventoryStore';
import { AcquisitionBatch, AcquisitionBatchStatus, ReceivingItem, Unit, Supplier, UnitPhoto } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Upload,
  Eye,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { mockLocation } from '@/services/mockData';

export default function AcquisitionBatches() {
  const { toast } = useToast();
  const {
    acquisitionBatches,
    addAcquisitionBatch,
    updateAcquisitionBatch,
    suppliers,
    receivingItems,
    addReceivingItem,
    updateReceivingItem,
    purchaseIntakes,
  } = usePurchasingStore();
  const { addUnit } = useInventoryStore();

  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<AcquisitionBatch | null>(null);
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  const [batchForm, setBatchForm] = useState({
    supplier_id: '',
    name_or_po: '',
    notes: '',
  });

  const handleCreateBatch = () => {
    if (!batchForm.supplier_id || !batchForm.name_or_po) {
      toast({
        title: 'Validation error',
        description: 'Supplier and batch name are required',
        variant: 'destructive',
      });
      return;
    }

    const newBatch: AcquisitionBatch = {
      id: Math.random().toString(36).substr(2, 9),
      supplier_id: batchForm.supplier_id,
      name_or_po: batchForm.name_or_po,
      status: 'planned',
      notes: batchForm.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addAcquisitionBatch(newBatch);
    toast({ title: 'Batch created', description: 'New acquisition batch added successfully' });
    setBatchDialogOpen(false);
    setBatchForm({ supplier_id: '', name_or_po: '', notes: '' });
  };

  const handleImportCSV = (batch: AcquisitionBatch) => {
    setSelectedBatch(batch);
    setImportWizardOpen(true);
  };

  const handleValidateAndConvert = (item: ReceivingItem) => {
    // Validate required fields
    if (!item.make || !item.year || !item.model || !item.vin_or_serial || !item.type) {
      toast({
        title: 'Validation failed',
        description: 'Required fields: make, year, model, VIN/serial, type',
        variant: 'destructive',
      });
      return;
    }

    const unitId = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    // Copy photos from condition_report to unit_photos if any
    const unitPhotos: UnitPhoto[] = [];
    if (item.condition_report.photos && item.condition_report.photos.length > 0) {
      item.condition_report.photos.forEach((photoUrl, idx) => {
        unitPhotos.push({
          id: Math.random().toString(36).substr(2, 9),
          unit_id: unitId,
          url: photoUrl,
          is_main: false, // None marked as main yet - inventory team will set later
          sort: idx,
          created_at: now,
          updated_at: now,
        });
      });
    }

    // Create draft unit from receiving item
    const newUnit: Unit = {
      id: unitId,
      category: item.category,
      make: item.make,
      year: item.year,
      model: item.model,
      color: item.color,
      mileage: item.mileage,
      engine: item.engine,
      transmission: item.transmission,
      vin_or_serial: item.vin_or_serial,
      axles: item.axles,
      type: item.type,
      hours: item.hours, // Keep hours internal
      display_price: 0, // Will be set later by inventory team
      status: 'draft',
      // Cost tracking from receiving
      cost_purchase: item.cost_purchase,
      cost_transport_in: item.cost_transport_in,
      cost_reconditioning: undefined, // Will be filled later if needed
      location_id: mockLocation.id,
      location: mockLocation,
      photos: unitPhotos,
      received_at: new Date().toISOString().split('T')[0],
      created_at: now,
      updated_at: now,
    };

    addUnit(newUnit);
    updateReceivingItem(item.id, { status: 'converted' });

    toast({
      title: 'Unit created',
      description: `Draft unit created with ${unitPhotos.length} photos. Add ${Math.max(0, 4 - unitPhotos.length)} more photos to publish.`,
    });
  };

  const getBatchItems = (batchId: string) => {
    return receivingItems.filter((item) => item.acquisition_batch_id === batchId);
  };

  const getStatusColor = (status: AcquisitionBatchStatus) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-500';
      case 'receiving':
        return 'bg-yellow-500';
      case 'received':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Acquisition Batches</h2>
            <p className="text-muted-foreground">Manage lots and receiving items</p>
          </div>
          <Button onClick={() => setBatchDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        </div>

        {/* Batches List */}
        <div className="grid gap-4">
          {acquisitionBatches.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No acquisition batches yet</p>
              </CardContent>
            </Card>
          ) : (
            acquisitionBatches.map((batch) => {
              const items = getBatchItems(batch.id);
              const pendingItems = items.filter((i) => i.status === 'pending').length;
              const convertedItems = items.filter((i) => i.status === 'converted').length;
              const supplier = suppliers.find((s) => s.id === batch.supplier_id);

              return (
                <Card key={batch.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold">{batch.name_or_po}</h3>
                          <Badge className={getStatusColor(batch.status)}>
                            {batch.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Supplier: {supplier?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created {formatDistanceToNow(new Date(batch.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImportCSV(batch)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import CSV/Excel
                        </Button>
                        <Select
                          value={batch.status}
                          onValueChange={(v) =>
                            updateAcquisitionBatch(batch.id, {
                              status: v as AcquisitionBatchStatus,
                            })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="receiving">Receiving</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{items.length}</div>
                        <div className="text-sm text-muted-foreground">Total Items</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{pendingItems}</div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{convertedItems}</div>
                        <div className="text-sm text-muted-foreground">Converted</div>
                      </div>
                    </div>

                    {/* Items Table */}
                    {items.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Unit</TableHead>
                            <TableHead>VIN/Serial</TableHead>
                            <TableHead>Photos</TableHead>
                            <TableHead>Costs</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => {
                            const hasRequired = item.make && item.year && item.model && item.vin_or_serial && item.type;
                            const photoCount = item.condition_report?.photos?.length || 0;
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      {item.year} {item.make} {item.model}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {item.category} - {item.type}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.vin_or_serial || (
                                      <span className="text-destructive">Missing</span>
                                    )}
                                    {!hasRequired && (
                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {photoCount > 0 ? (
                                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                      <ImageIcon className="h-3 w-3" />
                                      {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">No photos</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm space-y-1">
                                    <div>Purchase: ${item.cost_purchase.toLocaleString()}</div>
                                    <div>Transport: ${item.cost_transport_in.toLocaleString()}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={item.status === 'converted' ? 'default' : 'secondary'}
                                  >
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {item.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleValidateAndConvert(item)}
                                      disabled={!hasRequired}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Convert to Draft
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Create Batch Dialog */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Acquisition Batch</DialogTitle>
              <DialogDescription>Create a new lot for receiving units</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select
                  value={batchForm.supplier_id}
                  onValueChange={(v) => setBatchForm({ ...batchForm, supplier_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Batch Name / PO Number *</Label>
                <Input
                  value={batchForm.name_or_po}
                  onChange={(e) => setBatchForm({ ...batchForm, name_or_po: e.target.value })}
                  placeholder="Batch-2024-001 or PO#12345"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional information about this batch..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBatch}>Create Batch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Wizard */}
        {selectedBatch && (
          <CSVImportWizard
            open={importWizardOpen}
            onOpenChange={setImportWizardOpen}
            batch={selectedBatch}
          />
        )}
      </div>
    </BackofficeLayout>
  );
}
