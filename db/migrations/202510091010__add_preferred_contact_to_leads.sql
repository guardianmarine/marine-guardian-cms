-- Migration: Add preferred_contact column to leads table
-- Description: Stores user's preferred contact method (email, phone, whatsapp)

-- ============================================================================
-- ADD COLUMN
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'preferred_contact'
  ) THEN
    ALTER TABLE public.leads 
    ADD COLUMN preferred_contact text 
    CHECK (preferred_contact IS NULL OR preferred_contact IN ('email', 'phone', 'whatsapp'));
    
    RAISE NOTICE '✅ Added preferred_contact column to leads';
  ELSE
    RAISE NOTICE '⏭️  preferred_contact column already exists in leads';
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEX (optional, for filtering by preferred contact method)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_preferred_contact 
ON public.leads(preferred_contact) 
WHERE preferred_contact IS NOT NULL;

-- ============================================================================
-- BACKFILL FROM BUYER_REQUESTS (if conversion relationship exists)
-- ============================================================================

-- Update existing leads that came from buyer_requests
DO $$
DECLARE
  v_updated_count int;
BEGIN
  -- Only backfill if buyer_requests table exists with lead_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'buyer_requests'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'buyer_requests' 
    AND column_name = 'lead_id'
  ) THEN
    UPDATE leads l
    SET preferred_contact = LOWER(br.preferred_contact)
    FROM buyer_requests br
    WHERE br.lead_id = l.id
      AND br.preferred_contact IS NOT NULL
      AND l.preferred_contact IS NULL;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
      RAISE NOTICE '✅ Backfilled % leads with preferred_contact from buyer_requests', v_updated_count;
    ELSE
      RAISE NOTICE '⏭️  No leads to backfill';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_column_exists boolean;
  v_constraint_exists boolean;
BEGIN
  -- Check column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'preferred_contact'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    RAISE NOTICE '✅ Column leads.preferred_contact exists';
  ELSE
    RAISE WARNING '❌ Column leads.preferred_contact NOT found';
  END IF;
  
  -- Check constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'leads' 
    AND column_name = 'preferred_contact'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE '✅ Check constraint on preferred_contact exists';
  END IF;
END $$;

-- Show sample data
SELECT 
  id,
  account_name,
  contact_email,
  preferred_contact,
  source,
  created_at
FROM leads
WHERE preferred_contact IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
