-- =================================================================
-- Run this in Supabase SQL Editor (buyer_requests + RLS)
-- =================================================================
-- Idempotent script to create public.buyer_requests table with RLS policies
-- for anon INSERT (honeypot check) and authenticated staff SELECT/UPDATE

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create buyer_requests table
CREATE TABLE IF NOT EXISTS public.buyer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NULL REFERENCES public.units(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'info' CHECK (request_type IN ('info', 'wish')),
  name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  preferred_contact text NULL CHECK (preferred_contact IS NULL OR preferred_contact IN ('phone', 'email', 'whatsapp')),
  message text NULL,
  page_url text NULL,
  user_agent text NULL,
  honey text NULL, -- honeypot field (should be empty)
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'converted', 'spam', 'closed')),
  converted_to_lead_id uuid NULL REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_auth uuid NULL -- if logged-in staff submits on behalf of customer
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_buyer_requests_status ON public.buyer_requests(status);
CREATE INDEX IF NOT EXISTS idx_buyer_requests_created_at ON public.buyer_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_requests_unit_id ON public.buyer_requests(unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buyer_requests_type ON public.buyer_requests(request_type);

-- Helper function: is_active_staff (idempotent)
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'sales', 'inventory', 'finance')
      AND status = 'active'
  );
$$;

-- Enable RLS on buyer_requests
ALTER TABLE public.buyer_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: anon can INSERT only (with honeypot check)
DROP POLICY IF EXISTS "anon_insert_buyer_requests" ON public.buyer_requests;
CREATE POLICY "anon_insert_buyer_requests"
ON public.buyer_requests
FOR INSERT
TO anon
WITH CHECK (coalesce(honey, '') = '');

-- Policy 2: authenticated staff can SELECT
DROP POLICY IF EXISTS "staff_select_buyer_requests" ON public.buyer_requests;
CREATE POLICY "staff_select_buyer_requests"
ON public.buyer_requests
FOR SELECT
TO authenticated
USING (public.is_active_staff());

-- Policy 3: authenticated staff can UPDATE
DROP POLICY IF EXISTS "staff_update_buyer_requests" ON public.buyer_requests;
CREATE POLICY "staff_update_buyer_requests"
ON public.buyer_requests
FOR UPDATE
TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.buyer_requests TO anon, authenticated;
GRANT INSERT ON public.buyer_requests TO anon, authenticated;
GRANT UPDATE ON public.buyer_requests TO authenticated;

-- =================================================================
-- Verification Queries (read-only)
-- =================================================================

-- 1. Check table exists
SELECT 'buyer_requests table exists?' AS check, 
       to_regclass('public.buyer_requests') IS NOT NULL AS ok;

-- 2. Row count
SELECT 'buyer_requests row count' AS metric, 
       COUNT(*) AS value 
FROM public.buyer_requests;

-- 3. Sample rows (if any)
SELECT id, request_type, name, email, status, created_at, unit_id
FROM public.buyer_requests
ORDER BY created_at DESC
LIMIT 3;

-- 4. List RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual::text AS using_expr
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'buyer_requests'
ORDER BY policyname;

-- 5. Check is_active_staff function exists
SELECT 'is_active_staff function exists?' AS check,
       to_regprocedure('public.is_active_staff()') IS NOT NULL AS ok;
