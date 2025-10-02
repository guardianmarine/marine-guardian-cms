import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Opportunity {
  id: string;
  lead_id?: string;
  account_id: string;
  contact_id?: string;
  unit_id?: string;
  stage: 'new' | 'qualified' | 'quote' | 'negotiation' | 'won' | 'lost';
  amount_cents?: number;
  expected_close_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  account?: {
    id: string;
    name: string;
  };
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  unit?: {
    id: string;
    year: number;
    make: string;
    model: string;
  };
}

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          account:accounts(id, name),
          contact:contacts(id, first_name, last_name),
          unit:units(id, year, make, model)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch opportunities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOpportunityStage = async (
    id: string,
    stage: Opportunity['stage']
  ) => {
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setOpportunities((prev) =>
        prev.map((opp) => (opp.id === id ? { ...opp, stage } : opp))
      );

      toast({
        title: 'Success',
        description: 'Opportunity stage updated',
      });
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update opportunity',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  return {
    opportunities,
    loading,
    fetchOpportunities,
    updateOpportunityStage,
  };
}
