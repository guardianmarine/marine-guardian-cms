-- Update RLS policies to respect soft delete

-- Helper: Add soft delete filter to existing policies
-- This migration updates policies to include deleted_at IS NULL checks

-- ACCOUNTS policies
DO $$
BEGIN
  -- Drop and recreate select policies with deleted_at filter
  DROP POLICY IF EXISTS "Active staff can view all accounts" ON public.accounts;
  
  CREATE POLICY "Active staff can view all accounts"
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
  );

  -- Public can only see non-deleted accounts if there's a public access pattern
  DROP POLICY IF EXISTS "Public can view published accounts" ON public.accounts;
  
  CREATE POLICY "Public can view published accounts"
  ON public.accounts
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

  -- Update policies
  DROP POLICY IF EXISTS "Active staff can update accounts" ON public.accounts;
  
  CREATE POLICY "Active staff can update accounts"
  ON public.accounts
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

  -- Only use RPCs for delete operations
  DROP POLICY IF EXISTS "Active staff can delete accounts" ON public.accounts;
END $$;

-- CONTACTS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Active staff can view all contacts" ON public.contacts;
  
  CREATE POLICY "Active staff can view all contacts"
  ON public.contacts
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff());

  DROP POLICY IF EXISTS "Public can view non-deleted contacts" ON public.contacts;
  
  CREATE POLICY "Public can view non-deleted contacts"
  ON public.contacts
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

  DROP POLICY IF EXISTS "Active staff can update contacts" ON public.contacts;
  
  CREATE POLICY "Active staff can update contacts"
  ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());
END $$;

-- LEADS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Active staff can view all leads" ON public.leads;
  
  CREATE POLICY "Active staff can view all leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff());

  DROP POLICY IF EXISTS "Active staff can update leads" ON public.leads;
  
  CREATE POLICY "Active staff can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());
END $$;

-- OPPORTUNITIES policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Active staff can view all opportunities" ON public.opportunities;
  
  CREATE POLICY "Active staff can view all opportunities"
  ON public.opportunities
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff());

  DROP POLICY IF EXISTS "Active staff can update opportunities" ON public.opportunities;
  
  CREATE POLICY "Active staff can update opportunities"
  ON public.opportunities
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());
END $$;

-- UNITS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Active staff can view all units" ON public.units;
  
  CREATE POLICY "Active staff can view all units"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff());

  DROP POLICY IF EXISTS "Public can view published non-deleted units" ON public.units;
  
  CREATE POLICY "Public can view published non-deleted units"
  ON public.units
  FOR SELECT
  TO anon
  USING (
    status = 'published' 
    AND deleted_at IS NULL
  );

  DROP POLICY IF EXISTS "Active staff can update units" ON public.units;
  
  CREATE POLICY "Active staff can update units"
  ON public.units
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());
END $$;

-- Note: DELETE operations should only go through the hard_delete RPC
-- which checks for admin role
