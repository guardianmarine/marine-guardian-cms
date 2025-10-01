-- ============================================================================
-- Verification SQL (read-only)
-- Run this in Supabase SQL Editor to verify table setup and RLS policies
-- ============================================================================

-- 1. Check if table exists
SELECT 
  'Table exists?' AS check, 
  (to_regclass('public.units') IS NOT NULL) AS ok;

-- 2. Row count
SELECT 
  'Total row count' AS metric, 
  COUNT(*) AS value 
FROM public.units;

-- 3. Published row count (using both methods)
SELECT 
  'Published count (is_published=true)' AS metric, 
  COUNT(*) AS value 
FROM public.units 
WHERE is_published = true;

SELECT 
  'Published count (published_at + status)' AS metric, 
  COUNT(*) AS value 
FROM public.units 
WHERE published_at IS NOT NULL 
  AND status IN ('available', 'reserved');

-- 4. Combined published count (both methods via OR)
SELECT 
  'Published count (combined OR logic)' AS metric, 
  COUNT(*) AS value 
FROM public.units 
WHERE is_published = true 
   OR (published_at IS NOT NULL AND status IN ('available', 'reserved'));

-- 5. Sample rows (top 3 by published_at)
SELECT 
  id, 
  make, 
  model, 
  year, 
  status, 
  published_at, 
  is_published,
  CASE 
    WHEN main_photo_url IS NOT NULL THEN 'has main_photo_url'
    WHEN photos IS NOT NULL THEN 'has photos jsonb'
    ELSE 'no photos'
  END AS photo_status
FROM public.units
ORDER BY published_at DESC NULLS LAST
LIMIT 3;

-- 6. List RLS policies for public.units
SELECT 
  polname AS policy_name,
  polcmd AS command,
  ARRAY(
    SELECT rolname 
    FROM pg_roles 
    WHERE oid = ANY(polroles)
  ) AS roles,
  pg_get_expr(polqual, polrelid) AS using_clause,
  pg_get_expr(polwithcheck, polrelid) AS with_check_clause
FROM pg_policy
WHERE polrelid = 'public.units'::regclass
ORDER BY polname;

-- 7. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'units';

-- 8. Check grants on public.units
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'units'
ORDER BY grantee, privilege_type;

-- 9. Test anon access (simulated - shows what anon would see)
-- This query uses the same OR logic that the app uses
SELECT 
  id, 
  make, 
  model, 
  year,
  status,
  published_at,
  is_published
FROM public.units
WHERE is_published = true 
   OR (published_at IS NOT NULL AND status IN ('available', 'reserved'))
ORDER BY published_at DESC NULLS LAST
LIMIT 5;

-- 10. Check for units that should be published but aren't visible
SELECT 
  'Units with is_published=true' AS check,
  COUNT(*) AS count
FROM public.units
WHERE is_published = true;

SELECT 
  'Units with published_at + good status' AS check,
  COUNT(*) AS count
FROM public.units
WHERE published_at IS NOT NULL 
  AND status IN ('available', 'reserved');

-- 11. Check for missing required fields (would cause serialization issues)
SELECT 
  id,
  make,
  model,
  year,
  CASE 
    WHEN make IS NULL THEN 'missing make'
    WHEN model IS NULL THEN 'missing model'
    WHEN year IS NULL THEN 'missing year'
    WHEN photos IS NULL AND main_photo_url IS NULL THEN 'missing photos'
    ELSE 'ok'
  END AS validation_issue
FROM public.units
WHERE is_published = true 
   OR (published_at IS NOT NULL AND status IN ('available', 'reserved'))
HAVING CASE 
    WHEN make IS NULL THEN 'missing make'
    WHEN model IS NULL THEN 'missing model'
    WHEN year IS NULL THEN 'missing year'
    WHEN photos IS NULL AND main_photo_url IS NULL THEN 'missing photos'
    ELSE 'ok'
  END != 'ok';

-- ============================================================================
-- Expected Results for a working setup with seeded data:
-- ============================================================================
-- 1. Table exists? → ok: true
-- 2. Total row count → value: 3 (or more)
-- 3. Published count (is_published=true) → value: 3
-- 4. Published count (published_at + status) → value: 3
-- 5. Combined published count → value: 3
-- 6. Sample rows → Shows 3 rows with makes (Freightliner, Great Dane, Caterpillar)
-- 7. List RLS policies → Shows 3 policies (anon, authenticated, staff)
-- 8. RLS enabled → rls_enabled: true
-- 9. Grants → anon: SELECT, authenticated: SELECT/INSERT/UPDATE/DELETE
-- 10. Test anon access → Shows 3 rows
-- ============================================================================
