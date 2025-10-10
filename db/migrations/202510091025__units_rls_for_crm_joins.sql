-- Migration: Add RLS policy for units to allow CRM joins
-- Description: Enable authenticated users to read units for lead/opportunity references

-- ============================================================================
-- UNITS TABLE RLS POLICY FOR CRM
-- ============================================================================

-- Enable RLS on units if not already enabled
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to SELECT units
-- This is needed for joins from leads, opportunities, and deals tables
-- Note: Adjust this policy if implementing multi-tenant/organization-based access
CREATE POLICY IF NOT EXISTS "units_select_authenticated"
ON public.units
FOR SELECT
TO authenticated
USING (true);

-- Grant SELECT to authenticated role (should already exist but ensuring)
GRANT SELECT ON public.units TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_policy_count integer;
  v_rls_enabled boolean;
BEGIN
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE oid = 'public.units'::regclass;
  
  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'units'
    AND policyname = 'units_select_authenticated';
  
  RAISE NOTICE '✅ Units RLS configuration complete';
  RAISE NOTICE '   - RLS enabled: %', v_rls_enabled;
  RAISE NOTICE '   - SELECT policy exists: %', (v_policy_count > 0);
END $$;

-- Show all policies on units
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'units';

COMMENT ON POLICY "units_select_authenticated" ON public.units IS 
'Allows authenticated users to read units. Required for CRM joins (leads, opportunities, deals). Adjust for multi-tenant if needed.';
