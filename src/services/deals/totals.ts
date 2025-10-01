import { supabase } from '@/integrations/supabase/client';

interface TaxPresetRule {
  id: string;
  kind: 'tax' | 'fee';
  label: string;
  formula: 'flat' | 'rate' | 'override';
  value: number;
  enabledBy: string[];
  base?: 'units_subtotal' | 'taxable_fees';
}

interface TaxPresetRules {
  lines: TaxPresetRule[];
}

interface DealTotalsInput {
  dealId: string;
  switches: Record<string, boolean>;
}

interface DealTotalsOutput {
  subtotal: number;
  taxes: Array<{ label: string; amount: number }>;
  fees: Array<{ label: string; amount: number }>;
  discounts: Array<{ label: string; amount: number }>;
  total: number;
}

/**
 * Compute real-time deal totals based on units, fees, and tax preset rules
 */
export async function computeDealTotals(
  input: DealTotalsInput
): Promise<DealTotalsOutput> {
  const { dealId, switches } = input;

  // 1. Fetch deal units
  const { data: dealUnits } = await supabase
    .from('deal_units')
    .select('price')
    .eq('deal_id', dealId);

  const subtotal = (dealUnits || []).reduce((sum, unit) => sum + (unit.price || 0), 0);

  // 2. Fetch existing deal fees
  const { data: dealFees } = await supabase
    .from('deal_fees')
    .select('*')
    .eq('deal_id', dealId);

  const existingFees = dealFees || [];

  // 3. Fetch active tax presets with rules
  const { data: taxPresets } = await supabase
    .from('tax_presets')
    .select('*')
    .eq('is_active', true);

  // 4. Apply tax preset rules based on switches
  const taxes: Array<{ label: string; amount: number }> = [];
  const fees: Array<{ label: string; amount: number }> = [];
  const discounts: Array<{ label: string; amount: number }> = [];

  for (const preset of taxPresets || []) {
    if (!preset.rules) continue;

    const rules = preset.rules as TaxPresetRules;
    for (const rule of rules.lines) {
      // Check if this rule is enabled by any active switch
      const isEnabled = rule.enabledBy.some((sw) => switches[sw]);
      if (!isEnabled) continue;

      let amount = 0;

      if (rule.formula === 'flat') {
        amount = rule.value;
      } else if (rule.formula === 'rate') {
        // Calculate tax base
        let taxBase = 0;
        if (rule.base === 'units_subtotal') {
          taxBase = subtotal;
        } else if (rule.base === 'taxable_fees') {
          taxBase = existingFees
            .filter((f) => f.taxable)
            .reduce((sum, f) => sum + f.amount, 0);
        }
        amount = taxBase * rule.value;
      } else if (rule.formula === 'override') {
        amount = rule.value;
      }

      if (rule.kind === 'tax') {
        taxes.push({ label: rule.label, amount: Math.round(amount * 100) / 100 });
      } else if (rule.kind === 'fee') {
        fees.push({ label: rule.label, amount: Math.round(amount * 100) / 100 });
      }
    }
  }

  // 5. Add existing fees from deal_fees
  for (const fee of existingFees) {
    if (fee.kind === 'discount') {
      discounts.push({ label: fee.label, amount: fee.amount });
    } else {
      fees.push({ label: fee.label, amount: fee.amount });
    }
  }

  // 6. Calculate total
  const feesTotal = fees.reduce((sum, f) => sum + f.amount, 0);
  const taxesTotal = taxes.reduce((sum, t) => sum + t.amount, 0);
  const discountsTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
  const total = subtotal + feesTotal + taxesTotal + discountsTotal;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxes,
    fees,
    discounts,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Save computed totals to the deal record
 */
export async function saveDealTotals(dealId: string, totals: DealTotalsOutput) {
  const feesTotal = totals.fees.reduce((sum, f) => sum + f.amount, 0);
  const taxTotal = totals.taxes.reduce((sum, t) => sum + t.amount, 0);
  const discountsTotal = totals.discounts.reduce((sum, d) => sum + d.amount, 0);

  await supabase
    .from('deals')
    .update({
      subtotal: totals.subtotal,
      fees_total: feesTotal,
      tax_total: taxTotal,
      discounts_total: discountsTotal,
      total_due: totals.total,
      commission_base: totals.subtotal + feesTotal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId);
}
