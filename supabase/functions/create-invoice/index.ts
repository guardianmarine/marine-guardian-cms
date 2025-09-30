import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateInvoiceRequest {
  dealId: string;
  invoiceNumber: string;
  issuedAt: string;
  pdfUrl: string;
  snapshot: any;
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

    const { dealId, invoiceNumber, issuedAt, pdfUrl, snapshot }: CreateInvoiceRequest = await req.json();

    console.log('Creating invoice record:', { dealId, invoiceNumber });

    // Create invoice record
    const { data: invoiceData, error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        deal_id: dealId,
        invoice_number: invoiceNumber,
        issued_at: issuedAt,
        pdf_url: pdfUrl,
        snapshot: snapshot,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError);
      throw new Error(`Failed to create invoice record: ${invoiceError.message}`);
    }

    console.log('Invoice created successfully:', invoiceData);

    return new Response(
      JSON.stringify({
        success: true,
        invoice: invoiceData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create invoice'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
