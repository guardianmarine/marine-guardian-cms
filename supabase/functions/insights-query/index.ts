import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inline query templates to avoid imports
const QUERY_TEMPLATES = [
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

function matchTemplate(question: string) {
  const q = question.toLowerCase();
  
  if (q.includes('top') && (q.includes('selling') || q.includes('combination') || q.includes('combo'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'top_selling_combos');
  }
  if ((q.includes('slow') || q.includes('days on lot') || q.includes('aging')) && q.includes('90')) {
    return QUERY_TEMPLATES.find(t => t.id === 'slow_movers');
  }
  if (q.includes('lost') && q.includes('reason')) {
    return QUERY_TEMPLATES.find(t => t.id === 'lost_reasons');
  }
  if (q.includes('repeat') && q.includes('buyer')) {
    return QUERY_TEMPLATES.find(t => t.id === 'repeat_buyers');
  }
  if ((q.includes('rep') || q.includes('sales rep') || q.includes('salesperson')) && q.includes('performance')) {
    return QUERY_TEMPLATES.find(t => t.id === 'sales_rep_performance');
  }
  if (q.includes('profit') && (q.includes('rep') || q.includes('sales rep'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'profitability_by_rep');
  }
  if (q.includes('mileage') && (q.includes('days') || q.includes('band'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'days_on_lot_by_mileage');
  }
  if (q.includes('trend') && (q.includes('spec') || q.includes('engine') || q.includes('transmission'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'trending_specs');
  }
  if (q.includes('category') && q.includes('performance')) {
    return QUERY_TEMPLATES.find(t => t.id === 'category_performance');
  }
  if (q.includes('lead') && (q.includes('conversion') || q.includes('win rate'))) {
    return QUERY_TEMPLATES.find(t => t.id === 'lead_conversion');
  }
  
  return null;
}

function extractParams(question: string) {
  const params: Record<string, any> = {};
  const q = question.toLowerCase();
  
  if (q.includes('90 days') || q.includes('90d') || q.includes('last 90')) {
    params.days = 90;
  } else if (q.includes('30 days') || q.includes('30d') || q.includes('last 30') || q.includes('month')) {
    params.days = 30;
  } else if (q.includes('7 days') || q.includes('7d') || q.includes('week')) {
    params.days = 7;
  } else {
    params.days = 90;
  }
  
  if (q.includes('90+ d') || q.includes('more than 90')) {
    params.min_days = 90;
  } else if (q.includes('60+ d') || q.includes('more than 60')) {
    params.min_days = 60;
  } else {
    params.min_days = 90;
  }
  
  return params;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { question, role } = await req.json();

    if (!question || !role) {
      throw new Error('Missing question or role');
    }

    console.log('Processing insights query:', { question, role });

    // Match template
    const template = matchTemplate(question);
    
    if (!template) {
      return new Response(
        JSON.stringify({
          error: 'unsupported',
          explanation: 'I couldn\'t understand that question. Try one of the quick prompts or rephrase your question.',
          suggestions: [
            'What are the top selling combinations in the last 90 days?',
            'Show units on lot for more than 90 days',
            'What are the main reasons leads were lost?',
            'Show repeat buyers and what they buy',
            'Sales rep performance this month'
          ]
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check role authorization
    if (!template.rolesAllowed.includes(role as any)) {
      return new Response(
        JSON.stringify({
          error: 'unauthorized',
          explanation: 'You do not have permission to run this query. Contact your administrator.'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract parameters
    const params = extractParams(question);
    console.log('Extracted params:', params);

    // Replace parameters in SQL
    let sql = template.sql;
    for (const [key, value] of Object.entries(params)) {
      sql = sql.replace(new RegExp(`:${key}`, 'g'), String(value));
    }

    console.log('Executing SQL:', sql);

    // Execute query with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const { data, error } = await supabaseClient.rpc('execute_sql', { 
      query: sql 
    }).abortSignal(controller.signal);

    clearTimeout(timeout);

    if (error) {
      console.error('Query execution error:', error);
      throw error;
    }

    // Get user ID for audit log
    const { data: { user } } = await supabaseClient.auth.getUser();

    // Log to audit table
    if (user) {
      const startTime = Date.now();
      await supabaseClient.from('insight_logs').insert({
        user_id: user.id,
        role,
        question,
        template_id: template.id,
        params,
        sql,
        rowcount: data?.length || 0,
        ms: Date.now() - startTime
      });
    }

    // Generate explanation
    const explanation = `Found ${data?.length || 0} results for: ${template.description}`;

    return new Response(
      JSON.stringify({
        sql,
        rows: data || [],
        chart_suggestion: template.chartSuggestion,
        explanation
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Insights error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        explanation: 'An error occurred processing your request. Please try again.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
