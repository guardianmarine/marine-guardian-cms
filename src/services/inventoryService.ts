import { Unit, InventoryFilters, Locale } from '@/types';
import { mockUnits } from './mockData';

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

    const publishedUnits = mockUnits.filter((unit) => unit.status === 'published');
    const filtered = this.filterUnits(publishedUnits, filters);

    // Remove hours from public response
    return filtered.map((unit) => {
      const { hours, ...publicUnit } = unit;
      return publicUnit as Unit;
    });
  }

  static async getPublicUnit(id: string, _lang: Locale = 'en'): Promise<Unit | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const unit = mockUnits.find((u) => u.id === id && u.status === 'published');
    if (!unit) return null;

    // Remove hours from public response
    const { hours, ...publicUnit } = unit;
    return publicUnit as Unit;
  }

  static async getAllUnits(filters: InventoryFilters = {}): Promise<Unit[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return this.filterUnits(mockUnits, filters);
  }

  static async getUnit(id: string): Promise<Unit | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockUnits.find((u) => u.id === id) || null;
  }

  static async getSimilarUnits(unit: Unit, limit: number = 4): Promise<Unit[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Filter: same category and type, exclude current unit, only published
    const similar = mockUnits
      .filter(
        (u) =>
          u.id !== unit.id &&
          u.status === 'published' &&
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
      .map((u) => {
        const { hours, ...publicUnit } = u;
        return publicUnit as Unit;
      });

    // Fallback: if not enough similar units, include same category only
    if (similar.length < limit) {
      const fallback = mockUnits
        .filter(
          (u) =>
            u.id !== unit.id &&
            u.status === 'published' &&
            u.category === unit.category &&
            !similar.find(s => s.id === u.id)
        )
        .sort((a, b) => b.year - a.year)
        .slice(0, limit - similar.length)
        .map((u) => {
          const { hours, ...publicUnit } = u;
          return publicUnit as Unit;
        });
      
      return [...similar, ...fallback];
    }

    return similar;
  }

  static getCategoryCounts(): Record<string, number> {
    const counts = {
      truck: 0,
      trailer: 0,
      equipment: 0,
    };

    mockUnits
      .filter((u) => u.status === 'published')
      .forEach((unit) => {
        counts[unit.category]++;
      });

    return counts;
  }

  static getUniqueMakes(category?: string): string[] {
    const units = category ? mockUnits.filter((u) => u.category === category) : mockUnits;
    return [...new Set(units.map((u) => u.make))].sort();
  }

  static getUniqueTypes(category?: string): string[] {
    const units = category ? mockUnits.filter((u) => u.category === category) : mockUnits;
    return [...new Set(units.map((u) => u.type))].sort();
  }
}
