import { Unit, InventoryFilters, Locale } from '@/types';
import { mockUnits } from './mockData';
import { isUnitPublished } from '@/lib/publishing-utils';

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
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Use flexible publishing logic to support different schemas
    const publishedUnits = mockUnits.filter((unit) => isUnitPublished(unit));
    const filtered = this.filterUnits(publishedUnits, filters);

    // Strip internal fields using serializer
    return filtered.map(serializeForPublic);
  }

  static async getPublicUnit(id: string, _lang: Locale = 'en'): Promise<Unit | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Use flexible publishing logic
    const unit = mockUnits.find((u) => u.id === id && isUnitPublished(u));
    if (!unit) return null;

    // Strip internal fields using serializer
    return serializeForPublic(unit);
  }

  static async getSimilarUnits(unit: Unit, limit: number = 4): Promise<Unit[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Filter: same category and type, exclude current unit, only published
    const similar = mockUnits
      .filter(
        (u) =>
          u.id !== unit.id &&
          isUnitPublished(u) &&
          u.category === unit.category &&
          u.type === unit.type
      )
      // Sort by closest year (prioritize similar age)
      .sort((a, b) => {
        const aDiff = Math.abs(a.year - unit.year);
        const bDiff = Math.abs(b.year - unit.year);
        return aDiff - bDiff;
      })
      .slice(0, limit)
      .map(serializeForPublic);

    // Fallback: if not enough similar units, include same category only
    if (similar.length < limit) {
      const fallback = mockUnits
        .filter(
          (u) =>
            u.id !== unit.id &&
            isUnitPublished(u) &&
            u.category === unit.category &&
            !similar.find(s => s.id === u.id)
        )
        .sort((a, b) => b.year - a.year)
        .slice(0, limit - similar.length)
        .map(serializeForPublic);
      
      return [...similar, ...fallback];
    }

    return similar;
  }

  // Category counts API - returns only categories with published units
  static getCategoryCounts(): Record<string, number> {
    const counts: Record<string, number> = {
      truck: 0,
      trailer: 0,
      equipment: 0,
    };

    mockUnits
      .filter((u) => isUnitPublished(u))
      .forEach((unit) => {
        counts[unit.category]++;
      });

    return counts;
  }

  // Get categories with published units only (for hiding empty categories)
  static getActiveCategories(): Array<{ category: string; count: number }> {
    const counts = this.getCategoryCounts();
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({ category, count }));
  }

  // Admin APIs - returns all fields including internal ones
  static async getAllUnits(filters: InventoryFilters = {}): Promise<Unit[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return this.filterUnits(mockUnits, filters);
  }

  static async getUnit(id: string): Promise<Unit | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockUnits.find((u) => u.id === id) || null;
  }

  // Helper methods for filters - only show published units to public
  static getUniqueMakes(category?: string): string[] {
    const units = category 
      ? mockUnits.filter((u) => u.category === category && isUnitPublished(u)) 
      : mockUnits.filter(u => isUnitPublished(u));
    return [...new Set(units.map((u) => u.make))].sort();
  }

  static getUniqueTypes(category?: string): string[] {
    const units = category 
      ? mockUnits.filter((u) => u.category === category && isUnitPublished(u)) 
      : mockUnits.filter(u => isUnitPublished(u));
    return [...new Set(units.map((u) => u.type))].sort();
  }
}
