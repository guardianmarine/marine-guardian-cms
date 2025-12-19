-- Units table RLS for inventory CRUD
-- ==================================
-- Staff can CRUD, anon can SELECT published only

-- 1) Ensure RLS is enabled
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing policies to start fresh
DROP POLICY IF EXISTS units_select_authenticated ON public.units;
DROP POLICY IF EXISTS units_select_anon ON public.units;
DROP POLICY IF EXISTS units_insert_staff ON public.units;
DROP POLICY IF EXISTS units_update_staff ON public.units;
DROP POLICY IF EXISTS units_delete_staff ON public.units;
DROP POLICY IF EXISTS units_staff_full_access ON public.units;
DROP POLICY IF EXISTS units_public_view ON public.units;

-- 3) Staff full SELECT access (all non-deleted units)
CREATE POLICY units_select_authenticated
ON public.units
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- 4) Public can only view published units
CREATE POLICY units_select_anon
ON public.units
FOR SELECT
TO anon
USING (status = 'published' AND deleted_at IS NULL);

-- 5) Staff can INSERT
CREATE POLICY units_insert_staff
ON public.units
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6) Staff can UPDATE (non-deleted only)
CREATE POLICY units_update_staff
ON public.units
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (deleted_at IS NULL);

-- 7) Staff can DELETE (soft delete pattern)
CREATE POLICY units_delete_staff
ON public.units
FOR DELETE
TO authenticated
USING (deleted_at IS NULL);

-- 8) Grant permissions to roles
GRANT SELECT ON public.units TO anon;
GRANT ALL ON public.units TO authenticated;

-- 9) Ensure status column has proper default
-- Add default if column exists but has no default
DO $$
BEGIN
  -- Check if status column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'units' 
    AND column_name = 'status'
  ) THEN
    -- Set default to 'draft'
    ALTER TABLE public.units ALTER COLUMN status SET DEFAULT 'draft';
  END IF;
END $$;

-- 10) Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Units RLS policies created successfully';
  RAISE NOTICE 'Staff (authenticated): Full CRUD on non-deleted units';
  RAISE NOTICE 'Public (anon): SELECT on published, non-deleted units only';
END $$;
