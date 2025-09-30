import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDealsStore } from '@/services/dealsStore';
import { Settings, Check, X, Edit2 } from 'lucide-react';
import { Deal, DealFee } from '@/types';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface TaxFeesPanelProps {
  deal: Deal;
  onApply: () => void;
}

export function TaxFeesPanel({ deal, onApply }: TaxFeesPanelProps) {
  const {
    taxRegimes,
    getActiveTaxRule,
    getTaxRuleLines,
    getDealFees,
    updateDealFee,
    applyTaxRule,
    updateDeal,
  } = useDealsStore();

  const [selectedRegimeId, setSelectedRegimeId] = useState<string>(deal.tax_rule_version_id?.split('-')[0] || '');
  const [outOfState, setOutOfState] = useState(false);
  const [resaleCert, setResaleCert] = useState(false);
  const [tempPlate, setTempPlate] = useState(false);
  const [tagType, setTagType] = useState<'combo' | 'apportioned'>('combo');
  const [previewFees, setPreviewFees] = useState<Array<DealFee & { preview?: boolean }>>([]);
  const [editingFee, setEditingFee] = useState<DealFee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRate, setEditRate] = useState('');
  const [editApplies, setEditApplies] = useState(true);

  const appliedFees = getDealFees(deal.id);

  // Calculate preview when settings change
  useEffect(() => {
    if (!selectedRegimeId) {
      setPreviewFees([]);
      return;
    }

    const activeRule = getActiveTaxRule(selectedRegimeId);
    if (!activeRule) {
      setPreviewFees([]);
      return;
    }

    const ruleLines = getTaxRuleLines(activeRule.id);
    const vehicleSubtotal = deal.vehicle_subtotal;

    const conditions = {
      out_of_state: outOfState,
      resale_cert: resaleCert,
      temp_plate: tempPlate,
      tag: tagType,
    };

    // Filter and calculate applicable lines
    const applicableLines = ruleLines
      .filter((line) => {
        if (!line.conditions) return true;
        
        // Check if all conditions match
        return Object.entries(line.conditions).every(([key, value]) => {
          return conditions[key as keyof typeof conditions] === value;
        });
      })
      .sort((a, b) => a.sort - b.sort);

    const calculatedFees: Array<DealFee & { preview: boolean }> = applicableLines.map((line) => {
      let resultAmount = 0;
      if (line.calc_type === 'percent' && line.base === 'vehicle_subtotal') {
        resultAmount = (vehicleSubtotal * line.rate_or_amount) / 100;
      } else if (line.calc_type === 'fixed') {
        resultAmount = line.rate_or_amount;
      }

      return {
        id: `preview-${line.id}`,
        deal_id: deal.id,
        name: line.name,
        calc_type: line.calc_type,
        base: line.base,
        rate_or_amount: line.rate_or_amount,
        result_amount: resultAmount,
        applies: true,
        meta: { conditions: line.conditions },
        sort: line.sort,
        preview: true,
      };
    });

    setPreviewFees(calculatedFees);
  }, [selectedRegimeId, outOfState, resaleCert, tempPlate, tagType, deal.vehicle_subtotal]);

  const handleApply = () => {
    if (!selectedRegimeId) return;

    const activeRule = getActiveTaxRule(selectedRegimeId);
    if (!activeRule) return;

    // Store metadata in deal
    updateDeal(deal.id, {
      tax_rule_version_id: activeRule.id,
      // Store conditions as JSON in a metadata field if needed
    });

    // Apply the rule with current conditions
    applyTaxRule(deal.id, activeRule.id);
    
    onApply();
  };

  const handleEditFee = (fee: DealFee) => {
    setEditingFee(fee);
    setEditRate(fee.rate_or_amount.toString());
    setEditApplies(fee.applies);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingFee) return;

    const newRate = parseFloat(editRate);
    if (isNaN(newRate)) return;

    let resultAmount = 0;
    if (editingFee.calc_type === 'percent' && editingFee.base === 'vehicle_subtotal') {
      resultAmount = (deal.vehicle_subtotal * newRate) / 100;
    } else if (editingFee.calc_type === 'fixed') {
      resultAmount = newRate;
    }

    updateDealFee(editingFee.id, {
      rate_or_amount: newRate,
      result_amount: resultAmount,
      applies: editApplies,
      meta: {
        ...editingFee.meta,
        overridden_by: 'user-1', // Current user
        overridden_at: new Date().toISOString(),
      },
    });

    setEditDialogOpen(false);
    setEditingFee(null);
  };

  const taxesTotal = (appliedFees.length > 0 ? appliedFees : previewFees)
    .filter((f) => f.applies && (f.name.toLowerCase().includes('tax') || f.name.toLowerCase().includes('sales')))
    .reduce((sum, f) => sum + f.result_amount, 0);

  const feesTotal = (appliedFees.length > 0 ? appliedFees : previewFees)
    .filter((f) => f.applies && !f.name.toLowerCase().includes('tax') && !f.name.toLowerCase().includes('sales'))
    .reduce((sum, f) => sum + f.result_amount, 0);

  const displayFees = appliedFees.length > 0 ? appliedFees : previewFees;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Taxes & Fees Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Selector */}
          <div className="space-y-2">
            <Label>Tax Regime</Label>
            <Select value={selectedRegimeId} onValueChange={setSelectedRegimeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tax regime" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {taxRegimes.filter((r) => r.active).map((regime) => (
                  <SelectItem key={regime.id} value={regime.id}>
                    {regime.name} ({regime.jurisdiction})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition Toggles */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Deal Conditions</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="out-of-state" className="cursor-pointer">
                Out of State
              </Label>
              <Switch
                id="out-of-state"
                checked={outOfState}
                onCheckedChange={setOutOfState}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="resale-cert" className="cursor-pointer">
                Resale Certificate
              </Label>
              <Switch
                id="resale-cert"
                checked={resaleCert}
                onCheckedChange={setResaleCert}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="temp-plate" className="cursor-pointer">
                Temp Plate
              </Label>
              <Switch
                id="temp-plate"
                checked={tempPlate}
                onCheckedChange={setTempPlate}
              />
            </div>

            <div className="space-y-2">
              <Label>Tag Type</Label>
              <Select value={tagType} onValueChange={(v) => setTagType(v as 'combo' | 'apportioned')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="combo">Combo (Standard)</SelectItem>
                  <SelectItem value="apportioned">Apportioned (IRP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview / Applied Fees */}
          {displayFees.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {appliedFees.length > 0 ? 'Applied' : 'Preview'} Line Items
                </h4>
                {appliedFees.length > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="h-3 w-3 mr-1" />
                    Applied
                  </Badge>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    {appliedFees.length > 0 && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayFees.map((fee) => (
                    <TableRow key={fee.id} className={!fee.applies ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">
                        {fee.name}
                        {fee.meta?.overridden_by && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Modified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {fee.base.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {fee.calc_type === 'percent'
                          ? `${fee.rate_or_amount}%`
                          : `$${fee.rate_or_amount.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {fee.applies ? (
                          `$${fee.result_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      {appliedFees.length > 0 && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFee(fee)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxes Total:</span>
                  <span className="font-semibold">
                    ${taxesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fees Total:</span>
                  <span className="font-semibold">
                    ${feesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Combined Total:</span>
                  <span>
                    ${(taxesTotal + feesTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Apply Button */}
          {previewFees.length > 0 && appliedFees.length === 0 && (
            <Button onClick={handleApply} className="w-full" disabled={!selectedRegimeId}>
              Apply Tax Rule
            </Button>
          )}

          {appliedFees.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Tax rule applied. Modify individual line items or reselect regime to recalculate.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Fee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Fee: {editingFee?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>
                {editingFee?.calc_type === 'percent' ? 'Percentage' : 'Amount ($)'}
              </Label>
              <Input
                type="number"
                step={editingFee?.calc_type === 'percent' ? '0.01' : '0.01'}
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-applies" className="cursor-pointer">
                Apply this fee
              </Label>
              <Switch
                id="edit-applies"
                checked={editApplies}
                onCheckedChange={setEditApplies}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This override will be tracked in the fee metadata.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
