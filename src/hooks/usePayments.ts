import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  deal_id: string;
  method: string | null;
  amount: number;
  received_at: string;
  ref: string | null;
  created_at: string;
}

export function usePayments(dealId?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPayments = async () => {
    if (!dealId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('deal_id', dealId)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) {
      fetchPayments();
    }
  }, [dealId]);

  const addPayment = async (dealId: string, paymentData: Omit<Payment, 'id' | 'deal_id' | 'created_at'>) => {
    try {
      const { data: newPayment, error } = await supabase
        .from('payments')
        .insert([{
          deal_id: dealId,
          ...paymentData,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setPayments([newPayment, ...payments]);
      toast({
        title: 'Success',
        description: 'Payment recorded',
      });
      
      return newPayment;
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    payments,
    loading,
    fetchPayments,
    addPayment,
  };
}
