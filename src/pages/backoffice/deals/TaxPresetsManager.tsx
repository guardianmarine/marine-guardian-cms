import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTaxPresets } from '@/hooks/useTaxPresets';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export default function TaxPresetsManager() {
  const { presets, loading, createPreset, updatePreset, deletePreset } = useTaxPresets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'percent' as 'percent' | 'fixed',
    rate: '',
    apply_scope: 'deal' as 'deal' | 'unit' | 'fee',
    is_default: false,
    is_active: true,
    notes: '',
  });

  const handleOpenDialog = (preset?: any) => {
    if (preset) {
      setEditingPreset(preset);
      setFormData({
        name: preset.name,
        type: preset.type,
        rate: preset.rate.toString(),
        apply_scope: preset.apply_scope,
        is_default: preset.is_default,
        is_active: preset.is_active,
        notes: preset.notes || '',
      });
    } else {
      setEditingPreset(null);
      setFormData({
        name: '',
        type: 'percent',
        rate: '',
        apply_scope: 'deal',
        is_default: false,
        is_active: true,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      ...formData,
      rate: parseFloat(formData.rate),
    };

    if (editingPreset) {
      await updatePreset(editingPreset.id, data);
    } else {
      await createPreset(data);
    }

    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deletePreset(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tax Presets</h1>
            <p className="text-muted-foreground mt-1">
              Manage tax rates, fees, and discounts for deals
            </p>
          </div>
          <Button type="button" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Preset
          </Button>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <Card key={preset.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{preset.name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      {preset.is_default && (
                        <Badge variant="default" className="text-xs">Default</Badge>
                      )}
                      <Badge
                        variant={preset.is_active ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {preset.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {preset.type === 'percent' ? 'Percentage' : 'Fixed'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(preset)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(preset.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-medium">
                      {preset.type === 'percent'
                        ? `${preset.rate}%`
                        : `$${preset.rate.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applies to:</span>
                    <span className="font-medium capitalize">{preset.apply_scope}</span>
                  </div>
                  {preset.notes && (
                    <p className="text-muted-foreground mt-2 text-xs">{preset.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {presets.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No tax presets found</p>
              <Button type="button" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Preset
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPreset ? 'Edit Preset' : 'New Tax Preset'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Texas Sales Tax"
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v: any) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rate">
                  {formData.type === 'percent' ? 'Rate (%)' : 'Amount ($)'}
                </Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  placeholder={formData.type === 'percent' ? '8.25' : '150.00'}
                />
              </div>

              <div>
                <Label htmlFor="scope">Applies To</Label>
                <Select
                  value={formData.apply_scope}
                  onValueChange={(v: any) => setFormData({ ...formData, apply_scope: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deal">Deal Total</SelectItem>
                    <SelectItem value="unit">Per Unit</SelectItem>
                    <SelectItem value="fee">As Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="default">Set as Default</Label>
                <Switch
                  id="default"
                  checked={formData.is_default}
                  onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tax Preset</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this tax preset? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </BackofficeLayout>
  );
}
