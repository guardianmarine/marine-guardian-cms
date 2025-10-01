import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Deal {
  id: string;
  account_id: string | null;
  sales_rep_id: string | null;
  status: 'draft' | 'quoted' | 'won' | 'lost' | 'invoiced' | 'delivered' | 'cancelled';
  currency: string;
  subtotal: number;
  discounts_total: number;
  fees_total: number;
  tax_total: number;
  total_due: number;
  commission_base: number;
  bill_to: any;
  ship_to: any;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealUnit {
  id: string;
  deal_id: string;
  unit_id: string | null;
  price: number;
  unit_snapshot: any;
  created_at: string;
}

export interface DealFee {
  id: string;
  deal_id: string;
  kind: 'tax' | 'temp_plate' | 'transport' | 'doc' | 'discount' | 'other';
  label: string;
  amount: number;
  taxable: boolean;
  sort_order: number;
}

export interface Payment {
  id: string;
  deal_id: string;
  method: string | null;
  amount: number;
  received_at: string;
  ref: string | null;
  created_at: string;
}

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error: any) {
      console.error('Error fetching deals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const createDeal = async (data: Partial<Deal>) => {
    try {
      const { data: newDeal, error } = await supabase
        .from('deals')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      setDeals([newDeal, ...deals]);
      toast({
        title: 'Success',
        description: 'Deal created successfully',
      });
      
      return newDeal;
    } catch (error: any) {
      console.error('Error creating deal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create deal',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateDeal = async (id: string, data: Partial<Deal>) => {
    try {
      const { data: updatedDeal, error } = await supabase
        .from('deals')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setDeals(deals.map(d => d.id === id ? updatedDeal : d));
      return updatedDeal;
    } catch (error: any) {
      console.error('Error updating deal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update deal',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteDeal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDeals(deals.filter(d => d.id !== id));
      toast({
        title: 'Success',
        description: 'Deal deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting deal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete deal',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    deals,
    loading,
    fetchDeals,
    createDeal,
    updateDeal,
    deleteDeal,
  };
}

export function useDealUnits(dealId: string | undefined) {
  const [units, setUnits] = useState<DealUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUnits = async () => {
    if (!dealId) {
      setUnits([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deal_units')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (error: any) {
      console.error('Error fetching deal units:', error);
      toast({
        title: 'Error',
        description: 'Failed to load units',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [dealId]);

  const addUnit = async (data: Partial<DealUnit>) => {
    try {
      const { data: newUnit, error } = await supabase
        .from('deal_units')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      setUnits([...units, newUnit]);
      return newUnit;
    } catch (error: any) {
      console.error('Error adding unit:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add unit',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateUnit = async (id: string, data: Partial<DealUnit>) => {
    try {
      const { data: updatedUnit, error } = await supabase
        .from('deal_units')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setUnits(units.map(u => u.id === id ? updatedUnit : u));
      return updatedUnit;
    } catch (error: any) {
      console.error('Error updating unit:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update unit',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeUnit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deal_units')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setUnits(units.filter(u => u.id !== id));
    } catch (error: any) {
      console.error('Error removing unit:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove unit',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    units,
    loading,
    fetchUnits,
    addUnit,
    updateUnit,
    removeUnit,
  };
}

export function useDealFees(dealId: string | undefined) {
  const [fees, setFees] = useState<DealFee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFees = async () => {
    if (!dealId) {
      setFees([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deal_fees')
        .select('*')
        .eq('deal_id', dealId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setFees(data || []);
    } catch (error: any) {
      console.error('Error fetching fees:', error);
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
    fetchFees();
  }, [dealId]);

  const addFee = async (data: Partial<DealFee>) => {
    try {
      const { data: newFee, error } = await supabase
        .from('deal_fees')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      setFees([...fees, newFee]);
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

  const updateFee = async (id: string, data: Partial<DealFee>) => {
    try {
      const { data: updatedFee, error } = await supabase
        .from('deal_fees')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setFees(fees.map(f => f.id === id ? updatedFee : f));
      return updatedFee;
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

  const removeFee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deal_fees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFees(fees.filter(f => f.id !== id));
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

export function usePayments(dealId: string | undefined) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    if (!dealId) {
      setPayments([]);
      setLoading(false);
      return;
    }

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
    fetchPayments();
  }, [dealId]);

  const addPayment = async (data: Partial<Payment>) => {
    try {
      const { data: newPayment, error } = await supabase
        .from('payments')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      setPayments([newPayment, ...payments]);
      return newPayment;
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add payment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updatePayment = async (id: string, data: Partial<Payment>) => {
    try {
      const { data: updatedPayment, error } = await supabase
        .from('payments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setPayments(payments.map(p => p.id === id ? updatedPayment : p));
      return updatedPayment;
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPayments(payments.filter(p => p.id !== id));
    } catch (error: any) {
      console.error('Error removing payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove payment',
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
    updatePayment,
    removePayment,
  };
}
