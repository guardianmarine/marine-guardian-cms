-- =================================================================
-- Complete CRM & Deals Migration
-- Idempotent - safe to run multiple times
-- =================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =================================================================
-- ACCOUNTS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'individual' CHECK (kind IN ('company', 'individual')),
  email text,
  phone text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts(email);

-- =================================================================
-- CONTACTS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_account ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);

-- =================================================================
-- LEADS TABLE (Enhanced)
-- =================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_stage') THEN
    CREATE TYPE lead_stage AS ENUM ('new','contacted','qualified','quoted','negotiation','closed_won','closed_lost');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  stage lead_stage NOT NULL DEFAULT 'new',
  source text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='account_id') THEN
    ALTER TABLE public.leads ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='contact_id') THEN
    ALTER TABLE public.leads ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='unit_id') THEN
    ALTER TABLE public.leads ADD COLUMN unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='stage') THEN
    ALTER TABLE public.leads ADD COLUMN stage lead_stage NOT NULL DEFAULT 'new';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='source') THEN
    ALTER TABLE public.leads ADD COLUMN source text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='owner_user_id') THEN
    ALTER TABLE public.leads ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_account ON public.leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact ON public.leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);

-- =================================================================
-- OPPORTUNITIES TABLE
-- =================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_stage') THEN
    CREATE TYPE opportunity_stage AS ENUM ('new','qualified','quote','negotiation','won','lost');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  stage opportunity_stage NOT NULL DEFAULT 'new',
  amount_cents bigint,
  expected_close_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_lead ON public.opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_account ON public.opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(stage);

-- =================================================================
-- TASKS TABLE
-- =================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_related_type') THEN
    CREATE TYPE task_related_type AS ENUM ('lead','opportunity','deal','account');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('open','done');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_type task_related_type NOT NULL,
  related_id uuid NOT NULL,
  title text NOT NULL,
  due_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status task_status NOT NULL DEFAULT 'open',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_related ON public.tasks(related_type, related_id);

-- =================================================================
-- DEALS TABLE (Enhanced)
-- =================================================================

-- Add columns to existing deals table if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='deals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='account_id') THEN
      ALTER TABLE public.deals ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='contact_id') THEN
      ALTER TABLE public.deals ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='invoice_url') THEN
      ALTER TABLE public.deals ADD COLUMN invoice_url text;
    END IF;
  END IF;
END $$;

-- =================================================================
-- PAYMENTS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL,
  method text,
  received_at timestamptz NOT NULL DEFAULT now(),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_deal ON public.payments(deal_id);

-- =================================================================
-- TAX PRESETS TABLE (Enhanced)
-- =================================================================

-- Add columns if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tax_presets') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_presets' AND column_name='code') THEN
      ALTER TABLE public.tax_presets ADD COLUMN code text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_presets' AND column_name='description') THEN
      ALTER TABLE public.tax_presets ADD COLUMN description text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tax_presets' AND column_name='rules') THEN
      ALTER TABLE public.tax_presets ADD COLUMN rules jsonb;
    END IF;
  END IF;
END $$;

-- =================================================================
-- BUYER REQUESTS (Add unit_id if missing)
-- =================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='buyer_requests') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='buyer_requests' AND column_name='unit_id') THEN
      ALTER TABLE public.buyer_requests ADD COLUMN unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='buyer_requests' AND column_name='converted_to_lead_id') THEN
      ALTER TABLE public.buyer_requests ADD COLUMN converted_to_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =================================================================
-- RLS POLICIES
-- =================================================================

-- Helper function (reuse if exists)
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

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Accounts Policies
DROP POLICY IF EXISTS "staff_all_accounts" ON public.accounts;
CREATE POLICY "staff_all_accounts" ON public.accounts
FOR ALL TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Contacts Policies
DROP POLICY IF EXISTS "staff_all_contacts" ON public.contacts;
CREATE POLICY "staff_all_contacts" ON public.contacts
FOR ALL TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Leads Policies
DROP POLICY IF EXISTS "staff_all_leads" ON public.leads;
CREATE POLICY "staff_all_leads" ON public.leads
FOR ALL TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Opportunities Policies
DROP POLICY IF EXISTS "staff_all_opportunities" ON public.opportunities;
CREATE POLICY "staff_all_opportunities" ON public.opportunities
FOR ALL TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Tasks Policies
DROP POLICY IF EXISTS "staff_view_tasks" ON public.tasks;
CREATE POLICY "staff_view_tasks" ON public.tasks
FOR SELECT TO authenticated
USING (public.is_active_staff() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "staff_manage_tasks" ON public.tasks;
CREATE POLICY "staff_manage_tasks" ON public.tasks
FOR ALL TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Payments Policies
DROP POLICY IF EXISTS "staff_all_payments" ON public.payments;
CREATE POLICY "staff_all_payments" ON public.payments
FOR ALL TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- =================================================================
-- GRANTS
-- =================================================================

GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.opportunities TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.payments TO authenticated;

-- =================================================================
-- SEED DATA
-- =================================================================

-- Update tax presets with rules
UPDATE public.tax_presets 
SET 
  code = 'tx_combo',
  description = 'Texas standard sales tax and fees',
  rules = '{
    "lines": [
      {"id": "tx_title", "kind": "fee", "label": "Title Fee", "formula": "flat", "value": 33.0, "enabledBy": ["tx_combo"]},
      {"id": "sales_tax", "kind": "tax", "label": "Sales Tax TX", "formula": "rate", "value": 0.0825, "enabledBy": ["tx_combo"], "base": "units_subtotal"}
    ]
  }'::jsonb
WHERE name = 'Texas Sales Tax';

UPDATE public.tax_presets 
SET 
  code = 'out_of_state',
  description = 'No sales tax for out-of-state buyers',
  rules = '{
    "lines": [
      {"id": "out_state", "kind": "tax", "label": "Out of State Exempt", "formula": "override", "value": 0, "enabledBy": ["out_of_state"]}
    ]
  }'::jsonb
WHERE name = 'Out-of-State (Exempt)';

UPDATE public.tax_presets 
SET 
  code = 'temp_plate',
  description = 'Texas temporary plate fee',
  rules = '{
    "lines": [
      {"id": "temp_plate", "kind": "fee", "label": "Temp Plate", "formula": "flat", "value": 5.0, "enabledBy": ["temp_plate"]}
    ]
  }'::jsonb
WHERE name = 'Temporary Plate (TX)';

-- Add additional presets
INSERT INTO public.tax_presets (code, name, description, rules, is_active)
VALUES 
  ('transport_in', 'Transport In Fee', 'Transportation fee for vehicle delivery', '{
    "lines": [
      {"id": "transport", "kind": "fee", "label": "Transport Fee", "formula": "flat", "value": 500.0, "enabledBy": ["transport_in"]}
    ]
  }'::jsonb, true),
  ('doc_fee', 'Documentation Fee', 'Standard documentation fee', '{
    "lines": [
      {"id": "doc", "kind": "fee", "label": "Doc Fee", "formula": "flat", "value": 150.0, "enabledBy": ["doc_fee"]}
    ]
  }'::jsonb, true)
ON CONFLICT DO NOTHING;
