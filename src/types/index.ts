export type UserRole = 'admin' | 'inventory' | 'sales' | 'finance' | 'viewer';

export type UnitCategory = 'truck' | 'trailer' | 'equipment';

export type UnitStatus = 'draft' | 'ready' | 'published' | 'reserved' | 'sold' | 'archived';

export type TruckType = 'Sleeper' | 'Daycab' | 'Yard Mule' | 'Box Truck';

export type TrailerType = 'Dry Van' | 'Reefer' | 'Low Boy' | 'Flat Bed' | 'Pneumatic';

export type Locale = 'en' | 'es';

// Purchasing module types
export type SupplierType = 'individual' | 'company';
export type AcquisitionBatchStatus = 'planned' | 'receiving' | 'received' | 'closed';
export type IntakeSource = 'web_form' | 'phone' | 'email' | 'import' | 'walk_in';
export type PipelineStage = 'new' | 'review' | 'appraised' | 'offer_made' | 'accepted' | 'rejected';
export type ConditionGrade = 'A' | 'B' | 'C' | 'D';
export type PurchaseOrderStatus = 'draft' | 'issued' | 'received' | 'closed' | 'void';
export type ReceivingItemStatus = 'pending' | 'validated' | 'converted';
export type BuyerRequestStatus = 'new' | 'in_review' | 'matched' | 'closed';

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
  // Cost tracking (internal)
  cost_purchase?: number;
  cost_transport_in?: number;
  cost_reconditioning?: number;
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
  event_type: 'created' | 'updated' | 'published' | 'unpublished' | 'status_changed' | 'photo_added' | 'photo_removed' | 'photo_updated' | 'price_changed';
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

// Purchasing Module Interfaces

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AcquisitionBatch {
  id: string;
  supplier_id: string;
  supplier?: Supplier;
  name_or_po: string;
  received_at?: string;
  status: AcquisitionBatchStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseIntake {
  id: string;
  source: IntakeSource;
  supplier_id?: string;
  supplier?: Supplier;
  seller_name: string;
  seller_company?: string;
  email?: string;
  phone?: string;
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
  hours?: number;
  photos: string[];
  documents: string[];
  pipeline_stage: PipelineStage;
  reason_rejected?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Appraisal {
  id: string;
  purchase_intake_id: string;
  purchase_intake?: PurchaseIntake;
  condition_grade?: ConditionGrade;
  valuation_inputs: Record<string, any>;
  est_reconditioning_parts: number;
  est_reconditioning_labor: number;
  est_transport_in: number;
  target_buy_price: number;
  comments?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier?: Supplier;
  acquisition_batch_id?: string;
  acquisition_batch?: AcquisitionBatch;
  po_number: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  fees: number;
  total: number;
  documents: string[];
  issued_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceivingItem {
  id: string;
  acquisition_batch_id: string;
  acquisition_batch?: AcquisitionBatch;
  purchase_intake_id?: string;
  purchase_intake?: PurchaseIntake;
  po_id?: string;
  purchase_order?: PurchaseOrder;
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
  hours?: number;
  condition_report: {
    tire_depths?: Record<string, number>;
    damages?: string[];
    photos?: string[];
    notes?: string;
  };
  cost_purchase: number;
  cost_transport_in: number;
  status: ReceivingItemStatus;
  created_at: string;
  updated_at: string;
}

export interface BuyerRequest {
  id: string;
  locale: Locale;
  requester_name: string;
  email: string;
  phone: string;
  category: UnitCategory;
  desired_make?: string;
  desired_model?: string;
  desired_type?: string;
  year_min?: number;
  year_max?: number;
  mileage_min?: number;
  mileage_max?: number;
  budget_min?: number;
  budget_max?: number;
  location_pref?: string;
  notes?: string;
  status: BuyerRequestStatus;
  created_at: string;
  updated_at: string;
}
