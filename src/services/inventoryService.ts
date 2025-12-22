import { Unit, InventoryFilters, Locale } from '@/types';
import { supabase } from '@/lib/supabaseClient';

// Public API serializer - strips internal-only fields
function serializeForPublic(unit: Unit): Unit {
  const { hours, cost_purchase, cost_transport_in, cost_reconditioning, ...publicFields } = unit;
  return publicFields as Unit;
}

export class InventoryService {
  private static filterUnits(units: Unit[], filters: InventoryFilters): Unit[] {
    return units.filter((unit) => {
      if (filters.category && unit.category !== filters.category) return false;
      if (filters.make && unit.make !== filters.make) return false;
      if (filters.type && unit.type !== filters.type) return false;
      if (filters.status && unit.status !== filters.status) return false;
      if (filters.year_min && unit.year < filters.year_min) return false;
      if (filters.year_max && unit.year > filters.year_max) return false;
      if (filters.mileage_min && (unit.mileage || 0) < filters.mileage_min) return false;
      if (filters.mileage_max && (unit.mileage || 0) > filters.mileage_max) return false;
      return true;
    });
  }

  static async getPublicUnits(filters: InventoryFilters = {}, _lang: Locale = 'en'): Promise<Unit[]> {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return [];
    }

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('listed_at', { ascending: false });

    if (error) {
      console.error('Error fetching public units:', error);
      return [];
    }

    const units = (data || []) as Unit[];
    const filtered = this.filterUnits(units, filters);

    // Strip internal fields using serializer
    return filtered.map(serializeForPublic);
  }

  static async getPublicUnit(idOrSlug: string, _lang: Locale = 'en'): Promise<Unit | null> {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return null;
    }

    // Check if it looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let unit: Unit | null = null;

    if (isUUID) {
      // Try ID lookup first if it's a UUID
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', idOrSlug)
        .eq('status', 'published')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('Error fetching unit by ID:', error);
        return null;
      }
      unit = data as Unit | null;
    } else {
      // Try slug lookup first if not a UUID
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('slug', idOrSlug)
        .eq('status', 'published')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('Error fetching unit by slug:', error);
      }
      unit = data as Unit | null;

      // Fallback to ID if slug not found
      if (!unit) {
        const { data: dataById, error: errorById } = await supabase
          .from('units')
          .select('*')
          .eq('id', idOrSlug)
          .eq('status', 'published')
          .is('deleted_at', null)
          .maybeSingle();

        if (errorById) {
          console.error('Error fetching unit by ID fallback:', errorById);
          return null;
        }
        unit = dataById as Unit | null;
      }
    }

    if (!unit) return null;

    // Strip internal fields using serializer
    return serializeForPublic(unit);
  }

  static async getSimilarUnits(unit: Unit, limit: number = 4): Promise<Unit[]> {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return [];
    }

    // Query for similar units: same category and type, exclude current unit
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('status', 'published')
      .is('deleted_at', null)
      .eq('category', unit.category)
      .eq('type', unit.type)
      .neq('id', unit.id)
      .order('year', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching similar units:', error);
      return [];
    }

    let similar = ((data || []) as Unit[]).map(serializeForPublic);

    // Fallback: if not enough similar units, include same category only
    if (similar.length < limit) {
      const existingIds = [unit.id, ...similar.map(s => s.id)];
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('units')
        .select('*')
        .eq('status', 'published')
        .is('deleted_at', null)
        .eq('category', unit.category)
        .not('id', 'in', `(${existingIds.join(',')})`)
        .order('year', { ascending: false })
        .limit(limit - similar.length);

      if (!fallbackError && fallbackData) {
        const fallback = (fallbackData as Unit[]).map(serializeForPublic);
        similar = [...similar, ...fallback];
      }
    }

    return similar;
  }

  // Category counts API - returns only categories with published units
  static async getCategoryCounts(): Promise<Record<string, number>> {
    if (!supabase) {
      return { truck: 0, trailer: 0, equipment: 0 };
    }

    const { data, error } = await supabase
      .from('units')
      .select('category')
      .eq('status', 'published')
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching category counts:', error);
      return { truck: 0, trailer: 0, equipment: 0 };
    }

    const counts: Record<string, number> = {
      truck: 0,
      trailer: 0,
      equipment: 0,
    };

    (data || []).forEach((row: { category: string }) => {
      if (counts[row.category] !== undefined) {
        counts[row.category]++;
      }
    });

    return counts;
  }

  // Get categories with published units only (for hiding empty categories)
  static async getActiveCategories(): Promise<Array<{ category: string; count: number }>> {
    const counts = await this.getCategoryCounts();
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({ category, count }));
  }

  // Admin APIs - returns all fields including internal ones
  static async getAllUnits(filters: InventoryFilters = {}): Promise<Unit[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all units:', error);
      return [];
    }

    return this.filterUnits((data || []) as Unit[], filters);
  }

  static async getUnit(id: string): Promise<Unit | null> {
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching unit:', error);
      return null;
    }

    return data as Unit | null;
  }

  // Helper methods for filters - only show published units to public
  static async getUniqueMakes(category?: string): Promise<string[]> {
    if (!supabase) {
      return [];
    }

    let query = supabase
      .from('units')
      .select('make')
      .eq('status', 'published')
      .is('deleted_at', null);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching makes:', error);
      return [];
    }

    const makes = [...new Set((data || []).map((row: { make: string }) => row.make))].sort();
    return makes as string[];
  }

  static async getUniqueTypes(category?: string): Promise<string[]> {
    if (!supabase) {
      return [];
    }

    let query = supabase
      .from('units')
      .select('type')
      .eq('status', 'published')
      .is('deleted_at', null);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching types:', error);
      return [];
    }

    const types = [...new Set((data || []).map((row: { type: string }) => row.type))].sort();
    return types as string[];
  }
}
