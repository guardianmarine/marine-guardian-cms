import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const opportunityId = url.pathname.split('/').pop();

    console.log('Creating deal from opportunity:', opportunityId);

    // Fetch opportunity details
    const { data: opportunity, error: oppError } = await supabaseClient
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();

    if (oppError) {
      throw new Error(`Failed to fetch opportunity: ${oppError.message}`);
    }

    // Create deal
    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .insert({
        opportunity_id: opportunityId,
        account_id: opportunity.account_id,
        deal_number: `DEAL-${Date.now()}`,
        status: 'draft',
        discount_amount: 0,
        subtotal: 0,
        tax_total: 0,
        fees_total: 0,
        total: 0,
      })
      .select()
      .single();

    if (dealError) {
      throw new Error(`Failed to create deal: ${dealError.message}`);
    }

    console.log('Deal created successfully:', deal);

    return new Response(
      JSON.stringify({
        success: true,
        deal,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error creating deal from opportunity:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create deal'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
