import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyFeesRequest {
  taxRegimeId: string;
  taxRuleVersionId: string;
  inputs: Record<string, any>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const dealId = url.pathname.split('/')[3]; // /api/deals/:id/fees/apply

    const { taxRegimeId, taxRuleVersionId, inputs }: ApplyFeesRequest = await req.json();

    console.log('Applying fees to deal:', { dealId, taxRegimeId, taxRuleVersionId });

    // Fetch tax rule lines
    const { data: ruleLines, error: rulesError } = await supabaseClient
      .from('tax_rule_lines')
      .select('*')
      .eq('tax_rule_id', taxRuleVersionId);

    if (rulesError) {
      throw new Error(`Failed to fetch tax rules: ${rulesError.message}`);
    }

    // Delete existing fee lines for this deal
    await supabaseClient
      .from('deal_fee_lines')
      .delete()
      .eq('deal_id', dealId);

    // Calculate and create fee lines
    const feeLines = [];
    let totalFees = 0;

    for (const rule of ruleLines) {
      let amount = 0;

      if (rule.line_type === 'percentage') {
        const baseAmount = inputs[rule.base_field] || 0;
        amount = (baseAmount * rule.rate_percentage) / 100;
      } else if (rule.line_type === 'fixed') {
        amount = rule.fixed_amount || 0;
      }

      if (amount > 0) {
        feeLines.push({
          deal_id: dealId,
          name: rule.name,
          line_type: rule.line_type,
          base_field: rule.base_field,
          rate_percentage: rule.rate_percentage,
          fixed_amount: rule.fixed_amount,
          computed_amount: amount,
        });
        totalFees += amount;
      }
    }

    // Insert new fee lines
    if (feeLines.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('deal_fee_lines')
        .insert(feeLines);

      if (insertError) {
        throw new Error(`Failed to create fee lines: ${insertError.message}`);
      }
    }

    // Update deal totals
    const { data: deal, error: updateError } = await supabaseClient
      .from('deals')
      .update({
        tax_total: totalFees,
        total: inputs.subtotal + totalFees,
      })
      .eq('id', dealId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update deal: ${updateError.message}`);
    }

    console.log('Fees applied successfully:', { feeLines, totalFees });

    return new Response(
      JSON.stringify({
        success: true,
        deal,
        feeLines,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error applying fees:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to apply fees'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
