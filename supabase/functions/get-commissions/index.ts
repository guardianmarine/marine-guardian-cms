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

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user has finance role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['finance', 'admin'])
      .single();

    if (roleError || !userRole) {
      throw new Error('Access denied: Finance or Admin role required');
    }

    console.log('Fetching commissions for user:', user.id);

    // Parse query parameters for filters
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const salesRepId = url.searchParams.get('salesRepId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build query
    let query = supabaseClient
      .from('commissions')
      .select(`
        *,
        deals:deal_id (
          deal_number,
          total,
          account:account_id (
            name
          )
        ),
        sales_rep:sales_rep_id (
          name,
          email
        )
      `);

    if (status) {
      query = query.eq('status', status);
    }

    if (salesRepId) {
      query = query.eq('sales_rep_id', salesRepId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: commissions, error: commissionsError } = await query;

    if (commissionsError) {
      throw new Error(`Failed to fetch commissions: ${commissionsError.message}`);
    }

    console.log('Commissions fetched successfully:', commissions.length);

    return new Response(
      JSON.stringify({
        success: true,
        commissions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error fetching commissions:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to fetch commissions'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      }
    );
  }
});
