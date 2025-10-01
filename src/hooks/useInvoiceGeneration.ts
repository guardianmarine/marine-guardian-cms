import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Deal } from '@/hooks/useDeals';
import { DealUnit } from '@/hooks/useDealUnits';
import { DealFee } from '@/hooks/useDealFees';

export interface Invoice {
  id: string;
  deal_id: string;
  number: string;
  pdf_url: string | null;
  issued_at: string;
  due_date: string | null;
  created_at: string;
}

export function useInvoiceGeneration() {
  const [generating, setGenerating] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();

  const fetchInvoice = async (dealId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('deal_id', dealId)
        .maybeSingle();

      if (error) throw error;
      setInvoice(data);
      return data;
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  };

  const generateInvoice = async (
    deal: Deal,
    units: DealUnit[],
    fees: DealFee[],
    pdfBlob: Blob
  ) => {
    setGenerating(true);
    try {
      // Step 1: Create or get invoice record
      let invoiceRecord = invoice;
      
      if (!invoiceRecord) {
        const { data: newInvoice, error: createError } = await supabase
          .from('invoices')
          .insert([{
            deal_id: deal.id,
            issued_at: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
          }])
          .select()
          .single();

        if (createError) throw createError;
        invoiceRecord = newInvoice;
        setInvoice(newInvoice);
      }

      // Step 2: Upload PDF blob to Storage
      const fileName = `invoice-${invoiceRecord.number}.pdf`;
      const filePath = `${deal.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Step 3: Generate signed URL (7 days)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('invoices')
        .createSignedUrl(filePath, 7 * 24 * 60 * 60); // 7 days in seconds

      if (urlError) throw urlError;

      // Step 4: Update invoice record with URL
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({ pdf_url: urlData.signedUrl })
        .eq('id', invoiceRecord.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setInvoice(updatedInvoice);

      toast({
        title: 'Success',
        description: 'Invoice generated and saved successfully',
      });

      return updatedInvoice;
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate invoice',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;

      if (invoiceData.pdf_url) {
        // Open signed URL in new tab to download
        window.open(invoiceData.pdf_url, '_blank');
      } else {
        toast({
          title: 'Error',
          description: 'Invoice PDF not found. Please generate it first.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to download invoice',
        variant: 'destructive',
      });
    }
  };

  const copyInvoiceLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'Invoice link copied to clipboard',
    });
  };

  return {
    invoice,
    generating,
    fetchInvoice,
    generateInvoice,
    downloadInvoice,
    copyInvoiceLink,
  };
}
