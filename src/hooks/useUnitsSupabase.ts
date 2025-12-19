import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { Unit, UnitStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface UseUnitsOptions {
  statusFilter?: UnitStatus | 'all';
  publicOnly?: boolean;
}

interface UseUnitsResult {
  units: Unit[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addUnit: (unit: Partial<Unit>) => Promise<Unit | null>;
  updateUnit: (id: string, data: Partial<Unit>) => Promise<Unit | null>;
  deleteUnit: (id: string) => Promise<boolean>;
  publishUnit: (id: string) => Promise<boolean>;
  unpublishUnit: (id: string) => Promise<boolean>;
  changeStatus: (id: string, status: UnitStatus) => Promise<boolean>;
}

export function useUnitsSupabase(options: UseUnitsOptions = {}): UseUnitsResult {
  const { statusFilter = 'all', publicOnly = false } = options;
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch units from Supabase
  const fetchUnits = useCallback(async () => {
    if (!isSupabaseReady() || !supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('units')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Public only shows published
      if (publicOnly) {
        query = query.eq('status', 'published');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching units:', fetchError);
        setError(fetchError.message);
        setUnits([]);
      } else {
        // Transform DB rows to Unit type (handle photos as JSON)
        const transformedUnits = (data || []).map(row => ({
          ...row,
          photos: row.photos || [],
          location: row.location || undefined,
        })) as Unit[];
        setUnits(transformedUnits);
      }
    } catch (err) {
      console.error('Exception fetching units:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, publicOnly]);

  // Initial fetch
  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Add a new unit
  const addUnit = useCallback(async (unitData: Partial<Unit>): Promise<Unit | null> => {
    if (!isSupabaseReady() || !supabase) {
      toast({ title: 'Error', description: 'Supabase not configured', variant: 'destructive' });
      return null;
    }

    try {
      // Only include columns that exist in the DB schema
      const insertData: Record<string, any> = {
        category: unitData.category,
        make: unitData.make,
        year: unitData.year,
        model: unitData.model,
        color: unitData.color,
        mileage: unitData.mileage,
        engine: unitData.engine,
        transmission: unitData.transmission,
        vin_or_serial: unitData.vin_or_serial,
        axles: unitData.axles,
        type: unitData.type,
        hours: unitData.hours,
        display_price: unitData.display_price || 0,
        status: unitData.status || 'draft',
        photos: unitData.photos || [],
        received_at: unitData.received_at,
        listed_at: unitData.listed_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(insertData).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );

      const { data, error: insertError } = await supabase
        .from('units')
        .insert(cleanData)
        .select('*')
        .single();

      if (insertError) {
        console.error('Error inserting unit:', insertError);
        toast({ title: 'Error', description: insertError.message, variant: 'destructive' });
        return null;
      }

      const newUnit = {
        ...data,
        photos: data.photos || [],
      } as Unit;

      // Update local state
      setUnits(prev => [newUnit, ...prev]);

      return newUnit;
    } catch (err) {
      console.error('Exception inserting unit:', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      return null;
    }
  }, [toast]);

  // Update an existing unit
  const updateUnit = useCallback(async (id: string, data: Partial<Unit>): Promise<Unit | null> => {
    if (!isSupabaseReady() || !supabase) {
      toast({ title: 'Error', description: 'Supabase not configured', variant: 'destructive' });
      return null;
    }

    try {
      // Only include columns that exist in the DB schema
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Whitelist of allowed update fields
      const allowedFields = [
        'category', 'make', 'year', 'model', 'color', 'mileage', 'engine',
        'transmission', 'vin_or_serial', 'axles', 'type', 'hours',
        'display_price', 'status', 'photos', 'received_at', 'listed_at', 'sold_at'
      ];

      for (const field of allowedFields) {
        if (data[field as keyof Unit] !== undefined) {
          updateData[field] = data[field as keyof Unit];
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from('units')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating unit:', updateError);
        toast({ title: 'Error', description: updateError.message, variant: 'destructive' });
        return null;
      }

      const updatedUnit = {
        ...updated,
        photos: updated.photos || [],
      } as Unit;

      // Update local state
      setUnits(prev => prev.map(u => u.id === id ? updatedUnit : u));

      return updatedUnit;
    } catch (err) {
      console.error('Exception updating unit:', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      return null;
    }
  }, [toast]);

  // Soft delete a unit
  const deleteUnit = useCallback(async (id: string): Promise<boolean> => {
    if (!isSupabaseReady() || !supabase) {
      toast({ title: 'Error', description: 'Supabase not configured', variant: 'destructive' });
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('units')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting unit:', deleteError);
        toast({ title: 'Error', description: deleteError.message, variant: 'destructive' });
        return false;
      }

      // Update local state
      setUnits(prev => prev.filter(u => u.id !== id));

      return true;
    } catch (err) {
      console.error('Exception deleting unit:', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  // Publish a unit
  const publishUnit = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateUnit(id, {
      status: 'published',
      listed_at: new Date().toISOString().split('T')[0],
    });
    return result !== null;
  }, [updateUnit]);

  // Unpublish a unit
  const unpublishUnit = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateUnit(id, {
      status: 'draft',
    });
    return result !== null;
  }, [updateUnit]);

  // Change status
  const changeStatus = useCallback(async (id: string, status: UnitStatus): Promise<boolean> => {
    const updates: Partial<Unit> = { status };

    // Auto-stamp timestamps
    if (status === 'published') {
      updates.listed_at = new Date().toISOString().split('T')[0];
    }
    if (status === 'sold') {
      updates.sold_at = new Date().toISOString().split('T')[0];
    }

    const result = await updateUnit(id, updates);
    return result !== null;
  }, [updateUnit]);

  return {
    units,
    loading,
    error,
    refetch: fetchUnits,
    addUnit,
    updateUnit,
    deleteUnit,
    publishUnit,
    unpublishUnit,
    changeStatus,
  };
}

// Hook for fetching a single unit by ID
export function useUnitById(id: string | undefined) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUnit() {
      if (!id || !isSupabaseReady() || !supabase) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('units')
          .select('*')
          .eq('id', id)
          .is('deleted_at', null)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No rows returned
            setUnit(null);
          } else {
            console.error('Error fetching unit:', fetchError);
            setError(fetchError.message);
          }
        } else {
          setUnit({
            ...data,
            photos: data.photos || [],
          } as Unit);
        }
      } catch (err) {
        console.error('Exception fetching unit:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchUnit();
  }, [id]);

  return { unit, loading, error };
}

// Hook for public inventory (only published units)
export function usePublicInventory() {
  return useUnitsSupabase({ publicOnly: true });
}
