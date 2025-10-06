-- =================================================================
-- Complete Deals & Invoices System Migration
-- Run this in Supabase SQL Editor
-- =================================================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =================================================================
-- 1. TAX PRESETS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.tax_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('percent', 'fixed')),
  rate numeric(10, 4) NOT NULL,
  apply_scope text NOT NULL DEFAULT 'deal' CHECK (apply_scope IN ('deal', 'unit', 'fee')),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_presets_active ON public.tax_presets(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tax_presets_default ON public.tax_presets(is_default) WHERE is_default = true;

-- =================================================================
-- 2. DEALS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  account_id uuid NULL,
  opportunity_id uuid NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quoted', 'won', 'lost', 'invoiced', 'delivered', 'cancelled')),
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  discounts_total numeric(12, 2) NOT NULL DEFAULT 0,
  fees_total numeric(12, 2) NOT NULL DEFAULT 0,
  tax_total numeric(12, 2) NOT NULL DEFAULT 0,
  total_due numeric(12, 2) NOT NULL DEFAULT 0,
  commission_base numeric(12, 2) NOT NULL DEFAULT 0,
  bill_to jsonb NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_sales_rep ON public.deals(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(created_at DESC);

-- =================================================================
-- 3. DEAL UNITS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.deal_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  unit_id uuid NULL REFERENCES public.units(id) ON DELETE SET NULL,
  price numeric(12, 2) NOT NULL,
  unit_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_units_deal ON public.deal_units(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_units_unit ON public.deal_units(unit_id);

-- =================================================================
-- 4. DEAL FEES TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.deal_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('tax', 'temp_plate', 'transport', 'doc', 'discount', 'other')),
  label text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  taxable boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_fees_deal ON public.deal_fees(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_fees_kind ON public.deal_fees(kind);

-- =================================================================
-- 5. INVOICES TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  number text NOT NULL UNIQUE,
  pdf_url text NULL,
  issued_at date NOT NULL,
  due_date date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_deal ON public.invoices(deal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(number);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON public.invoices(issued_at DESC);

-- =================================================================
-- 6. INVOICE NUMBER GENERATOR
-- =================================================================

-- Create sequence for invoice numbering
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1;

-- Function to generate invoice number: INV-YYYY-####
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  next_num := nextval('public.invoice_number_seq');
  invoice_num := 'INV-' || current_year || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN invoice_num;
END;
$$;

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number := public.generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_invoice_number ON public.invoices;
CREATE TRIGGER trigger_set_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_invoice_number();

-- =================================================================
-- 7. STORAGE BUCKET FOR INVOICES
-- =================================================================

-- Create invoices bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- 8. RLS POLICIES
-- =================================================================

-- Helper function: is_active_staff (reuse if exists)
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'sales', 'inventory', 'finance')
      AND status = 'active'
  );
$$;

-- Enable RLS on all tables
ALTER TABLE public.tax_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Tax Presets Policies
DROP POLICY IF EXISTS "staff_select_tax_presets" ON public.tax_presets;
CREATE POLICY "staff_select_tax_presets"
ON public.tax_presets
FOR SELECT
TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "staff_insert_tax_presets" ON public.tax_presets;
CREATE POLICY "staff_insert_tax_presets"
ON public.tax_presets
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_update_tax_presets" ON public.tax_presets;
CREATE POLICY "staff_update_tax_presets"
ON public.tax_presets
FOR UPDATE
TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_delete_tax_presets" ON public.tax_presets;
CREATE POLICY "staff_delete_tax_presets"
ON public.tax_presets
FOR DELETE
TO authenticated
USING (public.is_active_staff());

-- Deals Policies
DROP POLICY IF EXISTS "staff_select_deals" ON public.deals;
CREATE POLICY "staff_select_deals"
ON public.deals
FOR SELECT
TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "staff_insert_deals" ON public.deals;
CREATE POLICY "staff_insert_deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_staff() AND sales_rep_id = auth.uid());

DROP POLICY IF EXISTS "staff_update_deals" ON public.deals;
CREATE POLICY "staff_update_deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_delete_deals" ON public.deals;
CREATE POLICY "staff_delete_deals"
ON public.deals
FOR DELETE
TO authenticated
USING (public.is_active_staff());

-- Deal Units Policies
DROP POLICY IF EXISTS "staff_select_deal_units" ON public.deal_units;
CREATE POLICY "staff_select_deal_units"
ON public.deal_units
FOR SELECT
TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "staff_insert_deal_units" ON public.deal_units;
CREATE POLICY "staff_insert_deal_units"
ON public.deal_units
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_update_deal_units" ON public.deal_units;
CREATE POLICY "staff_update_deal_units"
ON public.deal_units
FOR UPDATE
TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_delete_deal_units" ON public.deal_units;
CREATE POLICY "staff_delete_deal_units"
ON public.deal_units
FOR DELETE
TO authenticated
USING (public.is_active_staff());

-- Deal Fees Policies
DROP POLICY IF EXISTS "staff_select_deal_fees" ON public.deal_fees;
CREATE POLICY "staff_select_deal_fees"
ON public.deal_fees
FOR SELECT
TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "staff_insert_deal_fees" ON public.deal_fees;
CREATE POLICY "staff_insert_deal_fees"
ON public.deal_fees
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_update_deal_fees" ON public.deal_fees;
CREATE POLICY "staff_update_deal_fees"
ON public.deal_fees
FOR UPDATE
TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_delete_deal_fees" ON public.deal_fees;
CREATE POLICY "staff_delete_deal_fees"
ON public.deal_fees
FOR DELETE
TO authenticated
USING (public.is_active_staff());

-- Invoices Policies
DROP POLICY IF EXISTS "staff_select_invoices" ON public.invoices;
CREATE POLICY "staff_select_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "staff_insert_invoices" ON public.invoices;
CREATE POLICY "staff_insert_invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_update_invoices" ON public.invoices;
CREATE POLICY "staff_update_invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "staff_delete_invoices" ON public.invoices;
CREATE POLICY "staff_delete_invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (public.is_active_staff());

-- Storage Policies for invoices bucket
DROP POLICY IF EXISTS "staff_upload_invoices" ON storage.objects;
CREATE POLICY "staff_upload_invoices"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' AND
  public.is_active_staff()
);

DROP POLICY IF EXISTS "staff_read_invoices" ON storage.objects;
CREATE POLICY "staff_read_invoices"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' AND
  public.is_active_staff()
);

DROP POLICY IF EXISTS "staff_update_invoices_storage" ON storage.objects;
CREATE POLICY "staff_update_invoices_storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoices' AND
  public.is_active_staff()
)
WITH CHECK (
  bucket_id = 'invoices' AND
  public.is_active_staff()
);

DROP POLICY IF EXISTS "staff_delete_invoices_storage" ON storage.objects;
CREATE POLICY "staff_delete_invoices_storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices' AND
  public.is_active_staff()
);

-- =================================================================
-- 9. GRANTS
-- =================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tax_presets TO authenticated;
GRANT ALL ON public.deals TO authenticated;
GRANT ALL ON public.deal_units TO authenticated;
GRANT ALL ON public.deal_fees TO authenticated;
GRANT ALL ON public.invoices TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO authenticated;

-- =================================================================
-- 10. SEED DATA - Tax Presets
-- =================================================================

INSERT INTO public.tax_presets (name, type, rate, apply_scope, is_default, is_active, notes)
VALUES 
  ('Texas Sales Tax', 'percent', 8.25, 'deal', true, true, 'Standard Texas sales tax rate (8.25%)'),
  ('Out-of-State (Exempt)', 'percent', 0.00, 'deal', false, true, 'No sales tax for out-of-state buyers'),
  ('Temporary Plate (TX)', 'fixed', 5.00, 'fee', false, true, 'Texas temporary plate fee')
ON CONFLICT DO NOTHING;

-- =================================================================
-- VERIFICATION QUERIES (read-only)
-- =================================================================

-- Check tables exist
SELECT 'tax_presets exists?' AS check, to_regclass('public.tax_presets') IS NOT NULL AS ok
UNION ALL
SELECT 'deals exists?', to_regclass('public.deals') IS NOT NULL
UNION ALL
SELECT 'deal_units exists?', to_regclass('public.deal_units') IS NOT NULL
UNION ALL
SELECT 'deal_fees exists?', to_regclass('public.deal_fees') IS NOT NULL
UNION ALL
SELECT 'invoices exists?', to_regclass('public.invoices') IS NOT NULL;

-- List tax presets
SELECT name, type, rate, is_active FROM public.tax_presets ORDER BY name;

-- List RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('tax_presets', 'deals', 'deal_units', 'deal_fees', 'invoices')
ORDER BY tablename, policyname;