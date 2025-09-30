export type UserRole = 'admin' | 'inventory' | 'sales' | 'finance' | 'viewer';

export type UnitCategory = 'truck' | 'trailer' | 'equipment';

export type UnitStatus = 'draft' | 'ready' | 'published' | 'reserved' | 'sold' | 'archived';

export type TruckType = 'Sleeper' | 'Daycab' | 'Yard Mule' | 'Box Truck';

export type TrailerType = 'Dry Van' | 'Reefer' | 'Low Boy' | 'Flat Bed' | 'Pneumatic';

export type Locale = 'en' | 'es';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface Unit {
  id: string;
  category: UnitCategory;
  make: string;
  year: number;
  model: string;
  color?: string;
  mileage?: number;
  engine?: string;
  transmission?: string;
  vin_or_serial: string;
  axles?: number;
  type: string;
  hours?: number; // Internal only, never exposed publicly
  display_price: number; // Always shown publicly
  status: UnitStatus;
  received_at: string;
  listed_at?: string;
  sold_at?: string;
  location_id: string;
  location?: Location;
  photos: UnitPhoto[];
  created_at: string;
  updated_at: string;
}

export interface UnitPhoto {
  id: string;
  unit_id: string;
  url: string;
  is_main: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryEvent {
  id: string;
  unit_id: string;
  event_type: 'created' | 'updated' | 'published' | 'unpublished' | 'status_changed' | 'photo_added' | 'photo_removed';
  data: Record<string, any>;
  actor_user_id: string;
  occurred_at: string;
}

export interface MediaAsset {
  id: string;
  file_url: string;
  width: number;
  height: number;
  mime: string;
  size_kb: number;
  focal_x?: number;
  focal_y?: number;
  alt_en?: string;
  alt_es?: string;
  tags?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HeroBlock {
  id: string;
  locale: Locale;
  title: string;
  subtitle: string;
  bg_media_id: string;
  bg_media?: MediaAsset;
  overlay_rgba: string;
  show_search: boolean;
  search_tab: UnitCategory;
  primary_cta_label: string;
  primary_cta_url: string;
  secondary_cta_label?: string;
  secondary_cta_url?: string;
  start_at?: string;
  end_at?: string;
  status: 'draft' | 'published';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Carousel {
  id: string;
  name: string;
  locale: Locale;
  status: 'draft' | 'published';
  items: CarouselItem[];
  created_at: string;
  updated_at: string;
}

export interface CarouselItem {
  id: string;
  carousel_id: string;
  media_id: string;
  media?: MediaAsset;
  title: string;
  body: string;
  cta_label?: string;
  cta_url?: string;
  linked_unit_id?: string;
  sort: number;
  start_at?: string;
  end_at?: string;
  status: 'draft' | 'published';
}

export interface Promotion {
  id: string;
  locale: Locale;
  title: string;
  body: string;
  badge?: string;
  media_id: string;
  media?: MediaAsset;
  target_page: 'home' | 'inventory';
  start_at?: string;
  end_at?: string;
  status: 'draft' | 'published';
}

export interface FeaturedPick {
  id: string;
  unit_id: string;
  unit?: Unit;
  sort: number;
  start_at?: string;
  end_at?: string;
  status: 'draft' | 'published';
}

export interface InventoryFilters {
  category?: UnitCategory;
  make?: string;
  year_min?: number;
  year_max?: number;
  mileage_min?: number;
  mileage_max?: number;
  type?: string;
  status?: UnitStatus;
}
