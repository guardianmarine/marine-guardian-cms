import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TaxPreset {
  id: string;
  name: string;
  type: 'percent' | 'fixed';
  rate: number;
  apply_scope: 'deal' | 'unit' | 'fee';
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTaxPresets() {
  const [presets, setPresets] = useState<TaxPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_presets')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setPresets(data || []);
    } catch (error: any) {
      console.error('Error fetching tax presets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax presets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const createPreset = async (data: Partial<TaxPreset>) => {
    try {
      const { data: newPreset, error } = await supabase
        .from('tax_presets')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      setPresets([...presets, newPreset]);
      toast({
        title: 'Success',
        description: 'Tax preset created successfully',
      });
      
      return newPreset;
    } catch (error: any) {
      console.error('Error creating preset:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create preset',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updatePreset = async (id: string, data: Partial<TaxPreset>) => {
    try {
      const { data: updatedPreset, error } = await supabase
        .from('tax_presets')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setPresets(presets.map(p => p.id === id ? updatedPreset : p));
      toast({
        title: 'Success',
        description: 'Tax preset updated successfully',
      });
      
      return updatedPreset;
    } catch (error: any) {
      console.error('Error updating preset:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update preset',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletePreset = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tax_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPresets(presets.filter(p => p.id !== id));
      toast({
        title: 'Success',
        description: 'Tax preset deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting preset:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete preset',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    presets,
    loading,
    fetchPresets,
    createPreset,
    updatePreset,
    deletePreset,
  };
}
