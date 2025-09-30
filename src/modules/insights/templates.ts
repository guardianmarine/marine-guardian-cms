// src/modules/insights/templates.ts
import { supabase } from '@/integrations/supabase/client';

export type InsightParams = { dateFrom: string; dateTo: string; limit: number; locale: 'en'|'es' };
export type InsightResult = { rows: any[]; chart: { type: 'bar'|'line', x: string, y: string }; explanation: string };

function fmtExp(en: string, es: string, locale: 'en'|'es') { return locale === 'es' ? es : en; }

// Helper: JS group-by
function group<T, K extends string>(items: T[], key: (t: T) => Record<K, string>) {
  const map = new Map<string, any>();
  for (const it of items) {
    const keys = key(it); const k = Object.entries(keys).map(([k,v])=>`${k}:${v ?? ''}`).join('|');
    const cur = map.get(k) || { ...keys, units: 0, revenue: 0 };
    cur.units += 1;
    cur.revenue += (it as any).total_due ?? 0;
    map.set(k, cur);
  }
  return Array.from(map.values());
}

export const insightTemplates: Record<string, {
  label: string;
  roles: Array<'sales'|'finance'|'admin'>;
  run: (p: InsightParams) => Promise<InsightResult>;
}> = {

  // 1) Top combos (units sold) in date range
  top_combos: {
    label: 'Top combos (by units)',
    roles: ['sales','finance','admin'],
    async run({ dateFrom, dateTo, limit, locale }) {
      // Fetch deals in range
      const { data: deals, error: e1 } = await supabase
        .from('deals')
        .select('id, account_id, sales_rep_id, total_due, closed_at, status')
        .gte('closed_at', dateFrom).lte('closed_at', dateTo)
        .or('status.eq.issued,status.eq.partially_paid,status.eq.paid'); // include active closed in period
      if (e1) throw e1;

      const dealIds = (deals ?? []).map(d => d.id);
      if (dealIds.length === 0) {
        return { rows: [], chart: { type: 'bar', x: 'model', y: 'units' },
          explanation: fmtExp('No deals in the selected range.', 'No hay ventas en el rango.', locale) };
      }

      // Deal → Units
      const { data: du, error: e2 } = await supabase
        .from('deal_units')
        .select('deal_id, unit_id')
        .in('deal_id', dealIds);
      if (e2) throw e2;

      const unitIds = [...new Set((du ?? []).map(d => d.unit_id))];
      if (unitIds.length === 0) {
        return { rows: [], chart: { type: 'bar', x: 'model', y: 'units' },
          explanation: fmtExp('Deals had no units linked.', 'Las ventas no tenían unidades vinculadas.', locale) };
      }

      // Units specs
      const { data: units, error: e3 } = await supabase
        .from('units')
        .select('id, category, make, model, year, engine, type')
        .in('id', unitIds);
      if (e3) throw e3;

      // Join: flatten s.total_due per unit for grouping
      const totalDueByDeal = new Map<string, number>((deals ?? []).map(d => [String(d.id), Number(d.total_due||0)]));
      const rows = (du ?? []).map(link => {
        const u = (units ?? []).find(x => x.id === link.unit_id);
        return u ? {
          category: u.category, make: u.make, model: u.model, year: u.year, engine: u.engine, type: u.type,
          total_due: totalDueByDeal.get(String(link.deal_id)) || 0
        } : null;
      }).filter(Boolean) as any[];

      // Group in JS
      const grouped = group(rows, r => ({
        category: r.category || 'n/a',
        make: r.make || 'n/a',
        model: r.model || 'n/a',
        year: String(r.year || 'n/a'),
        engine: r.engine || 'n/a',
        type: r.type || 'n/a'
      })).sort((a,b) => b.units - a.units).slice(0, limit);

      const explanation = fmtExp(
        'Top-selling spec combinations in the selected range.',
        'Combinaciones de especificaciones con más ventas en el período.',
        locale
      );
      return { rows: grouped, chart: { type: 'bar', x: 'model', y: 'units' }, explanation };
    }
  },

  // 2) Slow movers (>= 90 days on lot)
  slow_movers: {
    label: 'Slow movers (90+ days)',
    roles: ['sales','finance','admin'],
    async run({ dateFrom, dateTo, limit, locale }) {
      const { data: units, error } = await supabase
        .from('units')
        .select('id, make, model, year, listed_at, sold_at, status, mileage')
        .neq('listed_at', null)
        .gte('sold_at', dateFrom).lte('sold_at', dateTo);
      if (error) throw error;

      const rows = (units ?? []).map(u => {
        const d = (u.sold_at && u.listed_at) ? Math.max(0, (new Date(u.sold_at).getTime() - new Date(u.listed_at).getTime()) / 86400000) : null;
        return { make: u.make, model: u.model, year: u.year, days_on_lot: d };
      }).filter(r => (r.days_on_lot ?? 0) >= 90)
        .sort((a,b) => (b.days_on_lot ?? 0) - (a.days_on_lot ?? 0))
        .slice(0, limit);

      const explanation = fmtExp(
        'Units that took 90+ days to sell. Consider rotating pricing or featuring them sooner.',
        'Unidades que tardaron 90+ días en venderse. Considera ajustar precio o destacarlas antes.',
        locale
      );
      return { rows, chart: { type: 'bar', x: 'model', y: 'days_on_lot' }, explanation };
    }
  },

  // 3) Leads lost reasons
  lost_reasons: {
    label: 'Leads lost reasons',
    roles: ['sales','finance','admin'],
    async run({ dateFrom, dateTo, limit, locale }) {
      const { data: ops, error } = await supabase
        .from('opportunities')
        .select('id, pipeline_stage, reason_lost, closed_at')
        .eq('pipeline_stage', 'lost')
        .gte('closed_at', dateFrom).lte('closed_at', dateTo);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const o of ops ?? []) {
        const key = o.reason_lost || 'unknown';
        counts[key] = (counts[key] || 0) + 1;
      }
      const rows = Object.entries(counts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a,b)=>b.count-a.count)
        .slice(0, limit);

      const explanation = fmtExp(
        'Main reasons for lost opportunities in the period.',
        'Principales razones de oportunidades perdidas en el periodo.',
        locale
      );
      return { rows, chart: { type: 'bar', x: 'reason', y: 'count' }, explanation };
    }
  },

  // 4) Repeat buyers
  repeat_buyers: {
    label: 'Repeat buyers',
    roles: ['sales','finance','admin'],
    async run({ dateFrom, dateTo, limit, locale }) {
      const { data: deals, error } = await supabase
        .from('deals')
        .select('id, account_id, total_due, closed_at, status')
        .gte('closed_at', dateFrom).lte('closed_at', dateTo);
      if (error) throw error;

      const byAcct = new Map<string, { account_id: string; purchases: number; revenue: number }>();
      for (const d of deals ?? []) {
        const k = String(d.account_id);
        const cur = byAcct.get(k) || { account_id: k, purchases: 0, revenue: 0 };
        cur.purchases += 1;
        cur.revenue += Number(d.total_due || 0);
        byAcct.set(k, cur);
      }
      const list = Array.from(byAcct.values()).filter(x => x.purchases > 1).sort((a,b)=>b.purchases-a.purchases).slice(0, limit);
      if (list.length === 0) {
        return { rows: [], chart: { type: 'bar', x: 'account', y: 'purchases' },
          explanation: fmtExp('No repeat buyers in the range.', 'No hay clientes recurrentes en el rango.', locale) };
      }

      const acctIds = list.map(x => x.account_id);
      const { data: accounts, error: e2 } = await supabase.from('accounts').select('id, name').in('id', acctIds);
      if (e2) throw e2;

      const rows = list.map(x => ({ account: (accounts||[]).find(a=>a.id===x.account_id)?.name || x.account_id, purchases: x.purchases, revenue: x.revenue }));
      const explanation = fmtExp('Accounts with multiple purchases in the period.', 'Cuentas con compras múltiples en el periodo.', locale);
      return { rows, chart: { type: 'bar', x: 'account', y: 'purchases' }, explanation };
    }
  },

  // 5) Sales rep performance
  rep_performance: {
    label: 'Rep performance',
    roles: ['sales','finance','admin'],
    async run({ dateFrom, dateTo, limit, locale }) {
      const { data: deals, error } = await supabase
        .from('deals')
        .select('id, sales_rep_id, total_due, closed_at, status')
        .gte('closed_at', dateFrom).lte('closed_at', dateTo);
      if (error) throw error;

      const byRep = new Map<string, { sales_rep_id: string; deals: number; revenue: number }>();
      for (const d of deals ?? []) {
        const k = String(d.sales_rep_id);
        const cur = byRep.get(k) || { sales_rep_id: k, deals: 0, revenue: 0 };
        cur.deals += 1;
        cur.revenue += Number(d.total_due || 0);
        byRep.set(k, cur);
      }
      const top = Array.from(byRep.values()).sort((a,b)=>b.revenue-a.revenue).slice(0, limit);
      if (top.length === 0) {
        return { rows: [], chart: { type: 'bar', x: 'sales_rep', y: 'revenue' },
          explanation: fmtExp('No deals in range.', 'No hay ventas en el rango.', locale) };
      }

      const repIds = top.map(x => x.sales_rep_id);
      const { data: users, error: e2 } = await supabase.from('users').select('id, name').in('id', repIds);
      if (e2) throw e2;

      const rows = top.map(x => ({ sales_rep: (users||[]).find(u=>u.id===x.sales_rep_id)?.name || x.sales_rep_id, deals: x.deals, revenue: x.revenue }));
      const explanation = fmtExp('Deal count and revenue by rep.', 'Cantidad de ventas e ingresos por representante.', locale);
      return { rows, chart: { type: 'bar', x: 'sales_rep', y: 'revenue' }, explanation };
    }
  },

};
