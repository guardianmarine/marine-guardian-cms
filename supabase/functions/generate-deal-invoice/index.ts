import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateInvoiceRequest {
  pdfBlob: string; // base64 encoded PDF
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

    const url = new URL(req.url);
    const dealId = url.pathname.split('/')[3]; // /api/deals/:id/invoice/generate

    const { pdfBlob, snapshot }: GenerateInvoiceRequest = await req.json();

    console.log('Generating invoice for deal:', dealId);

    // Fetch deal details
    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .select('deal_number')
      .eq('id', dealId)
      .single();

    if (dealError) {
      throw new Error(`Failed to fetch deal: ${dealError.message}`);
    }

    const invoiceNumber = `INV-${deal.deal_number}`;
    const fileName = `${invoiceNumber}.pdf`;

    // Decode base64 and upload to storage
    const pdfData = Uint8Array.from(atob(pdfBlob), c => c.charCodeAt(0));
    
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('invoices')
      .upload(fileName, pdfData, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseClient
      .storage
      .from('invoices')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        deal_id: dealId,
        invoice_number: invoiceNumber,
        issued_at: new Date().toISOString(),
        pdf_url: pdfUrl,
        snapshot: snapshot,
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create invoice record: ${invoiceError.message}`);
    }

    console.log('Invoice generated successfully:', { invoiceNumber, pdfUrl });

    return new Response(
      JSON.stringify({
        success: true,
        invoice,
        pdf_url: pdfUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate invoice'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
