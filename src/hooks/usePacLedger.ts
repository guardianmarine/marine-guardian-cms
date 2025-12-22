import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type PacDirection = 'credit' | 'debit';

export interface PacLedgerEntry {
  id: string;
  unit_id?: string;
  amount: number;
  direction: PacDirection;
  note?: string;
  created_by: string;
  created_at: string;
  // Joined fields
  unit?: {
    id: string;
    make: string;
    model: string;
    year: number;
    vin_or_serial: string;
  };
}

export function usePacLedger(options: { autoFetch?: boolean; showErrors?: boolean } = {}) {
  const { autoFetch = false, showErrors = false } = options;
  const [entries, setEntries] = useState<PacLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pac_ledger')
        .select(`
          *,
          unit:units(id, make, model, year, vin_or_serial)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('PAC ledger table not found - feature not available');
          setTableExists(false);
          return;
        }
        throw error;
      }

      setTableExists(true);
      setEntries(data || []);

      // Calculate balance
      const totalCredits = (data || [])
        .filter(e => e.direction === 'credit')
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const totalDebits = (data || [])
        .filter(e => e.direction === 'debit')
        .reduce((sum, e) => sum + Number(e.amount), 0);
      
      setBalance(totalCredits - totalDebits);
    } catch (error: any) {
      console.error('Error fetching PAC ledger:', error);
      if (showErrors) {
        toast({
          title: 'Error loading PAC Fund',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, showErrors]);

  useEffect(() => {
    if (autoFetch) {
      fetchEntries();
    }
  }, [autoFetch, fetchEntries]);

  const addDebit = async (amount: number, note: string) => {
    if (!user?.id) {
      toast({ title: 'Error', description: 'No user session', variant: 'destructive' });
      return false;
    }

    try {
      const { error } = await supabase
        .from('pac_ledger')
        .insert({
          amount,
          direction: 'debit',
          note,
          created_by: user.id,
          unit_id: null,
        });

      if (error) throw error;

      toast({ title: 'Debit recorded', description: `$${amount.toLocaleString()} deducted from PAC Fund` });
      await fetchEntries();
      return true;
    } catch (error: any) {
      console.error('Error adding debit:', error);
      toast({
        title: 'Error recording debit',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const recordPacChange = async (unitId: string, newPacAmount: number, previousPacAmount: number = 0) => {
    if (!user?.id) {
      console.warn('No user session for PAC ledger');
      return false;
    }

    const difference = newPacAmount - previousPacAmount;
    
    // No change
    if (difference === 0) return true;

    try {
      const direction: PacDirection = difference > 0 ? 'credit' : 'debit';
      const amount = Math.abs(difference);
      const note = difference > 0 
        ? `PAC assigned to unit: $${newPacAmount.toLocaleString()} (added $${amount.toLocaleString()})`
        : `PAC reduced on unit: from $${previousPacAmount.toLocaleString()} to $${newPacAmount.toLocaleString()}`;

      const { error } = await supabase
        .from('pac_ledger')
        .insert({
          unit_id: unitId,
          amount,
          direction,
          note,
          created_by: user.id,
        });

      if (error) {
        // Silently fail if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('PAC ledger table not found - skipping PAC change recording');
          return true;
        }
        throw error;
      }
      return true;
    } catch (error: any) {
      console.error('Error recording PAC change:', error);
      return false;
    }
  };

  return {
    entries,
    loading,
    balance,
    tableExists,
    fetchEntries,
    addDebit,
    recordPacChange,
  };
}
