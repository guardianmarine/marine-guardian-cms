-- Migration: Auto-sync denormalized fields in leads table
-- Description: Automatically populate account_name, contact_name, contact_email, contact_phone
--              from accounts and contacts tables when a lead is created or updated
-- Safety: BEFORE triggers, no recursion risk, works with RPC and manual creation

-- ============================================================================
-- DROP EXISTING TRIGGERS AND FUNCTION (if any)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_leads_sync_denorm_insert ON leads;
DROP TRIGGER IF EXISTS trg_leads_sync_denorm_update ON leads;
DROP FUNCTION IF EXISTS sync_lead_denorm_fields();

-- ============================================================================
-- CREATE SYNC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_lead_denorm_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync account_name from accounts table
  IF NEW.account_id IS NOT NULL THEN
    SELECT name 
    INTO NEW.account_name
    FROM accounts
    WHERE id = NEW.account_id;
  ELSE
    -- If account_id is NULL, clear account_name
    NEW.account_name := NULL;
  END IF;
  
  -- Sync contact fields from contacts table
  IF NEW.contact_id IS NOT NULL THEN
    SELECT 
      TRIM(first_name || ' ' || COALESCE(last_name, '')),
      email,
      phone
    INTO 
      NEW.contact_name,
      NEW.contact_email,
      NEW.contact_phone
    FROM contacts
    WHERE id = NEW.contact_id;
  ELSE
    -- If contact_id is NULL, clear contact fields
    NEW.contact_name := NULL;
    NEW.contact_email := NULL;
    NEW.contact_phone := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Trigger on INSERT: Always sync denormalized fields
CREATE TRIGGER trg_leads_sync_denorm_insert
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION sync_lead_denorm_fields();

-- Trigger on UPDATE: Only sync when account_id or contact_id changes
CREATE TRIGGER trg_leads_sync_denorm_update
  BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (
    OLD.account_id IS DISTINCT FROM NEW.account_id 
    OR OLD.contact_id IS DISTINCT FROM NEW.contact_id
  )
  EXECUTE FUNCTION sync_lead_denorm_fields();

-- ============================================================================
-- BACKFILL EXISTING LEADS
-- ============================================================================

-- Update existing leads that have account_id/contact_id but missing denormalized fields
UPDATE leads l
SET 
  account_name = a.name,
  contact_name = TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')),
  contact_email = c.email,
  contact_phone = c.phone
FROM accounts a
LEFT JOIN contacts c ON c.id = l.contact_id
WHERE l.account_id = a.id
  AND (
    l.account_name IS NULL 
    OR l.contact_name IS NULL 
    OR l.contact_email IS NULL
    OR l.contact_phone IS NULL
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify triggers were created
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_leads_sync_denorm_insert'
  ) THEN
    RAISE NOTICE '✅ INSERT trigger created successfully';
  ELSE
    RAISE WARNING '❌ INSERT trigger NOT created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_leads_sync_denorm_update'
  ) THEN
    RAISE NOTICE '✅ UPDATE trigger created successfully';
  ELSE
    RAISE WARNING '❌ UPDATE trigger NOT created';
  END IF;

  -- Verify function was created
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'sync_lead_denorm_fields'
  ) THEN
    RAISE NOTICE '✅ Sync function created successfully';
  ELSE
    RAISE WARNING '❌ Sync function NOT created';
  END IF;
END $$;

-- Show current state of recent leads after backfill
SELECT 
  id,
  account_id,
  contact_id,
  account_name,
  contact_name,
  contact_email,
  contact_phone,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- TESTING NOTES
-- ============================================================================
-- After running this migration:
-- 1. Test converting an inbound request to lead (should auto-populate all fields)
-- 2. Test manually creating a lead with account_id and contact_id (should auto-populate)
-- 3. Test updating a lead's account_id or contact_id (should re-sync fields)
-- 4. Verify in /backoffice/crm/leads that all contact info displays correctly
-- 5. Verify in LeadDetail page that all contact fields are populated
