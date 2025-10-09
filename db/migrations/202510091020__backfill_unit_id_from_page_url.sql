-- Migration: Backfill unit_id from page_url for existing buyer_requests
-- Description: Parse page_url to extract unit UUID and populate unit_id column

-- ============================================================================
-- BACKFILL BUYER_REQUESTS.UNIT_ID
-- ============================================================================

-- Update buyer_requests where unit_id is null but page_url contains a unit UUID
UPDATE public.buyer_requests br
SET unit_id = u.id
FROM public.units u
WHERE br.unit_id IS NULL
  AND br.page_url IS NOT NULL
  -- Match URLs like /unit/<uuid> or /inventory/<uuid>
  AND br.page_url ~* '/(?:unit|inventory)/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})'
  AND (
    -- Extract UUID from URL and match with units table
    substring(br.page_url from '/(?:unit|inventory)/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})')::uuid = u.id
  );

-- ============================================================================
-- BACKFILL LEADS.UNIT_ID FROM BUYER_REQUESTS
-- ============================================================================

-- Update leads where unit_id is null but the source buyer_request has a unit_id
-- This handles cases where leads were created before the unit_id mapping was added
UPDATE public.leads l
SET unit_id = br.unit_id
FROM public.buyer_requests br
WHERE l.unit_id IS NULL
  AND br.lead_id = l.id
  AND br.unit_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_br_updated integer;
  v_leads_updated integer;
  v_br_with_unit integer;
  v_leads_with_unit integer;
BEGIN
  -- Count buyer_requests with unit_id
  SELECT COUNT(*) INTO v_br_with_unit
  FROM public.buyer_requests
  WHERE unit_id IS NOT NULL;
  
  -- Count leads with unit_id
  SELECT COUNT(*) INTO v_leads_with_unit
  FROM public.leads
  WHERE unit_id IS NOT NULL;
  
  RAISE NOTICE '✅ Backfill complete';
  RAISE NOTICE '   - Buyer requests with unit_id: %', v_br_with_unit;
  RAISE NOTICE '   - Leads with unit_id: %', v_leads_with_unit;
END $$;

-- Show sample of backfilled records
SELECT 
  'buyer_requests' as table_name,
  COUNT(*) as records_with_unit_id,
  COUNT(*) FILTER (WHERE page_url IS NOT NULL) as had_page_url
FROM public.buyer_requests
WHERE unit_id IS NOT NULL

UNION ALL

SELECT 
  'leads' as table_name,
  COUNT(*) as records_with_unit_id,
  NULL as had_page_url
FROM public.leads
WHERE unit_id IS NOT NULL;

COMMENT ON COLUMN public.buyer_requests.unit_id IS 
'FK to units table. Captured from form submission when request originates from unit detail page.';

COMMENT ON COLUMN public.leads.unit_id IS 
'FK to units table. Inherited from buyer_requests during conversion, or set directly if lead created manually.';
