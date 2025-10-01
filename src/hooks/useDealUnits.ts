import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Unit } from '@/types';

export interface DealUnit {
  id: string;
  deal_id: string;
  unit_id: string | null;
  price: number;
  unit_snapshot: {
    category: string;
    make: string;
    model: string;
    year: number;
    vin_or_serial: string;
    mileage?: number;
    engine?: string;
    transmission?: string;
    axles?: number;
    color?: string;
    type: string;
  };
  created_at: string;
}

export function useDealUnits(dealId?: string) {
  const [units, setUnits] = useState<DealUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUnits = async () => {
    if (!dealId) return;
    
    setLoading(true);
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
    if (dealId) {
      fetchUnits();
    }
  }, [dealId]);

  const addUnit = async (dealId: string, unit: Unit, price: number) => {
    try {
      const unit_snapshot = {
        category: unit.category,
        make: unit.make,
        model: unit.model,
        year: unit.year,
        vin_or_serial: unit.vin_or_serial,
        mileage: unit.mileage,
        engine: unit.engine,
        transmission: unit.transmission,
        axles: unit.axles,
        color: unit.color,
        type: unit.type,
      };

      const { data: newUnit, error } = await supabase
        .from('deal_units')
        .insert([{
          deal_id: dealId,
          unit_id: unit.id,
          price,
          unit_snapshot,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setUnits([...units, newUnit]);
      toast({
        title: 'Success',
        description: 'Unit added to deal',
      });
      
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

  const updateUnitPrice = async (unitId: string, price: number) => {
    try {
      const { data: updated, error } = await supabase
        .from('deal_units')
        .update({ price })
        .eq('id', unitId)
        .select()
        .single();

      if (error) throw error;
      
      setUnits(units.map(u => u.id === unitId ? updated : u));
      toast({
        title: 'Success',
        description: 'Price updated',
      });
      
      return updated;
    } catch (error: any) {
      console.error('Error updating price:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update price',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeUnit = async (unitId: string) => {
    try {
      const { error } = await supabase
        .from('deal_units')
        .delete()
        .eq('id', unitId);

      if (error) throw error;
      
      setUnits(units.filter(u => u.id !== unitId));
      toast({
        title: 'Success',
        description: 'Unit removed from deal',
      });
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
    updateUnitPrice,
    removeUnit,
  };
}
