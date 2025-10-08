-- Migration: Add conversion tracking fields to buyer_requests
-- Description: Adds converted_to_lead_at and source columns needed by convert_buyer_request_to_lead RPC

-- ============================================================================
-- ADD MISSING COLUMNS
-- ============================================================================

-- Add converted_to_lead_at timestamp column
ALTER TABLE public.buyer_requests 
  ADD COLUMN IF NOT EXISTS converted_to_lead_at timestamptz NULL;

-- Add source column to track where the request came from
ALTER TABLE public.buyer_requests 
  ADD COLUMN IF NOT EXISTS source text NULL;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index for filtering converted requests
CREATE INDEX IF NOT EXISTS idx_buyer_requests_converted 
  ON public.buyer_requests(converted_to_lead_at) 
  WHERE converted_to_lead_at IS NOT NULL;

-- Index for source analysis
CREATE INDEX IF NOT EXISTS idx_buyer_requests_source 
  ON public.buyer_requests(source) 
  WHERE source IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES (Read-only, safe to run)
-- ============================================================================

-- Verify columns exist
DO $$
DECLARE
  v_converted_col_exists boolean;
  v_source_col_exists boolean;
BEGIN
  -- Check converted_to_lead_at column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'buyer_requests' 
      AND column_name = 'converted_to_lead_at'
  ) INTO v_converted_col_exists;

  -- Check source column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'buyer_requests' 
      AND column_name = 'source'
  ) INTO v_source_col_exists;

  -- Report results
  IF v_converted_col_exists AND v_source_col_exists THEN
    RAISE NOTICE '✅ Migration successful: All columns exist';
    RAISE NOTICE '   - converted_to_lead_at: %', v_converted_col_exists;
    RAISE NOTICE '   - source: %', v_source_col_exists;
  ELSE
    RAISE WARNING '⚠️  Migration incomplete:';
    RAISE WARNING '   - converted_to_lead_at: %', v_converted_col_exists;
    RAISE WARNING '   - source: %', v_source_col_exists;
  END IF;
END $$;

-- Show column details
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'buyer_requests'
  AND column_name IN ('converted_to_lead_at', 'source')
ORDER BY column_name;
