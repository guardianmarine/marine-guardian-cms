import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDeals, Deal } from '@/hooks/useDeals';
import { useDealUnits } from '@/hooks/useDealUnits';
import { useDealFees } from '@/hooks/useDealFees';
import { useTaxPresets } from '@/hooks/useTaxPresets';
import { supabase } from '@/integrations/supabase/client';
import { Unit } from '@/types';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  FileText,
  DollarSign,
} from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type DealStatus = 'draft' | 'quoted' | 'won' | 'lost' | 'invoiced' | 'delivered' | 'cancelled';

export default function DealDetailEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { deals, loading: dealsLoading, createDeal, updateDeal } = useDeals();
  const { units, addUnit, updateUnitPrice, removeUnit } = useDealUnits(id);
  const { fees, addFee, updateFee, removeFee } = useDealFees(id);
  const { presets } = useTaxPresets();

  const isNew = id === 'new';
  const currentDeal = useMemo(() => deals.find(d => d.id === id), [deals, id]);

  // Form state
  const [status, setStatus] = useState<DealStatus>('draft');
  const [notes, setNotes] = useState('');
  const [billTo, setBillTo] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
  });

  // Unit selection dialog
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [unitPrice, setUnitPrice] = useState('');

  // Fee dialog
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({
    kind: 'other' as any,
    label: '',
    amount: '',
    taxable: false,
  });

  // Tax preset dialog
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);

  useEffect(() => {
    if (currentDeal && !isNew) {
      setStatus(currentDeal.status as DealStatus);
      setNotes(currentDeal.notes || '');
      if (currentDeal.bill_to) {
        setBillTo(currentDeal.bill_to as any);
      }
    }
  }, [currentDeal, isNew]);

  // Load available units
  useEffect(() => {
    const loadUnits = async () => {
      const { data } = await supabase
        .from('units')
        .select('*')
        .in('status', ['published', 'ready'])
        .order('year', { ascending: false });
      
      setAvailableUnits(data || []);
    };
    loadUnits();
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = units.reduce((sum, u) => sum + u.price, 0);
    
    const discounts = fees
      .filter(f => f.kind === 'discount')
      .reduce((sum, f) => sum + f.amount, 0);
    
    const regularFees = fees
      .filter(f => f.kind !== 'discount' && f.kind !== 'tax')
      .reduce((sum, f) => sum + f.amount, 0);
    
    const taxBase = subtotal - Math.abs(discounts) + fees.filter(f => f.taxable && f.kind !== 'tax').reduce((s, f) => s + f.amount, 0);
    
    const taxes = fees
      .filter(f => f.kind === 'tax')
      .reduce((sum, f) => sum + f.amount, 0);
    
    const total = subtotal + regularFees + taxes - Math.abs(discounts);

    return {
      subtotal,
      discounts_total: -Math.abs(discounts),
      fees_total: regularFees,
      tax_total: taxes,
      total_due: total,
      commission_base: total,
    };
  }, [units, fees]);

  const handleSave = async () => {
    if (!user) return;

    try {
      const dealData = {
        sales_rep_id: user.id,
        status,
        currency: 'USD',
        subtotal: totals.subtotal,
        discounts_total: totals.discounts_total,
        fees_total: totals.fees_total,
        tax_total: totals.tax_total,
        total_due: totals.total_due,
        commission_base: totals.commission_base,
        bill_to: billTo,
        notes,
      };

      if (isNew) {
        const newDeal = await createDeal(dealData);
        toast({
          title: 'Success',
          description: 'Deal created successfully',
        });
        navigate(`/backoffice/deals-v2/${newDeal.id}`);
      } else if (id) {
        await updateDeal(id, dealData);
        toast({
          title: 'Success',
          description: 'Deal updated successfully',
        });
      }
    } catch (error) {
      console.error('Error saving deal:', error);
    }
  };

  const handleAddUnit = async () => {
    if (!selectedUnit || !unitPrice || !id || isNew) return;

    try {
      await addUnit(id, selectedUnit, parseFloat(unitPrice));
      setUnitDialogOpen(false);
      setSelectedUnit(null);
      setUnitPrice('');
    } catch (error) {
      console.error('Error adding unit:', error);
    }
  };

  const handleAddFee = async () => {
    if (!id || isNew) return;

    try {
      await addFee(id, {
        kind: feeForm.kind,
        label: feeForm.label,
        amount: parseFloat(feeForm.amount),
        taxable: feeForm.taxable,
        sort_order: fees.length,
      });
      setFeeDialogOpen(false);
      setFeeForm({ kind: 'other', label: '', amount: '', taxable: false });
    } catch (error) {
      console.error('Error adding fee:', error);
    }
  };

  const handleAddPreset = async (presetId: string) => {
    if (!id || isNew) return;

    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    try {
      let amount = preset.rate;
      if (preset.type === 'percent') {
        // Calculate percentage of subtotal
        const base = totals.subtotal - Math.abs(totals.discounts_total);
        amount = base * (preset.rate / 100);
      }

      await addFee(id, {
        kind: 'tax',
        label: preset.name,
        amount,
        taxable: false,
        sort_order: fees.length,
      });
      setPresetDialogOpen(false);
    } catch (error) {
      console.error('Error adding preset:', error);
    }
  };

  if (dealsLoading && !isNew) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/backoffice/deals-v2">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">
                {isNew ? 'New Deal' : `Deal #${id?.slice(0, 8).toUpperCase()}`}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isNew && units.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Info */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="invoiced">Invoiced</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bill To */}
            <Card>
              <CardHeader>
                <CardTitle>Bill To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={billTo.company}
                      onChange={(e) => setBillTo({ ...billTo, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label>Contact</Label>
                    <Input
                      value={billTo.contact}
                      onChange={(e) => setBillTo({ ...billTo, contact: e.target.value })}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={billTo.email}
                      onChange={(e) => setBillTo({ ...billTo, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={billTo.phone}
                      onChange={(e) => setBillTo({ ...billTo, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Units */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Units ({units.length})</CardTitle>
                  <Button
                    onClick={() => setUnitDialogOpen(true)}
                    disabled={isNew}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Unit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {units.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {isNew ? 'Save the deal first to add units' : 'No units added yet'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {units.map((unit) => (
                      <div key={unit.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">
                            {unit.unit_snapshot.year} {unit.unit_snapshot.make} {unit.unit_snapshot.model}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            VIN: {unit.unit_snapshot.vin_or_serial}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <Label className="text-xs">Price</Label>
                            <Input
                              type="number"
                              value={unit.price}
                              onChange={(e) => updateUnitPrice(unit.id, parseFloat(e.target.value))}
                              className="w-32"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUnit(unit.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fees & Taxes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Fees & Taxes</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPresetDialogOpen(true)}
                      disabled={isNew}
                      size="sm"
                      variant="outline"
                    >
                      Add from Preset
                    </Button>
                    <Button
                      onClick={() => setFeeDialogOpen(true)}
                      disabled={isNew}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {fees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No fees or taxes added
                  </p>
                ) : (
                  <div className="space-y-2">
                    {fees.map((fee) => (
                      <div key={fee.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{fee.label}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {fee.kind}
                            </Badge>
                            {fee.taxable && (
                              <Badge variant="secondary" className="text-xs">
                                Taxable
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">
                            ${fee.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFee(fee.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Totals */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">
                    ${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {totals.discounts_total < 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Discounts:</span>
                    <span>
                      ${totals.discounts_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {totals.fees_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fees:</span>
                    <span>
                      ${totals.fees_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {totals.tax_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxes:</span>
                    <span>
                      ${totals.tax_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Due:</span>
                    <span>
                      ${totals.total_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isNew && status !== 'draft' && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                  <Button className="w-full" variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Unit Selection Dialog */}
        <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Unit to Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableUnits.map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedUnit?.id === unit.id
                        ? 'border-primary bg-accent'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <p className="font-medium">
                      {unit.year} {unit.make} {unit.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      VIN: {unit.vin_or_serial}
                    </p>
                    <p className="text-sm mt-1">
                      Display Price: ${unit.display_price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {selectedUnit && (
                <div>
                  <Label>Deal Price</Label>
                  <Input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="Enter price for this deal"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUnit} disabled={!selectedUnit || !unitPrice}>
                Add Unit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fee Dialog */}
        <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Fee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={feeForm.kind}
                  onValueChange={(v: any) => setFeeForm({ ...feeForm, kind: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doc">Doc Fee</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="temp_plate">Temp Plate</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Label</Label>
                <Input
                  value={feeForm.label}
                  onChange={(e) => setFeeForm({ ...feeForm, label: e.target.value })}
                  placeholder="Fee description"
                />
              </div>

              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="taxable"
                  checked={feeForm.taxable}
                  onChange={(e) => setFeeForm({ ...feeForm, taxable: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="taxable">Taxable</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFee} disabled={!feeForm.label || !feeForm.amount}>
                Add Fee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tax Preset Dialog */}
        <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Tax Preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {presets.filter(p => p.is_active).map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleAddPreset(preset.id)}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{preset.name}</p>
                      {preset.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{preset.notes}</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {preset.type === 'percent' ? `${preset.rate}%` : `$${preset.rate.toFixed(2)}`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </BackofficeLayout>
  );
}
