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
  commission_percent?: number; // Default commission % for sales reps
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
  slug?: string; // SEO-friendly slug
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
  published_at?: string; // Timestamp when published
  is_published?: boolean; // Boolean flag for published
  sold_at?: string;
  location_id: string;
  location?: Location;
  photos: UnitPhoto[];
  // Cost tracking (internal) - complete cost stack
  cost_purchase?: number;
  cost_transport_in?: number;
  cost_reconditioning?: number;
  cost_recon_parts?: number;
  cost_recon_labor?: number;
  cost_detailing?: number;
  cost_marketing?: number;
  cost_fees?: number;
  cost_overhead_applied?: number;
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

// CRM Module Types
export type AccountKind = 'company' | 'individual';
export type LeadSource = 'web_form' | 'phone' | 'whatsapp' | 'email' | 'referral' | 'campaign' | 'other';
export type LeadStatus = 'new' | 'qualified' | 'disqualified' | 'converted';
export type OpportunityStage = 'new' | 'qualified' | 'visit' | 'quote' | 'negotiation' | 'won' | 'lost';
export type OpportunityReasonLost = 'price' | 'timing' | 'specs' | 'financing' | 'inventory' | 'other';
export type ActivityKind = 'note' | 'call' | 'meeting' | 'email' | 'whatsapp' | 'task';
export type ActivityParentType = 'lead' | 'opportunity' | 'account' | 'contact';
export type DocumentParentType = 'account' | 'contact' | 'opportunity';

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  tax_id?: string;
  billing_address?: string;
  billing_state?: string;
  billing_country?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  is_tax_exempt: boolean;
  resale_cert: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  account_id: string;
  account?: Account;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role_title?: string;
  preferred_lang: Locale;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  source: LeadSource;
  account_id?: string;
  account?: Account;
  contact_id?: string;
  contact?: Contact;
  category_interest?: UnitCategory;
  unit_interest_id?: string;
  unit_interest?: Unit;
  status: LeadStatus;
  lead_score: number;
  sla_first_touch_hours: number;
  first_touch_at?: string;
  owner_user_id?: string;
  owner?: User;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  account_id: string;
  account?: Account;
  contact_id?: string;
  contact?: Contact;
  owner_user_id: string;
  owner?: User;
  name: string;
  pipeline_stage: OpportunityStage;
  reason_lost?: OpportunityReasonLost;
  reason_lost_notes?: string;
  expected_close_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OpportunityUnit {
  opportunity_id: string;
  unit_id: string;
  unit?: Unit;
  quantity: number;
  agreed_unit_price?: number;
}

export interface Activity {
  id: string;
  parent_type: ActivityParentType;
  parent_id: string;
  kind: ActivityKind;
  subject: string;
  body?: string;
  due_at?: string;
  completed_at?: string;
  owner_user_id?: string;
  owner?: User;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  parent_type: DocumentParentType;
  parent_id: string;
  name: string;
  file_url: string;
  mime: string;
  size_kb: number;
  uploaded_by: string;
  uploader?: User;
  created_at: string;
}

export interface LeadIntakeLink {
  id: string;
  buyer_request_id: string;
  buyer_request?: BuyerRequest;
  lead_id: string;
  lead?: Lead;
  created_at: string;
}

// Deals & Finance Module Types
export type DealStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'canceled';
export type PaymentMethod = 'wire' | 'ach' | 'check' | 'cash' | 'other';
export type CommissionBasis = 'net';
export type CommissionStatus = 'accrued' | 'payable' | 'paid';
export type FeeCalcType = 'percent' | 'fixed';
export type FeeBase = 'vehicle_subtotal' | 'custom';

export interface Deal {
  id: string;
  opportunity_id: string;
  opportunity?: Opportunity;
  account_id: string;
  account?: Account;
  sales_rep_id: string;
  sales_rep?: User;
  status: DealStatus;
  currency: string; // 'USD'
  vehicle_subtotal: number;
  discounts_total: number;
  taxes_total: number;
  fees_total: number;
  total_due: number;
  amount_paid: number;
  balance_due: number;
  tax_rule_version_id?: string;
  issued_at?: string;
  delivered_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DealUnit {
  deal_id: string;
  unit_id: string;
  unit?: Unit;
  agreed_unit_price: number;
}

export interface DealFee {
  id: string;
  deal_id: string;
  name: string;
  calc_type: FeeCalcType;
  base: FeeBase;
  rate_or_amount: number;
  result_amount: number;
  applies: boolean;
  meta?: Record<string, any>;
  sort: number;
}

export interface Payment {
  id: string;
  deal_id: string;
  deal?: Deal;
  method: PaymentMethod;
  amount: number;
  received_at: string;
  reference?: string;
  notes?: string;
  recorded_by: string;
  recorder?: User;
  created_at: string;
}

export interface Commission {
  id: string;
  deal_id: string;
  deal?: Deal;
  sales_rep_id: string;
  sales_rep?: User;
  basis: CommissionBasis;
  percent?: number;
  flat_amount?: number;
  calculated_amount: number;
  status: CommissionStatus;
  paid_at?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface TaxRegime {
  id: string;
  name: string; // 'TX Combo', 'TX Apportioned', 'Out-of-State', 'Wholesale'
  jurisdiction: string; // 'TX'
  active: boolean;
}

export interface TaxRule {
  id: string;
  tax_regime_id: string;
  tax_regime?: TaxRegime;
  version: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
}

export interface TaxRuleLine {
  id: string;
  tax_rule_id: string;
  name: string; // 'Sales Tax', 'Title', 'Registration', 'Temp Plate'
  calc_type: FeeCalcType;
  base: FeeBase;
  rate_or_amount: number;
  conditions?: Record<string, any>;
  sort: number;
}

export interface Invoice {
  id: string;
  deal_id: string;
  deal?: Deal;
  invoice_number: string;
  issued_at: string;
  pdf_url?: string;
  snapshot: {
    dealer_info: {
      name: string;
      address: string;
      phone: string;
      dealer_numbers?: string;
    };
    purchaser: {
      account_name: string;
      contact_name?: string;
      contact_phone?: string;
      contact_email?: string;
    };
    units: Array<{
      year: number;
      make: string;
      model: string;
      stock_unit: string;
      mileage?: number;
      vin: string;
      price: number;
      location?: string;
    }>;
    terms_of_sale?: string;
    taxes_summary: {
      vehicle_subtotal: number;
      discounts_total: number;
      taxes_total: number;
      fees_total: number;
      total_due: number;
      balance_due: number;
    };
    wire_instructions: string;
    disclaimer: string;
  };
  created_at: string;
  updated_at: string;
}
