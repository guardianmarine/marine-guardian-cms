import { create } from 'zustand';
import {
  Deal,
  DealUnit,
  DealFee,
  Payment,
  Commission,
  TaxRegime,
  TaxRule,
  TaxRuleLine,
} from '@/types';
import {
  mockDeals,
  mockDealUnits,
  mockDealFees,
  mockPayments,
  mockCommissions,
  mockTaxRegimes,
  mockTaxRules,
  mockTaxRuleLines,
} from './dealsMockData';
import { mockUsers } from './mockData';

// Commission configuration
const COMMISSION_CONFIG = {
  include_fees_in_net: false, // If false, taxes/fees are excluded from net calculation
};

interface DealsStore {
  deals: Deal[];
  dealUnits: DealUnit[];
  dealFees: DealFee[];
  payments: Payment[];
  commissions: Commission[];
  taxRegimes: TaxRegime[];
  taxRules: TaxRule[];
  taxRuleLines: TaxRuleLine[];

  // Deals
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, data: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  getDealById: (id: string) => Deal | undefined;
  getDealsByOpportunity: (opportunityId: string) => Deal[];
  createDealFromOpportunity: (opportunityId: string, accountId: string, salesRepId: string, units: Array<{ unit_id: string; agreed_unit_price?: number }>) => Deal;
  issueDeal: (dealId: string) => void;
  markDelivered: (dealId: string) => void;
  closeDeal: (dealId: string) => void;

  // Deal Units
  addDealUnit: (dealUnit: DealUnit) => void;
  updateDealUnit: (dealId: string, unitId: string, data: Partial<DealUnit>) => void;
  removeDealUnit: (dealId: string, unitId: string) => void;
  getDealUnits: (dealId: string) => DealUnit[];

  // Deal Fees
  addDealFee: (fee: DealFee) => void;
  updateDealFee: (id: string, data: Partial<DealFee>) => void;
  deleteDealFee: (id: string) => void;
  getDealFees: (dealId: string) => DealFee[];
  recalculateDealFees: (dealId: string) => void;

  // Payments
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, data: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  getPaymentsByDeal: (dealId: string) => Payment[];

  // Commissions
  addCommission: (commission: Commission) => void;
  updateCommission: (id: string, data: Partial<Commission>) => void;
  deleteCommission: (id: string) => void;
  getCommissionsByDeal: (dealId: string) => Commission[];
  markCommissionPayable: (id: string) => void;
  markCommissionPaid: (id: string) => void;

  // Tax Regimes
  addTaxRegime: (regime: TaxRegime) => void;
  updateTaxRegime: (id: string, data: Partial<TaxRegime>) => void;
  deleteTaxRegime: (id: string) => void;

  // Tax Rules
  addTaxRule: (rule: TaxRule) => void;
  updateTaxRule: (id: string, data: Partial<TaxRule>) => void;
  deleteTaxRule: (id: string) => void;
  getActiveTaxRule: (regimeId: string) => TaxRule | undefined;

  // Tax Rule Lines
  addTaxRuleLine: (line: TaxRuleLine) => void;
  updateTaxRuleLine: (id: string, data: Partial<TaxRuleLine>) => void;
  deleteTaxRuleLine: (id: string) => void;
  getTaxRuleLines: (ruleId: string) => TaxRuleLine[];

  // Business Logic
  recalculateDealTotals: (dealId: string) => void;
  applyTaxRule: (dealId: string, ruleId: string) => void;
}


export const useDealsStore = create<DealsStore>((set, get) => ({
  deals: mockDeals,
  dealUnits: mockDealUnits,
  dealFees: mockDealFees,
  payments: mockPayments,
  commissions: mockCommissions,
  taxRegimes: mockTaxRegimes,
  taxRules: mockTaxRules,
  taxRuleLines: mockTaxRuleLines,

  // Deals
  addDeal: (deal) => set((state) => ({ deals: [...state.deals, deal] })),

  updateDeal: (id, data) =>
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === id ? { ...d, ...data, updated_at: new Date().toISOString() } : d
      ),
    })),

  deleteDeal: (id) =>
    set((state) => ({ deals: state.deals.filter((d) => d.id !== id) })),

  getDealById: (id) => get().deals.find((d) => d.id === id),

  getDealsByOpportunity: (opportunityId) =>
    get().deals.filter((d) => d.opportunity_id === opportunityId),

  createDealFromOpportunity: (opportunityId, accountId, salesRepId, units) => {
    const dealId = `deal-${Date.now()}`;
    const now = new Date().toISOString();

    // Calculate vehicle subtotal from units
    const vehicleSubtotal = units.reduce((sum, u) => sum + (u.agreed_unit_price || 0), 0);

    // Create the deal
    const newDeal: Deal = {
      id: dealId,
      opportunity_id: opportunityId,
      account_id: accountId,
      sales_rep_id: salesRepId,
      status: 'draft',
      currency: 'USD',
      vehicle_subtotal: vehicleSubtotal,
      discounts_total: 0,
      taxes_total: 0,
      fees_total: 0,
      total_due: vehicleSubtotal,
      amount_paid: 0,
      balance_due: vehicleSubtotal,
      created_at: now,
      updated_at: now,
    };

    set((state) => ({ deals: [...state.deals, newDeal] }));

    // Add deal units
    units.forEach((unit) => {
      const dealUnit: DealUnit = {
        deal_id: dealId,
        unit_id: unit.unit_id,
        agreed_unit_price: unit.agreed_unit_price || 0,
      };
      set((state) => ({ dealUnits: [...state.dealUnits, dealUnit] }));
    });

    // Commission will be calculated when deal is issued (not here)

    return newDeal;
  },

  issueDeal: (dealId) => {
    const deal = get().getDealById(dealId);
    if (!deal || deal.status !== 'draft') return;

    const now = new Date().toISOString();

    get().updateDeal(dealId, {
      status: 'issued',
      issued_at: now,
    });

    // Calculate and create commission on issue
    const salesRep = mockUsers.find((u) => u.id === deal.sales_rep_id);
    const commissionPercent = salesRep?.commission_percent || 3.0;

    // Calculate net: vehicle_subtotal - discounts - taxes/fees (based on config)
    let net = deal.vehicle_subtotal - deal.discounts_total;
    
    // Subtract unit costs if available
    const dealUnits = get().getDealUnits(dealId);
    if (typeof window !== 'undefined') {
      // Access inventory store to get unit costs
      const inventoryStore = (window as any).__inventoryStore;
      if (inventoryStore) {
        const totalCost = dealUnits.reduce((sum, du) => {
          const unit = inventoryStore.units.find((u: any) => u.id === du.unit_id);
          if (unit) {
            const costStack = (unit.cost_purchase || 0) + (unit.cost_transport_in || 0) + (unit.cost_reconditioning || 0);
            return sum + costStack;
          }
          return sum;
        }, 0);
        net -= totalCost;
      }
    }

    // Subtract taxes/fees if config says not to include them in net
    if (!COMMISSION_CONFIG.include_fees_in_net) {
      net -= (deal.taxes_total + deal.fees_total);
    }

    const calculatedAmount = (net * commissionPercent) / 100;

    // Check if commission already exists for this deal
    const existingComm = get().commissions.find((c) => c.deal_id === dealId);
    
    if (existingComm) {
      // Update existing commission
      get().updateCommission(existingComm.id, {
        percent: commissionPercent,
        calculated_amount: calculatedAmount,
        status: 'accrued',
      });
    } else {
      // Create new commission
      const commission: Commission = {
        id: `comm-${Date.now()}`,
        deal_id: dealId,
        sales_rep_id: deal.sales_rep_id,
        basis: 'net',
        percent: commissionPercent,
        flat_amount: undefined,
        calculated_amount: calculatedAmount,
        status: 'accrued',
        paid_at: undefined,
        note: undefined,
        created_at: now,
        updated_at: now,
      };
      set((state) => ({ commissions: [...state.commissions, commission] }));
    }
  },

  markDelivered: (dealId) => {
    const deal = get().getDealById(dealId);
    if (!deal || deal.status !== 'paid') return;

    get().updateDeal(dealId, {
      delivered_at: new Date().toISOString(),
    });
  },

  closeDeal: (dealId) => {
    const deal = get().getDealById(dealId);
    if (!deal || !deal.delivered_at) return;

    const now = new Date().toISOString();
    get().updateDeal(dealId, {
      closed_at: now,
    });

    // Update all units in this deal to 'sold'
    const dealUnits = get().getDealUnits(dealId);
    // We need access to the inventory store to update units
    // For now, we'll emit a custom event that the inventory store can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('deal-closed', { 
        detail: { 
          dealId, 
          unitIds: dealUnits.map(du => du.unit_id),
          soldAt: now,
        } 
      }));
    }
  },


  // Deal Units
  addDealUnit: (dealUnit) =>
    set((state) => ({ dealUnits: [...state.dealUnits, dealUnit] })),

  updateDealUnit: (dealId, unitId, data) =>
    set((state) => ({
      dealUnits: state.dealUnits.map((du) =>
        du.deal_id === dealId && du.unit_id === unitId ? { ...du, ...data } : du
      ),
    })),

  removeDealUnit: (dealId, unitId) =>
    set((state) => ({
      dealUnits: state.dealUnits.filter(
        (du) => !(du.deal_id === dealId && du.unit_id === unitId)
      ),
    })),

  getDealUnits: (dealId) => get().dealUnits.filter((du) => du.deal_id === dealId),

  // Deal Fees
  addDealFee: (fee) => set((state) => ({ dealFees: [...state.dealFees, fee] })),

  updateDealFee: (id, data) =>
    set((state) => ({
      dealFees: state.dealFees.map((f) => (f.id === id ? { ...f, ...data } : f)),
    })),

  deleteDealFee: (id) =>
    set((state) => ({ dealFees: state.dealFees.filter((f) => f.id !== id) })),

  getDealFees: (dealId) => get().dealFees.filter((f) => f.deal_id === dealId),

  recalculateDealFees: (dealId) => {
    const deal = get().getDealById(dealId);
    if (!deal) return;

    const fees = get().getDealFees(dealId);
    const vehicleSubtotal = deal.vehicle_subtotal;

    set((state) => ({
      dealFees: state.dealFees.map((f) => {
        if (f.deal_id !== dealId || !f.applies) return f;

        let resultAmount = 0;
        if (f.calc_type === 'percent' && f.base === 'vehicle_subtotal') {
          resultAmount = (vehicleSubtotal * f.rate_or_amount) / 100;
        } else if (f.calc_type === 'fixed') {
          resultAmount = f.rate_or_amount;
        }

        return { ...f, result_amount: resultAmount };
      }),
    }));
  },

  // Payments
  addPayment: (payment) => {
    set((state) => ({ payments: [...state.payments, payment] }));
    
    // Recalculate deal totals after adding payment
    const dealId = payment.deal_id;
    const payments = [...get().payments, payment];
    const totalPaid = payments
      .filter((p) => p.deal_id === dealId)
      .reduce((sum, p) => sum + p.amount, 0);

    get().updateDeal(dealId, { amount_paid: totalPaid });
    get().recalculateDealTotals(dealId);

    // Auto-update commission status to payable if balance is paid
    const deal = get().getDealById(dealId);
    if (deal && deal.balance_due <= 0) {
      const commissions = get().getCommissionsByDeal(dealId);
      commissions.forEach((c) => {
        if (c.status === 'accrued') {
          get().markCommissionPayable(c.id);
        }
      });
    }
  },

  updatePayment: (id, data) => {
    set((state) => ({
      payments: state.payments.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));

    // Recalculate after update
    const payment = get().payments.find((p) => p.id === id);
    if (payment) {
      const dealId = payment.deal_id;
      const payments = get().payments.filter((p) => p.deal_id === dealId);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      get().updateDeal(dealId, { amount_paid: totalPaid });
      get().recalculateDealTotals(dealId);

      // Check if commissions should be updated
      const deal = get().getDealById(dealId);
      if (deal && deal.balance_due <= 0) {
        const commissions = get().getCommissionsByDeal(dealId);
        commissions.forEach((c) => {
          if (c.status === 'accrued') {
            get().markCommissionPayable(c.id);
          }
        });
      }
    }
  },

  deletePayment: (id) => {
    const payment = get().payments.find((p) => p.id === id);
    if (!payment) return;

    set((state) => ({ payments: state.payments.filter((p) => p.id !== id) }));

    // Recalculate after deletion
    const dealId = payment.deal_id;
    const payments = get().payments.filter((p) => p.deal_id === dealId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    get().updateDeal(dealId, { amount_paid: totalPaid });
    get().recalculateDealTotals(dealId);
  },

  getPaymentsByDeal: (dealId) => get().payments.filter((p) => p.deal_id === dealId),

  // Commissions
  addCommission: (commission) =>
    set((state) => ({ commissions: [...state.commissions, commission] })),

  updateCommission: (id, data) =>
    set((state) => ({
      commissions: state.commissions.map((c) =>
        c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c
      ),
    })),

  deleteCommission: (id) =>
    set((state) => ({ commissions: state.commissions.filter((c) => c.id !== id) })),

  getCommissionsByDeal: (dealId) =>
    get().commissions.filter((c) => c.deal_id === dealId),

  markCommissionPayable: (id) =>
    get().updateCommission(id, { status: 'payable' }),

  markCommissionPaid: (id) =>
    get().updateCommission(id, { status: 'paid', paid_at: new Date().toISOString() }),

  // Tax Regimes
  addTaxRegime: (regime) =>
    set((state) => ({ taxRegimes: [...state.taxRegimes, regime] })),

  updateTaxRegime: (id, data) =>
    set((state) => ({
      taxRegimes: state.taxRegimes.map((r) => (r.id === id ? { ...r, ...data } : r)),
    })),

  deleteTaxRegime: (id) =>
    set((state) => ({ taxRegimes: state.taxRegimes.filter((r) => r.id !== id) })),

  // Tax Rules
  addTaxRule: (rule) => set((state) => ({ taxRules: [...state.taxRules, rule] })),

  updateTaxRule: (id, data) =>
    set((state) => ({
      taxRules: state.taxRules.map((r) => (r.id === id ? { ...r, ...data } : r)),
    })),

  deleteTaxRule: (id) =>
    set((state) => ({ taxRules: state.taxRules.filter((r) => r.id !== id) })),

  getActiveTaxRule: (regimeId) =>
    get().taxRules.find((r) => r.tax_regime_id === regimeId && r.is_active),

  // Tax Rule Lines
  addTaxRuleLine: (line) =>
    set((state) => ({ taxRuleLines: [...state.taxRuleLines, line] })),

  updateTaxRuleLine: (id, data) =>
    set((state) => ({
      taxRuleLines: state.taxRuleLines.map((l) => (l.id === id ? { ...l, ...data } : l)),
    })),

  deleteTaxRuleLine: (id) =>
    set((state) => ({ taxRuleLines: state.taxRuleLines.filter((l) => l.id !== id) })),

  getTaxRuleLines: (ruleId) =>
    get().taxRuleLines.filter((l) => l.tax_rule_id === ruleId),

  // Business Logic
  recalculateDealTotals: (dealId) => {
    const deal = get().getDealById(dealId);
    if (!deal) return;

    const fees = get().getDealFees(dealId).filter((f) => f.applies);
    const taxesTotal = fees
      .filter((f) => f.name.toLowerCase().includes('tax') || f.name.toLowerCase().includes('sales'))
      .reduce((sum, f) => sum + f.result_amount, 0);
    const feesTotal = fees
      .filter((f) => !f.name.toLowerCase().includes('tax') && !f.name.toLowerCase().includes('sales'))
      .reduce((sum, f) => sum + f.result_amount, 0);

    const totalDue = deal.vehicle_subtotal - deal.discounts_total + taxesTotal + feesTotal;
    const balanceDue = totalDue - deal.amount_paid;

    let status = deal.status;
    if (deal.amount_paid >= totalDue && totalDue > 0) {
      status = 'paid';
    } else if (deal.amount_paid > 0 && deal.amount_paid < totalDue) {
      status = 'partially_paid';
    }

    get().updateDeal(dealId, {
      taxes_total: taxesTotal,
      fees_total: feesTotal,
      total_due: totalDue,
      balance_due: balanceDue,
      status,
    });

    // Update commissions to payable if fully paid
    if (deal.amount_paid >= totalDue) {
      const commissions = get().getCommissionsByDeal(dealId);
      commissions.forEach((c) => {
        if (c.status === 'accrued') {
          get().markCommissionPayable(c.id);
        }
      });
    }
  },

  applyTaxRule: (dealId, ruleId) => {
    const deal = get().getDealById(dealId);
    const rule = get().taxRules.find((r) => r.id === ruleId);
    if (!deal || !rule) return;

    // Clear existing fees
    const existingFees = get().getDealFees(dealId);
    existingFees.forEach((f) => get().deleteDealFee(f.id));

    // Apply new rule lines as fees
    const ruleLines = get().getTaxRuleLines(ruleId);
    ruleLines.forEach((line) => {
      let resultAmount = 0;
      if (line.calc_type === 'percent' && line.base === 'vehicle_subtotal') {
        resultAmount = (deal.vehicle_subtotal * line.rate_or_amount) / 100;
      } else if (line.calc_type === 'fixed') {
        resultAmount = line.rate_or_amount;
      }

      const fee: DealFee = {
        id: `fee-${dealId}-${line.id}-${Date.now()}`,
        deal_id: dealId,
        name: line.name,
        calc_type: line.calc_type,
        base: line.base,
        rate_or_amount: line.rate_or_amount,
        result_amount: resultAmount,
        applies: true,
        meta: line.conditions,
        sort: line.sort,
      };

      get().addDealFee(fee);
    });

    // Update deal with tax rule reference
    get().updateDeal(dealId, { tax_rule_version_id: ruleId });

    // Recalculate totals
    get().recalculateDealTotals(dealId);
  },
}));
