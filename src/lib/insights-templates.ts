export interface QueryTemplate {
  id: string;
  description: string;
  requiredParams: string[];
  sql: string;
  rolesAllowed: ('admin' | 'finance' | 'sales')[];
  chartSuggestion?: 'bar' | 'line';
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: 'top_selling_combos',
    description: 'Top selling combinations by count or revenue',
    requiredParams: ['days'],
    sql: `
      SELECT 
        CONCAT(s.category, ' - ', s.make, ' ', s.model, ' (', s.year, ')') as combination,
        COUNT(*) as units_sold,
        SUM(sa.vehicle_subtotal) as total_revenue
      FROM v_sales sa
      JOIN v_units_public s ON sa.unit_id = s.unit_id
      WHERE sa.closed_at >= NOW() - INTERVAL ':days days'
      GROUP BY s.category, s.make, s.model, s.year
      ORDER BY units_sold DESC
      LIMIT 10
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
    chartSuggestion: 'bar'
  },
  {
    id: 'slow_movers',
    description: 'Units on lot for more than specified days',
    requiredParams: ['min_days'],
    sql: `
      SELECT 
        unit_id,
        CONCAT(make, ' ', model, ' (', year, ')') as unit,
        category,
        type,
        days_on_lot,
        mileage_band
      FROM v_units_public
      WHERE sold_at IS NULL 
        AND days_on_lot > :min_days
      ORDER BY days_on_lot DESC
      LIMIT 50
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
    chartSuggestion: 'bar'
  },
  {
    id: 'days_on_lot_by_mileage',
    description: 'Average days on lot grouped by mileage bands',
    requiredParams: [],
    sql: `
      SELECT 
        mileage_band,
        AVG(days_on_lot) as avg_days,
        COUNT(*) as unit_count
      FROM v_units_public
      WHERE sold_at IS NOT NULL
      GROUP BY mileage_band
      ORDER BY 
        CASE mileage_band
          WHEN '<400k' THEN 1
          WHEN '400-700k' THEN 2
          WHEN '>700k' THEN 3
          ELSE 4
        END
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
    chartSuggestion: 'bar'
  },
  {
    id: 'repeat_buyers',
    description: 'Accounts that have made multiple purchases',
    requiredParams: [],
    sql: `
      SELECT 
        a.name as account_name,
        a.kind,
        COUNT(DISTINCT s.deal_id) as purchase_count,
        SUM(s.total_due) as lifetime_value,
        STRING_AGG(DISTINCT u.category, ', ') as categories_bought
      FROM v_sales s
      JOIN v_accounts_lite a ON s.account_id = a.account_id
      JOIN v_units_public u ON s.unit_id = u.unit_id
      GROUP BY a.account_id, a.name, a.kind
      HAVING COUNT(DISTINCT s.deal_id) > 1
      ORDER BY purchase_count DESC, lifetime_value DESC
      LIMIT 25
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
  },
  {
    id: 'lost_reasons',
    description: 'Distribution of reasons leads were lost',
    requiredParams: ['days'],
    sql: `
      SELECT 
        reason_lost,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
      FROM v_leads_ops
      WHERE stage = 'lost'
        AND closed_at >= NOW() - INTERVAL ':days days'
        AND reason_lost IS NOT NULL
      GROUP BY reason_lost
      ORDER BY count DESC
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
    chartSuggestion: 'bar'
  },
  {
    id: 'sales_rep_performance',
    description: 'Sales rep performance by units and revenue',
    requiredParams: ['days'],
    sql: `
      SELECT 
        sr.name as sales_rep,
        COUNT(DISTINCT s.deal_id) as deals_closed,
        COUNT(DISTINCT s.unit_id) as units_sold,
        SUM(s.vehicle_subtotal) as gross_revenue,
        SUM(s.total_due) as total_revenue,
        ROUND(AVG(s.total_due), 2) as avg_deal_size
      FROM v_sales s
      JOIN v_salesreps sr ON s.sales_rep_id = sr.user_id
      WHERE s.closed_at >= NOW() - INTERVAL ':days days'
      GROUP BY sr.user_id, sr.name
      ORDER BY total_revenue DESC
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
    chartSuggestion: 'bar'
  },
  {
    id: 'profitability_by_rep',
    description: 'Sales rep profitability analysis (Finance/Admin only)',
    requiredParams: ['days'],
    sql: `
      SELECT 
        sr.name as sales_rep,
        COUNT(*) as units_sold,
        SUM(p.gross_profit) as total_gross_profit,
        SUM(p.net_profit) as total_net_profit,
        ROUND(AVG(p.gross_profit), 2) as avg_gross_profit,
        ROUND(AVG(p.net_profit), 2) as avg_net_profit
      FROM v_profitability p
      JOIN v_salesreps sr ON p.sales_rep_id = sr.user_id
      WHERE p.sold_at >= NOW() - INTERVAL ':days days'
      GROUP BY sr.user_id, sr.name
      ORDER BY total_net_profit DESC
    `,
    rolesAllowed: ['admin', 'finance'],
    chartSuggestion: 'bar'
  },
  {
    id: 'trending_specs',
    description: 'Trending specifications in recent sales',
    requiredParams: ['days'],
    sql: `
      SELECT 
        engine as specification,
        COUNT(*) as sales_count,
        'Engine' as spec_type
      FROM v_units_public u
      WHERE u.sold_at >= NOW() - INTERVAL ':days days'
        AND engine IS NOT NULL
      GROUP BY engine
      HAVING COUNT(*) >= 2
      
      UNION ALL
      
      SELECT 
        transmission as specification,
        COUNT(*) as sales_count,
        'Transmission' as spec_type
      FROM v_units_public u
      WHERE u.sold_at >= NOW() - INTERVAL ':days days'
        AND transmission IS NOT NULL
      GROUP BY transmission
      HAVING COUNT(*) >= 2
      
      ORDER BY sales_count DESC
      LIMIT 15
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
    chartSuggestion: 'bar'
  },
  {
    id: 'category_performance',
    description: 'Performance by category',
    requiredParams: ['days'],
    sql: `
      SELECT 
        u.category,
        COUNT(*) as units_sold,
        ROUND(AVG(u.days_on_lot), 1) as avg_days_on_lot,
        SUM(s.total_due) as total_revenue
      FROM v_sales s
      JOIN v_units_public u ON s.unit_id = u.unit_id
      WHERE s.closed_at >= NOW() - INTERVAL ':days days'
      GROUP BY u.category
      ORDER BY total_revenue DESC
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
    chartSuggestion: 'bar'
  },
  {
    id: 'lead_conversion',
    description: 'Lead conversion rates by category of interest',
    requiredParams: ['days'],
    sql: `
      SELECT 
        category_interest,
        COUNT(*) as total_leads,
        SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN stage = 'lost' THEN 1 ELSE 0 END) as lost,
        ROUND(100.0 * SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) / COUNT(*), 1) as win_rate
      FROM v_leads_ops
      WHERE created_at >= NOW() - INTERVAL ':days days'
        AND category_interest IS NOT NULL
      GROUP BY category_interest
      ORDER BY total_leads DESC
    `,
    rolesAllowed: ['admin', 'finance', 'sales'],
    chartSuggestion: 'bar'
  }
];

// Helper to find template by natural language question
export function matchTemplate(question: string): QueryTemplate | null {
  const q = question.toLowerCase();
  
  // Top selling / combinations
  if (q.includes('top') && (q.includes('selling') || q.includes('combination') || q.includes('combo'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'top_selling_combos') || null;
  }
  
  // Slow movers
  if ((q.includes('slow') || q.includes('days on lot') || q.includes('aging')) && q.includes('90')) {
    return QUERY_TEMPLATES.find(t => t.id === 'slow_movers') || null;
  }
  
  // Lost reasons
  if (q.includes('lost') && q.includes('reason')) {
    return QUERY_TEMPLATES.find(t => t.id === 'lost_reasons') || null;
  }
  
  // Repeat buyers
  if (q.includes('repeat') && q.includes('buyer')) {
    return QUERY_TEMPLATES.find(t => t.id === 'repeat_buyers') || null;
  }
  
  // Sales rep performance
  if ((q.includes('rep') || q.includes('sales rep') || q.includes('salesperson')) && q.includes('performance')) {
    return QUERY_TEMPLATES.find(t => t.id === 'sales_rep_performance') || null;
  }
  
  // Profitability
  if (q.includes('profit') && (q.includes('rep') || q.includes('sales rep'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'profitability_by_rep') || null;
  }
  
  // Mileage bands
  if (q.includes('mileage') && (q.includes('days') || q.includes('band'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'days_on_lot_by_mileage') || null;
  }
  
  // Trending
  if (q.includes('trend') && (q.includes('spec') || q.includes('engine') || q.includes('transmission'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'trending_specs') || null;
  }
  
  // Category performance
  if (q.includes('category') && q.includes('performance')) {
    return QUERY_TEMPLATES.find(t => t.id === 'category_performance') || null;
  }
  
  // Lead conversion
  if (q.includes('lead') && (q.includes('conversion') || q.includes('win rate'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'lead_conversion') || null;
  }
  
  return null;
}

// Extract parameters from natural language (simple heuristics)
export function extractParams(question: string): Record<string, any> {
  const params: Record<string, any> = {};
  const q = question.toLowerCase();
  
  // Extract days
  if (q.includes('90 days') || q.includes('90d') || q.includes('last 90')) {
    params.days = 90;
  } else if (q.includes('30 days') || q.includes('30d') || q.includes('last 30') || q.includes('month')) {
    params.days = 30;
  } else if (q.includes('7 days') || q.includes('7d') || q.includes('week')) {
    params.days = 7;
  } else {
    params.days = 90; // default
  }
  
  // Extract min_days for slow movers
  if (q.includes('90+ d') || q.includes('more than 90')) {
    params.min_days = 90;
  } else if (q.includes('60+ d') || q.includes('more than 60')) {
    params.min_days = 60;
  } else {
    params.min_days = 90; // default for slow movers
  }
  
  return params;
}

// Export getTemplates function
export function getTemplates(): QueryTemplate[] {
  return QUERY_TEMPLATES;
}
