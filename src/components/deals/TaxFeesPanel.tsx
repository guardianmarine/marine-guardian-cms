import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDealsStore } from '@/services/dealsStore';
import { Settings, Check, Edit2, AlertCircle } from 'lucide-react';
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
  const { t } = useTranslation();
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
    <TooltipProvider>
      <Card className="bg-white border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-gray-50 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            {t('deals.taxFeesConfig')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Preset Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">{t('deals.taxRegimes')}</Label>
            <Select value={selectedRegimeId} onValueChange={setSelectedRegimeId}>
              <SelectTrigger className="bg-white border-gray-200">
                <SelectValue placeholder={t('deals.selectTaxRegime')} />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
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
            <h4 className="font-semibold text-sm text-foreground">{t('deals.dealConditions')}</h4>
            
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <Label htmlFor="out-of-state" className="cursor-pointer font-medium">
                {t('deals.outOfState')}
              </Label>
              <Switch
                id="out-of-state"
                checked={outOfState}
                onCheckedChange={setOutOfState}
              />
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <Label htmlFor="resale-cert" className="cursor-pointer font-medium">
                {t('deals.resaleCertificate')}
              </Label>
              <Switch
                id="resale-cert"
                checked={resaleCert}
                onCheckedChange={setResaleCert}
              />
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <Label htmlFor="temp-plate" className="cursor-pointer font-medium">
                {t('deals.tempPlate')}
              </Label>
              <Switch
                id="temp-plate"
                checked={tempPlate}
                onCheckedChange={setTempPlate}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">{t('deals.tagType')}</Label>
              <Select value={tagType} onValueChange={(v) => setTagType(v as 'combo' | 'apportioned')}>
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="combo">{t('deals.tagCombo')}</SelectItem>
                  <SelectItem value="apportioned">{t('deals.tagApportioned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview / Applied Fees */}
          {displayFees.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground">
                  {appliedFees.length > 0 ? t('deals.appliedLineItems') : t('deals.previewLineItems')}
                </h4>
                {appliedFees.length > 0 && (
                  <Badge className="bg-green-50 text-green-700 border-green-200 border">
                    <Check className="h-3 w-3 mr-1" />
                    {t('deals.applied')}
                  </Badge>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">{t('deals.name')}</TableHead>
                      <TableHead className="font-semibold">{t('deals.base')}</TableHead>
                      <TableHead className="font-semibold">{t('deals.rate')}</TableHead>
                      <TableHead className="font-semibold">{t('deals.amount')}</TableHead>
                      {appliedFees.length > 0 && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayFees.map((fee) => (
                      <TableRow key={fee.id} className={!fee.applies ? 'opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50'}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {fee.name}
                            {fee.meta?.overridden_by && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {t('deals.overridden')}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border-gray-200">
                                  <p className="text-sm">{t('deals.overrideTooltip')}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs capitalize text-muted-foreground">
                          {fee.base.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {fee.calc_type === 'percent'
                            ? `${fee.rate_or_amount}%`
                            : `$${fee.rate_or_amount.toFixed(2)}`}
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
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
                              className="hover:bg-blue-50"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Card */}
              <Card className="bg-gradient-to-br from-blue-50 to-gray-50 border-2 border-blue-100">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('deals.taxesTotal')}:</span>
                    <span className="font-semibold text-gray-900">
                      ${taxesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('deals.feesTotal')}:</span>
                    <span className="font-semibold text-gray-900">
                      ${feesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t-2 border-blue-200 pt-2">
                    <span className="text-gray-900">{t('deals.combinedTotal')}:</span>
                    <span className="text-blue-600">
                      ${(taxesTotal + feesTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Apply Button */}
          {previewFees.length > 0 && appliedFees.length === 0 && (
            <Button 
              onClick={handleApply} 
              className="w-full bg-primary hover:bg-primary/90" 
              disabled={!selectedRegimeId}
            >
              {t('deals.applyTaxRule')}
            </Button>
          )}

          {appliedFees.length > 0 && (
            <div className="text-sm text-muted-foreground text-center bg-blue-50 p-3 rounded-lg">
              {t('deals.ruleAppliedNote')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Fee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{t('deals.overrideFee')}: {editingFee?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="font-semibold">
                {editingFee?.calc_type === 'percent' ? t('deals.percentage') : t('deals.amount')}
              </Label>
              <Input
                type="number"
                step={editingFee?.calc_type === 'percent' ? '0.01' : '0.01'}
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                className="bg-white border-gray-200"
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
              <Label htmlFor="edit-applies" className="cursor-pointer font-medium">
                {t('deals.applyThisFee')}
              </Label>
              <Switch
                id="edit-applies"
                checked={editApplies}
                onCheckedChange={setEditApplies}
              />
            </div>
            <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
              {t('deals.overrideTracked')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} className="bg-primary">
              {t('deals.saveOverride')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
