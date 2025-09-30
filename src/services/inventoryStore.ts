import { create } from 'zustand';
import { Unit, UnitPhoto, InventoryEvent } from '@/types';
import { mockUnits } from './mockData';

interface InventoryStore {
  units: Unit[];
  events: InventoryEvent[];
  
  // CRUD operations
  addUnit: (unit: Unit) => void;
  updateUnit: (id: string, data: Partial<Unit>) => void;
  deleteUnit: (id: string) => void;
  
  // Photo operations
  addPhoto: (unitId: string, photo: UnitPhoto) => void;
  updatePhoto: (unitId: string, photoId: string, data: Partial<UnitPhoto>) => void;
  deletePhoto: (unitId: string, photoId: string) => void;
  setMainPhoto: (unitId: string, photoId: string) => void;
  updatePhotoOrder: (unitId: string, photos: UnitPhoto[]) => void;
  
  // Publishing workflow
  publishUnit: (id: string, userId: string) => boolean;
  unpublishUnit: (id: string, userId: string) => void;
  changeStatus: (id: string, status: Unit['status'], userId: string) => void;
  
  // Audit trail
  logEvent: (event: Omit<InventoryEvent, 'id' | 'occurred_at'>) => void;
  getUnitEvents: (unitId: string) => InventoryEvent[];
  
  // Validation
  canPublish: (id: string) => { valid: boolean; errors: string[] };
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  units: mockUnits,
  events: [],

  addUnit: (unit) => {
    set((state) => ({ units: [...state.units, unit] }));
    get().logEvent({
      unit_id: unit.id,
      event_type: 'created',
      data: { unit },
      actor_user_id: '1',
    });
  },

  updateUnit: (id, data) => {
    const oldUnit = get().units.find(u => u.id === id);
    
    set((state) => ({
      units: state.units.map((u) =>
        u.id === id ? { ...u, ...data, updated_at: new Date().toISOString() } : u
      ),
    }));

    // Log price changes
    if (data.display_price !== undefined && oldUnit && oldUnit.display_price !== data.display_price) {
      get().logEvent({
        unit_id: id,
        event_type: 'price_changed',
        data: { 
          old_price: oldUnit.display_price, 
          new_price: data.display_price,
          change: data.display_price - oldUnit.display_price
        },
        actor_user_id: '1',
      });
    }

    get().logEvent({
      unit_id: id,
      event_type: 'updated',
      data: { changes: data },
      actor_user_id: '1',
    });
  },

  deleteUnit: (id) => {
    set((state) => ({ units: state.units.filter((u) => u.id !== id) }));
  },

  addPhoto: (unitId, photo) => {
    set((state) => ({
      units: state.units.map((u) =>
        u.id === unitId
          ? { ...u, photos: [...u.photos, photo], updated_at: new Date().toISOString() }
          : u
      ),
    }));
    get().logEvent({
      unit_id: unitId,
      event_type: 'photo_added',
      data: { photo },
      actor_user_id: '1',
    });
  },

  updatePhoto: (unitId, photoId, data) => {
    set((state) => ({
      units: state.units.map((u) =>
        u.id === unitId
          ? {
              ...u,
              photos: u.photos.map((p) =>
                p.id === photoId ? { ...p, ...data, updated_at: new Date().toISOString() } : p
              ),
              updated_at: new Date().toISOString(),
            }
          : u
      ),
    }));
    get().logEvent({
      unit_id: unitId,
      event_type: 'photo_updated',
      data: { photoId, changes: data },
      actor_user_id: '1',
    });
  },

  deletePhoto: (unitId, photoId) => {
    set((state) => ({
      units: state.units.map((u) =>
        u.id === unitId
          ? {
              ...u,
              photos: u.photos.filter((p) => p.id !== photoId),
              updated_at: new Date().toISOString(),
            }
          : u
      ),
    }));
    get().logEvent({
      unit_id: unitId,
      event_type: 'photo_removed',
      data: { photoId },
      actor_user_id: '1',
    });
  },

  setMainPhoto: (unitId, photoId) => {
    set((state) => ({
      units: state.units.map((u) =>
        u.id === unitId
          ? {
              ...u,
              photos: u.photos.map((p) => ({
                ...p,
                is_main: p.id === photoId,
                updated_at: new Date().toISOString(),
              })),
              updated_at: new Date().toISOString(),
            }
          : u
      ),
    }));
  },

  updatePhotoOrder: (unitId, photos) => {
    set((state) => ({
      units: state.units.map((u) =>
        u.id === unitId
          ? { ...u, photos, updated_at: new Date().toISOString() }
          : u
      ),
    }));
  },

  publishUnit: (id, userId) => {
    const validation = get().canPublish(id);
    if (!validation.valid) {
      return false;
    }

    set((state) => ({
      units: state.units.map((u) =>
        u.id === id
          ? {
              ...u,
              status: 'published',
              listed_at: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
            }
          : u
      ),
    }));

    get().logEvent({
      unit_id: id,
      event_type: 'published',
      data: {},
      actor_user_id: userId,
    });

    return true;
  },

  unpublishUnit: (id, userId) => {
    set((state) => ({
      units: state.units.map((u) =>
        u.id === id
          ? {
              ...u,
              status: 'ready',
              updated_at: new Date().toISOString(),
            }
          : u
      ),
    }));

    get().logEvent({
      unit_id: id,
      event_type: 'unpublished',
      data: {},
      actor_user_id: userId,
    });
  },

  changeStatus: (id, status, userId) => {
    const unit = get().units.find((u) => u.id === id);
    if (!unit) return;

    // Status workflow validation
    const validTransitions: Record<Unit['status'], Unit['status'][]> = {
      draft: ['ready', 'archived'],
      ready: ['published', 'draft', 'archived'],
      published: ['reserved', 'ready', 'archived'],
      reserved: ['sold', 'published', 'archived'],
      sold: ['archived'],
      archived: [],
    };

    if (!validTransitions[unit.status].includes(status)) {
      console.warn(`Invalid status transition from ${unit.status} to ${status}`);
      return;
    }

    const updates: Partial<Unit> = { status, updated_at: new Date().toISOString() };

    // Auto-stamp timestamps
    if (status === 'published' && !unit.listed_at) {
      updates.listed_at = new Date().toISOString().split('T')[0];
    }
    if (status === 'sold' && !unit.sold_at) {
      updates.sold_at = new Date().toISOString().split('T')[0];
    }

    set((state) => ({
      units: state.units.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    }));

    get().logEvent({
      unit_id: id,
      event_type: 'status_changed',
      data: { from: unit.status, to: status },
      actor_user_id: userId,
    });
  },

  logEvent: (event) => {
    const newEvent: InventoryEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      occurred_at: new Date().toISOString(),
    };
    set((state) => ({ events: [newEvent, ...state.events] }));
  },

  getUnitEvents: (unitId) => {
    return get().events.filter((e) => e.unit_id === unitId);
  },

  canPublish: (id) => {
    const unit = get().units.find((u) => u.id === id);
    if (!unit) return { valid: false, errors: ['Unit not found'] };

    const errors: string[] = [];

    // Check photos
    if (unit.photos.length < 4) {
      errors.push('Unit must have at least 4 photos');
    }

    // Check required fields by category
    if (!unit.make) errors.push('Make is required');
    if (!unit.year) errors.push('Year is required');
    if (!unit.model) errors.push('Model is required');
    if (!unit.vin_or_serial) errors.push('VIN/Serial is required');
    if (!unit.type) errors.push('Type is required');
    if (unit.display_price === undefined || unit.display_price <= 0) {
      errors.push('Display price is required');
    }

    // Category-specific validation
    if (unit.category === 'truck' || unit.category === 'equipment') {
      if (!unit.mileage && unit.mileage !== 0) errors.push('Mileage is required for trucks/equipment');
      if (!unit.engine) errors.push('Engine is required for trucks/equipment');
      if (!unit.transmission) errors.push('Transmission is required for trucks/equipment');
      if (!unit.axles) errors.push('Number of axles is required for trucks/equipment');
    }

    if (unit.category === 'trailer') {
      if (!unit.color) errors.push('Color is required for trailers');
    }

    return { valid: errors.length === 0, errors };
  },
}));
