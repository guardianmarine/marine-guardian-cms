import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecordPaymentRequest {
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  receivedAt: string;
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
    const dealId = url.pathname.split('/')[3]; // /api/deals/:id/payments

    const { amount, paymentMethod, referenceNumber, notes, receivedAt }: RecordPaymentRequest = await req.json();

    console.log('Recording payment for deal:', { dealId, amount, paymentMethod });

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('deal_payments')
      .insert({
        deal_id: dealId,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes,
        received_at: receivedAt,
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // Calculate total payments for this deal
    const { data: allPayments, error: paymentsError } = await supabaseClient
      .from('deal_payments')
      .select('amount')
      .eq('deal_id', dealId);

    if (paymentsError) {
      throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
    }

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    // Update deal with total paid
    const { data: deal, error: updateError } = await supabaseClient
      .from('deals')
      .update({
        amount_paid: totalPaid,
      })
      .eq('id', dealId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update deal: ${updateError.message}`);
    }

    console.log('Payment recorded successfully:', { payment, totalPaid });

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        deal,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error recording payment:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to record payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
