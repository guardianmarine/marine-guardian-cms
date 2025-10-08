-- Migration: Consolidate buyer_requests schema
-- Description: Rename converted_to_lead_id to lead_id and ensure schema consistency
-- This migration must run BEFORE 202510081110__fix_convert_rpc_schema_alignment.sql

-- ============================================================================
-- CONSOLIDATE BUYER_REQUESTS SCHEMA
-- ============================================================================

DO $$
BEGIN
  -- Step 1: Handle converted_to_lead_id → lead_id migration
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'buyer_requests' 
      AND column_name = 'converted_to_lead_id'
  ) THEN
    -- Check if lead_id already exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'buyer_requests' 
        AND column_name = 'lead_id'
    ) THEN
      -- Both columns exist: copy data from converted_to_lead_id to lead_id where lead_id is null
      UPDATE buyer_requests 
      SET lead_id = converted_to_lead_id 
      WHERE lead_id IS NULL AND converted_to_lead_id IS NOT NULL;
      
      -- Drop the old column
      ALTER TABLE buyer_requests DROP COLUMN converted_to_lead_id;
      
      RAISE NOTICE '✅ Migrated data from converted_to_lead_id to lead_id and dropped old column';
    ELSE
      -- Only converted_to_lead_id exists: rename it
      ALTER TABLE buyer_requests 
        RENAME COLUMN converted_to_lead_id TO lead_id;
      
      RAISE NOTICE '✅ Renamed converted_to_lead_id to lead_id';
    END IF;
  ELSE
    -- converted_to_lead_id doesn't exist, check if lead_id exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'buyer_requests' 
        AND column_name = 'lead_id'
    ) THEN
      -- Neither exists: create lead_id
      ALTER TABLE buyer_requests 
        ADD COLUMN lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;
      
      RAISE NOTICE '✅ Created lead_id column';
    ELSE
      RAISE NOTICE '✅ lead_id column already exists';
    END IF;
  END IF;
  
  -- Step 2: Ensure index on lead_id exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public'
      AND tablename = 'buyer_requests'
      AND indexname = 'idx_buyer_requests_lead_id'
  ) THEN
    CREATE INDEX idx_buyer_requests_lead_id 
      ON buyer_requests(lead_id) 
      WHERE lead_id IS NOT NULL;
    
    RAISE NOTICE '✅ Created index idx_buyer_requests_lead_id';
  ELSE
    RAISE NOTICE '✅ Index idx_buyer_requests_lead_id already exists';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show current buyer_requests schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'buyer_requests'
  AND column_name IN ('lead_id', 'converted_to_lead_id', 'converted_to_lead_at', 'status', 'source')
ORDER BY column_name;

-- Count converted requests
SELECT 
  COUNT(*) as total_converted,
  COUNT(lead_id) as with_lead_id
FROM buyer_requests
WHERE converted_to_lead_at IS NOT NULL;
