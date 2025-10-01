import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FeeKind = 'tax' | 'temp_plate' | 'transport' | 'doc' | 'discount' | 'other';

export interface DealFee {
  id: string;
  deal_id: string;
  kind: FeeKind;
  label: string;
  amount: number;
  taxable: boolean;
  sort_order: number;
}

export function useDealFees(dealId?: string) {
  const [fees, setFees] = useState<DealFee[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFees = async () => {
    if (!dealId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deal_fees')
        .select('*')
        .eq('deal_id', dealId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setFees(data || []);
    } catch (error: any) {
      console.error('Error fetching deal fees:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) {
      fetchFees();
    }
  }, [dealId]);

  const addFee = async (dealId: string, feeData: Omit<DealFee, 'id' | 'deal_id'>) => {
    try {
      const { data: newFee, error } = await supabase
        .from('deal_fees')
        .insert([{
          deal_id: dealId,
          ...feeData,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setFees([...fees, newFee]);
      toast({
        title: 'Success',
        description: 'Fee added',
      });
      
      return newFee;
    } catch (error: any) {
      console.error('Error adding fee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add fee',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateFee = async (feeId: string, updates: Partial<DealFee>) => {
    try {
      const { data: updated, error } = await supabase
        .from('deal_fees')
        .update(updates)
        .eq('id', feeId)
        .select()
        .single();

      if (error) throw error;
      
      setFees(fees.map(f => f.id === feeId ? updated : f));
      toast({
        title: 'Success',
        description: 'Fee updated',
      });
      
      return updated;
    } catch (error: any) {
      console.error('Error updating fee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update fee',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeFee = async (feeId: string) => {
    try {
      const { error } = await supabase
        .from('deal_fees')
        .delete()
        .eq('id', feeId);

      if (error) throw error;
      
      setFees(fees.filter(f => f.id !== feeId));
      toast({
        title: 'Success',
        description: 'Fee removed',
      });
    } catch (error: any) {
      console.error('Error removing fee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove fee',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    fees,
    loading,
    fetchFees,
    addFee,
    updateFee,
    removeFee,
  };
}
