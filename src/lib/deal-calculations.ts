export type DealCalcInput = {
  unitPrices: number[];
  fees: { 
    kind: 'tax' | 'temp_plate' | 'transport' | 'doc' | 'discount' | 'other'; 
    amount: number; 
    taxable: boolean; 
  }[];
  taxPercentPresets: number[];  // e.g., 0.0825 for 8.25%
  taxFixedPresets: number[];    // fixed amounts in USD
};

export type DealTotals = {
  subtotal: number;
  discounts_total: number; // negative
  fees_total: number;
  tax_total: number;
  total_due: number;
  commission_base: number;
};

/**
 * Calculate deal totals from unit prices, fees, and tax presets
 */
export function calculateDealTotals(input: DealCalcInput): DealTotals {
  // Subtotal = sum of all unit prices
  const subtotal = round(input.unitPrices.reduce((sum, price) => sum + price, 0));

  // Discounts = sum of all fees with kind='discount' (treat as negative)
  const discounts_total = round(
    -Math.abs(
      input.fees
        .filter(f => f.kind === 'discount')
        .reduce((sum, f) => sum + Math.abs(f.amount), 0)
    )
  );

  // Fees = sum of all fees excluding tax and discount kinds
  const fees_total = round(
    input.fees
      .filter(f => f.kind !== 'tax' && f.kind !== 'discount')
      .reduce((sum, f) => sum + f.amount, 0)
  );

  // Tax base = subtotal + discounts + taxable fees
  const taxableFees = input.fees
    .filter(f => f.kind !== 'tax' && f.kind !== 'discount' && f.taxable)
    .reduce((sum, f) => sum + f.amount, 0);
  
  const taxBase = subtotal + discounts_total + taxableFees;

  // Calculate tax from percent presets
  const percentTax = input.taxPercentPresets.reduce(
    (sum, rate) => sum + (taxBase * rate),
    0
  );

  // Calculate tax from fixed presets
  const fixedTax = input.taxFixedPresets.reduce(
    (sum, amount) => sum + amount,
    0
  );

  // Tax from fees with kind='tax'
  const explicitTax = input.fees
    .filter(f => f.kind === 'tax')
    .reduce((sum, f) => sum + f.amount, 0);

  const tax_total = round(percentTax + fixedTax + explicitTax);

  // Total due
  const total_due = round(subtotal + discounts_total + fees_total + tax_total);

  // Commission base (for now = total_due)
  const commission_base = total_due;

  return {
    subtotal,
    discounts_total,
    fees_total,
    tax_total,
    total_due,
    commission_base,
  };
}

/**
 * Round to 2 decimal places
 */
function round(num: number): number {
  return Math.round(num * 100) / 100;
}
