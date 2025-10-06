-- crm_core.sql  --------------------------------------------------------------
-- Idempotent script to create CRM core tables (accounts, contacts, leads, opportunities, tasks)
-- Safe to run multiple times

-- Ensure crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper to verify staff (re-use if already exists)
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.status = 'active'
      AND u.role IN ('admin','sales','inventory','finance','manager')
  );
$$;

-- ACCOUNTS -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL CHECK (kind IN ('company','individual')),
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accounts_kind ON public.accounts(kind);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='accounts' AND policyname='staff_can_all_on_accounts'
  ) THEN
    CREATE POLICY staff_can_all_on_accounts
      ON public.accounts
      FOR ALL
      TO authenticated
      USING (public.is_active_staff())
      WITH CHECK (public.is_active_staff());
  END IF;
END $$;

-- CONTACTS -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  first_name    text,
  last_name     text,
  email         text,
  phone         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contacts_email_unique UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts(account_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='contacts' AND policyname='staff_can_all_on_contacts'
  ) THEN
    CREATE POLICY staff_can_all_on_contacts
      ON public.contacts
      FOR ALL
      TO authenticated
      USING (public.is_active_staff())
      WITH CHECK (public.is_active_staff());
  END IF;
END $$;

-- LEADS ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id    uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  unit_id       uuid REFERENCES public.units(id) ON DELETE SET NULL,
  source        text NOT NULL DEFAULT 'website',
  stage         text NOT NULL DEFAULT 'new'
                CHECK (stage IN ('new','qualified','quote','negotiation','closed_won','closed_lost')),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_account ON public.leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact ON public.leads(contact_id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='leads' AND policyname='staff_can_all_on_leads'
  ) THEN
    CREATE POLICY staff_can_all_on_leads
      ON public.leads
      FOR ALL
      TO authenticated
      USING (public.is_active_staff())
      WITH CHECK (public.is_active_staff());
  END IF;
END $$;

-- OPPORTUNITIES --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id    uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  unit_id       uuid REFERENCES public.units(id) ON DELETE SET NULL,
  stage         text NOT NULL DEFAULT 'new'
                CHECK (stage IN ('new','qualified','quote','negotiation','won','lost')),
  amount        numeric,
  expected_close date,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opps_stage ON public.opportunities(stage);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='opportunities' AND policyname='staff_can_all_on_opportunities'
  ) THEN
    CREATE POLICY staff_can_all_on_opportunities
      ON public.opportunities
      FOR ALL
      TO authenticated
      USING (public.is_active_staff())
      WITH CHECK (public.is_active_staff());
  END IF;
END $$;

-- TASKS ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  title         text NOT NULL,
  due_at        timestamptz,
  status        text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','done','canceled')),
  assigned_to   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tasks' AND policyname='staff_can_all_on_tasks'
  ) THEN
    CREATE POLICY staff_can_all_on_tasks
      ON public.tasks
      FOR ALL
      TO authenticated
      USING (public.is_active_staff())
      WITH CHECK (public.is_active_staff());
  END IF;
END $$;

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
