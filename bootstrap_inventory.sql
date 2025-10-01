-- Bootstrap Inventory (public.units) + Public RLS + Seed
-- Run this in Supabase SQL Editor

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create units table (idempotent)
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identification
  category text NOT NULL CHECK (category IN ('truck', 'trailer', 'equipment')),
  make text,
  model text,
  year integer,
  type text,
  
  -- Condition & pricing
  condition text,
  price numeric(12, 2),
  display_price text, -- formatted display price
  status text DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'draft')),
  
  -- Technical specs (core)
  mileage integer,
  engine text,
  transmission text,
  vin text, -- public VIN field
  vin_or_serial text, -- legacy field support
  axles integer,
  color text,
  
  -- Optional technical specs (truck)
  fuel_type text,
  exterior_color text,
  interior_color text,
  sleeper_type text,
  
  -- Optional specs (trailer)
  trailer_type text,
  box_length text,
  gvwr text,
  suspension text,
  tire_size text,
  brake_type text,
  fifth_wheel text,
  landing_gear text,
  door_type text,
  floor_type text,
  roof_type text,
  
  -- Optional specs (equipment)
  equipment_type text,
  bucket_specs text,
  attachments text,
  
  -- Media
  main_photo_url text,
  photos jsonb, -- array of photo objects/urls
  
  -- Content
  description text,
  features jsonb, -- array of feature strings
  
  -- Location
  location text,
  
  -- Publishing & metadata
  slug text UNIQUE,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  listed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Internal fields (never shown publicly)
  hours integer, -- equipment hours
  cost_purchase numeric(12, 2),
  cost_transport_in numeric(12, 2),
  cost_reconditioning numeric(12, 2)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_published_at ON public.units(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);
CREATE INDEX IF NOT EXISTS idx_units_category ON public.units(category);
CREATE INDEX IF NOT EXISTS idx_units_is_published ON public.units(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_units_slug ON public.units(slug) WHERE slug IS NOT NULL;

-- Helper function: check if user is active staff
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if authenticated user exists in public.users with staff role and active status
  -- This assumes a public.users table exists with columns: auth_user_id, role, status
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'sales', 'inventory', 'finance', 'manager')
      AND status = 'active'
  );
$$;

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Policy: anon can SELECT only published units
CREATE POLICY "Public can view published units"
ON public.units
FOR SELECT
TO anon
USING (
  (is_published = true OR published_at IS NOT NULL)
  AND status IN ('available', 'reserved')
);

-- Policy: authenticated can SELECT only published units (unless staff)
CREATE POLICY "Authenticated can view published units"
ON public.units
FOR SELECT
TO authenticated
USING (
  public.is_active_staff() 
  OR (
    (is_published = true OR published_at IS NOT NULL)
    AND status IN ('available', 'reserved')
  )
);

-- Policy: active staff can do everything
CREATE POLICY "Active staff can manage all units"
ON public.units
FOR ALL
TO authenticated
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.units TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.units TO authenticated;

-- Seed demo data (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.units LIMIT 1) THEN
    INSERT INTO public.units (
      category, make, model, year, type, mileage, engine, transmission,
      vin, axles, color, price, display_price, status, condition,
      published_at, is_published, listed_at,
      main_photo_url, photos, description, features, location
    ) VALUES
    (
      'truck',
      'Freightliner',
      'Cascadia',
      2020,
      'Day Cab',
      125000,
      'Detroit DD15',
      'DT12 Automated',
      '1FUJGHDV8LLBXXXXX',
      3,
      'White',
      65000.00,
      '$65,000',
      'available',
      'Excellent',
      now(),
      true,
      now(),
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800',
      '["https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800", "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800"]'::jsonb,
      'Clean 2020 Freightliner Cascadia day cab with Detroit engine. Well maintained, highway miles only.',
      '["Air Ride Suspension", "Aluminum Wheels", "Engine Brake", "Cruise Control"]'::jsonb,
      'Dallas, TX'
    ),
    (
      'trailer',
      'Great Dane',
      'Dry Van',
      2019,
      '53'' Dry Van',
      NULL,
      NULL,
      NULL,
      '1GRAA9626KB123456',
      2,
      'Silver',
      22000.00,
      '$22,000',
      'available',
      'Good',
      now(),
      true,
      now(),
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
      '["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800"]'::jsonb,
      '53 foot dry van trailer. Swing doors, roll-up door. Good rubber, recent inspection.',
      '["Swing Doors", "Roll-Up Door", "Logistic Posts", "Roof in Good Condition"]'::jsonb,
      'Houston, TX'
    ),
    (
      'equipment',
      'Caterpillar',
      '320',
      2018,
      'Excavator',
      NULL,
      'Cat C4.4',
      'Hydrostatic',
      'CAT0320EJYKZ12345',
      NULL,
      'Yellow',
      95000.00,
      '$95,000',
      'available',
      'Very Good',
      now(),
      true,
      now(),
      'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800',
      '["https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800"]'::jsonb,
      '2018 Caterpillar 320 hydraulic excavator. Low hours, well maintained. Includes bucket.',
      '["Hydraulic Thumb", "Pattern Changer", "Aux Hydraulics", "Cab Heat/AC"]'::jsonb,
      'Phoenix, AZ'
    );
    
    RAISE NOTICE 'Seeded 3 demo units into public.units';
  ELSE
    RAISE NOTICE 'Table public.units already contains data, skipping seed';
  END IF;
END $$;

-- ============================================================================
-- OPTIONAL: Storage bucket policies (if using Supabase Storage for photos)
-- ============================================================================
-- Uncomment and run these if you want anon users to read from storage buckets

/*
-- Allow anon to read from common image buckets
CREATE POLICY "Public can view unit images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('units', 'media', 'images', 'public'));

-- Authenticated staff can upload to units bucket
CREATE POLICY "Staff can upload unit images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'units'
  AND public.is_active_staff()
);
*/
