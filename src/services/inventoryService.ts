import { Unit, InventoryFilters, Locale } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { isUnitPublished } from '@/lib/publishing-utils';

// Public API serializer - strips internal-only fields and normalizes data
function serializeForPublic(unit: any): Unit {
  const { hours, cost_purchase, cost_transport_in, cost_reconditioning, ...publicFields } = unit;
  
  // Normalize photos: ensure array of objects with id, url, and is_main
  if (publicFields.photos) {
    if (typeof publicFields.photos === 'string') {
      try {
        publicFields.photos = JSON.parse(publicFields.photos);
      } catch (e) {
        publicFields.photos = [];
      }
    }
    
    // Transform photos to expected format
    if (Array.isArray(publicFields.photos)) {
      publicFields.photos = publicFields.photos.map((p: any, idx: number) => {
        if (typeof p === 'string') {
          return { id: `photo-${idx}`, url: p, is_main: idx === 0 };
        }
        return { 
          id: p.id || `photo-${idx}`, 
          url: p.url || p,
          is_main: p.is_main || idx === 0
        };
      });
    } else {
      publicFields.photos = [];
    }
  } else {
    publicFields.photos = [];
  }
  
  // Add main photo as first photo if no photos exist
  if (publicFields.photos.length === 0 && publicFields.main_photo_url) {
    publicFields.photos = [{ id: 'main', url: publicFields.main_photo_url, is_main: true }];
  }
  
  // Ensure at least one photo is marked as main
  if (publicFields.photos.length > 0 && !publicFields.photos.some((p: any) => p.is_main)) {
    publicFields.photos[0].is_main = true;
  }
  
  // Normalize display_price: prefer numeric price, fallback to display_price text
  if (publicFields.price && typeof publicFields.price === 'number') {
    publicFields.display_price = publicFields.price;
  } else if (publicFields.display_price && typeof publicFields.display_price === 'string') {
    // Parse display_price if it's a formatted string like "$65,000"
    const parsed = parseFloat(publicFields.display_price.replace(/[$,]/g, ''));
    if (!isNaN(parsed)) {
      publicFields.display_price = parsed;
    }
  }
  
  // Normalize VIN: prefer vin over vin_or_serial
  if (!publicFields.vin_or_serial && publicFields.vin) {
    publicFields.vin_or_serial = publicFields.vin;
  }
  
  return publicFields as Unit;
}

// Build base query for published units (defensive - supports multiple schema patterns)
// Two ways a row is considered published:
// 1) is_published = true
// 2) published_at not null AND status in ('available','reserved')
export function getPublishedUnitsQuery(sb = supabase) {
  let q = sb.from('units').select(`
    id, slug, category, make, model, year, mileage, engine, transmission, 
    axles, type, price, display_price, vin, vin_or_serial, color, location, status, 
    listed_at, published_at, is_published, main_photo_url, photos, description, 
    features, fuel_type, exterior_color, interior_color, sleeper_type,
    trailer_type, box_length, gvwr, suspension, tire_size, brake_type,
    fifth_wheel, landing_gear, door_type, floor_type, roof_type,
    equipment_type, bucket_specs, attachments, condition
  `);

  // Use OR with Supabase syntax for both publishing methods
  q = q.or(
    'is_published.eq.true,and(published_at.not.is.null,status.in.(available,reserved))'
  );

  return q;
}

export class InventoryService {
  static async getPublicUnits(filters: InventoryFilters = {}, _lang: Locale = 'en'): Promise<Unit[]> {
    try {
      let query = getPublishedUnitsQuery();

      // Apply filters only if they have values (defensive)
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.make) {
        query = query.ilike('make', `%${filters.make}%`);
      }
      if (filters.type) {
        query = query.ilike('type', `%${filters.type}%`);
      }
      if (filters.year_min !== undefined && filters.year_min !== null) {
        query = query.gte('year', filters.year_min);
      }
      if (filters.year_max !== undefined && filters.year_max !== null) {
        query = query.lte('year', filters.year_max);
      }
      if (filters.mileage_min !== undefined && filters.mileage_min !== null) {
        query = query.gte('mileage', filters.mileage_min);
      }
      if (filters.mileage_max !== undefined && filters.mileage_max !== null) {
        query = query.lte('mileage', filters.mileage_max);
      }

      query = query.order('published_at', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching public units:', error);
        return [];
      }

      // Strip internal fields - no additional filtering needed (RLS + query already handles it)
      return (data || []).map(serializeForPublic);
    } catch (error) {
      console.error('Exception fetching public units:', error);
      return [];
    }
  }

  static async getPublicUnit(idOrSlug: string, _lang: Locale = 'en'): Promise<Unit | null> {
    try {
      // Determine if it looks like a slug (contains hyphens) or a UUID
      const isLikelySlug = idOrSlug.includes('-') && !idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      let unit = null;
      let error = null;

      if (isLikelySlug) {
        // Try by slug first
        const slugResult = await getPublishedUnitsQuery()
          .eq('slug', idOrSlug)
          .maybeSingle();
        unit = slugResult.data;
        error = slugResult.error;

        // If not found by slug, try by ID
        if (!unit && !error) {
          const idResult = await getPublishedUnitsQuery()
            .eq('id', idOrSlug)
            .maybeSingle();
          unit = idResult.data;
          error = idResult.error;
        }
      } else {
        // Try by ID first
        const idResult = await getPublishedUnitsQuery()
          .eq('id', idOrSlug)
          .maybeSingle();
        unit = idResult.data;
        error = idResult.error;

        // If not found by ID, try by slug
        if (!unit && !error) {
          const slugResult = await getPublishedUnitsQuery()
            .eq('slug', idOrSlug)
            .maybeSingle();
          unit = slugResult.data;
          error = slugResult.error;
        }
      }

      if (error) {
        console.error('Error fetching public unit:', error);
        return null;
      }

      if (!unit) {
        return null;
      }

      return serializeForPublic(unit);
    } catch (error) {
      console.error('Exception fetching public unit:', error);
      return null;
    }
  }

  static async getSimilarUnits(unit: Unit, limit: number = 4): Promise<Unit[]> {
    // Filter: same category and type, exclude current unit, only published
    const { data: similar } = await getPublishedUnitsQuery()
      .neq('id', unit.id)
      .eq('category', unit.category)
      .eq('type', unit.type)
      .order('year', { ascending: false })
      .limit(limit);

    const similarUnits = (similar || [])
      .filter((u) => isUnitPublished(u))
      .map(serializeForPublic);

    // Fallback: if not enough similar units, include same category only
    if (similarUnits.length < limit) {
      const { data: fallback } = await getPublishedUnitsQuery()
        .neq('id', unit.id)
        .eq('category', unit.category)
        .order('year', { ascending: false })
        .limit(limit - similarUnits.length);

      const fallbackUnits = (fallback || [])
        .filter((u) => isUnitPublished(u) && !similarUnits.find((s) => s.id === u.id))
        .map(serializeForPublic);

      return [...similarUnits, ...fallbackUnits];
    }

    return similarUnits;
  }

  // Category counts API - returns only categories with published units
  static async getCategoryCounts(): Promise<Record<string, number>> {
    const { data } = await getPublishedUnitsQuery().select('category');

    const counts: Record<string, number> = {
      truck: 0,
      trailer: 0,
      equipment: 0,
    };

    (data || [])
      .filter((u) => isUnitPublished(u))
      .forEach((unit) => {
        if (unit.category && counts[unit.category] !== undefined) {
          counts[unit.category]++;
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
    let query = supabase.from('units').select('*');

    if (filters.category) query = query.eq('category', filters.category);
    if (filters.make) query = query.ilike('make', `%${filters.make}%`);
    if (filters.type) query = query.ilike('type', `%${filters.type}%`);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.year_min) query = query.gte('year', filters.year_min);
    if (filters.year_max) query = query.lte('year', filters.year_max);
    if (filters.mileage_min) query = query.gte('mileage', filters.mileage_min);
    if (filters.mileage_max) query = query.lte('mileage', filters.mileage_max);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all units:', error);
      return [];
    }

    return data || [];
  }

  static async getUnit(id: string): Promise<Unit | null> {
    const { data: unit, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching unit:', error);
      return null;
    }

    return unit;
  }

  // Helper methods for filters - only show published units to public
  static async getUniqueMakes(category?: string): Promise<string[]> {
    try {
      let query = getPublishedUnitsQuery();
      
      if (category) {
        query = query.eq('category', category);
      }

      const { data } = await query.select('make');
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      const makes = data
        .filter((u) => u.make && isUnitPublished(u))
        .map((u) => u.make);
      
      return [...new Set(makes)].sort();
    } catch (error) {
      console.error('Error fetching unique makes:', error);
      return [];
    }
  }

  static async getUniqueTypes(category?: string): Promise<string[]> {
    try {
      let query = getPublishedUnitsQuery();
      
      if (category) {
        query = query.eq('category', category);
      }

      const { data } = await query.select('type');
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      const types = data
        .filter((u) => u.type && isUnitPublished(u))
        .map((u) => u.type);
      
      return [...new Set(types)].sort();
    } catch (error) {
      console.error('Error fetching unique types:', error);
      return [];
    }
  }
}
