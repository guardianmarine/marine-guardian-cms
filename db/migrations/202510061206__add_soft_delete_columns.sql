-- Add soft delete columns to CRM and inventory tables
-- Idempotent: only add if column doesn't exist

-- accounts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'accounts' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.accounts 
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;
    
    CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at 
    ON public.accounts(deleted_at) 
    WHERE deleted_at IS NULL;
  END IF;
END $$;

-- contacts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.contacts 
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;
    
    CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at 
    ON public.contacts(deleted_at) 
    WHERE deleted_at IS NULL;
  END IF;
END $$;

-- leads
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.leads 
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;
    
    CREATE INDEX IF NOT EXISTS idx_leads_deleted_at 
    ON public.leads(deleted_at) 
    WHERE deleted_at IS NULL;
  END IF;
END $$;

-- opportunities
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'opportunities' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.opportunities 
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;
    
    CREATE INDEX IF NOT EXISTS idx_opportunities_deleted_at 
    ON public.opportunities(deleted_at) 
    WHERE deleted_at IS NULL;
  END IF;
END $$;

-- units
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'units' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.units 
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;
    
    CREATE INDEX IF NOT EXISTS idx_units_deleted_at 
    ON public.units(deleted_at) 
    WHERE deleted_at IS NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.accounts.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN public.contacts.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN public.leads.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN public.opportunities.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN public.units.deleted_at IS 'Soft delete timestamp';
