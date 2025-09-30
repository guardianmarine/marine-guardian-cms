import { 
  TaxRegime, 
  TaxRule, 
  TaxRuleLine, 
  Deal, 
  DealUnit, 
  DealFee, 
  Payment, 
  Commission 
} from '@/types';

// Tax Regimes
export const mockTaxRegimes: TaxRegime[] = [
  {
    id: 'regime-1',
    name: 'TX Combo',
    jurisdiction: 'TX',
    active: true,
  },
  {
    id: 'regime-2',
    name: 'TX Apportioned',
    jurisdiction: 'TX',
    active: true,
  },
  {
    id: 'regime-3',
    name: 'Out-of-State',
    jurisdiction: 'TX',
    active: true,
  },
  {
    id: 'regime-4',
    name: 'Wholesale',
    jurisdiction: 'TX',
    active: true,
  },
];

// Tax Rules (versioned presets)
export const mockTaxRules: TaxRule[] = [
  {
    id: 'rule-1',
    tax_regime_id: 'regime-1',
    version: 1,
    effective_from: '2025-01-01',
    effective_to: undefined,
    is_active: true,
  },
  {
    id: 'rule-2',
    tax_regime_id: 'regime-2',
    version: 1,
    effective_from: '2025-01-01',
    effective_to: undefined,
    is_active: true,
  },
  {
    id: 'rule-3',
    tax_regime_id: 'regime-3',
    version: 1,
    effective_from: '2025-01-01',
    effective_to: undefined,
    is_active: true,
  },
  {
    id: 'rule-4',
    tax_regime_id: 'regime-4',
    version: 1,
    effective_from: '2025-01-01',
    effective_to: undefined,
    is_active: true,
  },
];

// Tax Rule Lines - Realistic Texas Tax & Fee Scenarios
export const mockTaxRuleLines: TaxRuleLine[] = [
  // TX Combo (standard combination registration)
  {
    id: 'line-1',
    tax_rule_id: 'rule-1',
    name: 'Sales Tax (TX)',
    calc_type: 'percent',
    base: 'vehicle_subtotal',
    rate_or_amount: 6.25,
    conditions: { out_of_state: false, resale_cert: false },
    sort: 1,
  },
  {
    id: 'line-2',
    tax_rule_id: 'rule-1',
    name: 'Title Application Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 33.00,
    conditions: undefined,
    sort: 2,
  },
  {
    id: 'line-3',
    tax_rule_id: 'rule-1',
    name: 'State Highway Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 1.00,
    conditions: undefined,
    sort: 3,
  },
  {
    id: 'line-4',
    tax_rule_id: 'rule-1',
    name: 'Registration Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 68.50,
    conditions: { tag: 'combo' },
    sort: 4,
  },
  {
    id: 'line-5',
    tax_rule_id: 'rule-1',
    name: 'Temp Plate Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 25.00,
    conditions: { temp_plate: true },
    sort: 5,
  },
  
  // TX Apportioned (IRP - International Registration Plan)
  {
    id: 'line-10',
    tax_rule_id: 'rule-2',
    name: 'Sales Tax (TX)',
    calc_type: 'percent',
    base: 'vehicle_subtotal',
    rate_or_amount: 6.25,
    conditions: { out_of_state: false, resale_cert: false },
    sort: 1,
  },
  {
    id: 'line-11',
    tax_rule_id: 'rule-2',
    name: 'Title Application Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 33.00,
    conditions: undefined,
    sort: 2,
  },
  {
    id: 'line-12',
    tax_rule_id: 'rule-2',
    name: 'State Highway Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 1.00,
    conditions: undefined,
    sort: 3,
  },
  {
    id: 'line-13',
    tax_rule_id: 'rule-2',
    name: 'IRP Apportioned Registration',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 250.00,
    conditions: { tag: 'apportioned' },
    sort: 4,
  },
  {
    id: 'line-14',
    tax_rule_id: 'rule-2',
    name: 'IFTA Decals',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 10.00,
    conditions: { tag: 'apportioned' },
    sort: 5,
  },
  
  // Out-of-State (buyer handles registration elsewhere)
  {
    id: 'line-20',
    tax_rule_id: 'rule-3',
    name: 'Title Application Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 33.00,
    conditions: { out_of_state: true },
    sort: 1,
  },
  {
    id: 'line-21',
    tax_rule_id: 'rule-3',
    name: 'Temp Transit Permit',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 25.00,
    conditions: { out_of_state: true, temp_plate: true },
    sort: 2,
  },
  {
    id: 'line-22',
    tax_rule_id: 'rule-3',
    name: 'Documentation Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 150.00,
    conditions: { out_of_state: true },
    sort: 3,
  },
  
  // Wholesale (dealer-to-dealer with resale certificate)
  {
    id: 'line-30',
    tax_rule_id: 'rule-4',
    name: 'Dealer Processing Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 100.00,
    conditions: { resale_cert: true },
    sort: 1,
  },
  {
    id: 'line-31',
    tax_rule_id: 'rule-4',
    name: 'Title Transfer Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 33.00,
    conditions: { resale_cert: true },
    sort: 2,
  },
];

// Sample Deals
export const mockDeals: Deal[] = [
  {
    id: 'deal-1',
    opportunity_id: 'opp-1',
    account_id: 'acc-1',
    sales_rep_id: 'user-2',
    status: 'issued',
    currency: 'USD',
    vehicle_subtotal: 45000.00,
    discounts_total: 0,
    taxes_total: 2812.50,
    fees_total: 126.50,
    total_due: 47939.00,
    amount_paid: 0,
    balance_due: 47939.00,
    tax_rule_version_id: 'rule-1',
    issued_at: '2025-09-25T10:00:00Z',
    delivered_at: undefined,
    closed_at: undefined,
    created_at: '2025-09-24T14:30:00Z',
    updated_at: '2025-09-25T10:00:00Z',
  },
];

// Sample Deal Units
export const mockDealUnits: DealUnit[] = [
  {
    deal_id: 'deal-1',
    unit_id: 'unit-1',
    agreed_unit_price: 45000.00,
  },
];

// Sample Deal Fees (generated from tax rule)
export const mockDealFees: DealFee[] = [
  {
    id: 'fee-1',
    deal_id: 'deal-1',
    name: 'Sales Tax',
    calc_type: 'percent',
    base: 'vehicle_subtotal',
    rate_or_amount: 6.25,
    result_amount: 2812.50,
    applies: true,
    meta: undefined,
    sort: 1,
  },
  {
    id: 'fee-2',
    deal_id: 'deal-1',
    name: 'Title Fee',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 33.00,
    result_amount: 33.00,
    applies: true,
    meta: undefined,
    sort: 2,
  },
  {
    id: 'fee-3',
    deal_id: 'deal-1',
    name: 'Registration',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 68.50,
    result_amount: 68.50,
    applies: true,
    meta: undefined,
    sort: 3,
  },
  {
    id: 'fee-4',
    deal_id: 'deal-1',
    name: 'Temp Plate',
    calc_type: 'fixed',
    base: 'custom',
    rate_or_amount: 25.00,
    result_amount: 25.00,
    applies: true,
    meta: undefined,
    sort: 4,
  },
];

// Sample Payments
export const mockPayments: Payment[] = [];

// Sample Commissions
export const mockCommissions: Commission[] = [
  {
    id: 'comm-1',
    deal_id: 'deal-1',
    sales_rep_id: 'user-2',
    basis: 'net',
    percent: 3.00,
    flat_amount: undefined,
    calculated_amount: 1350.00, // 3% of vehicle_subtotal
    status: 'accrued',
    paid_at: undefined,
    note: undefined,
    created_at: '2025-09-25T10:00:00Z',
    updated_at: '2025-09-25T10:00:00Z',
  },
];
