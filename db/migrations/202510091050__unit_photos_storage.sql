-- Unit Photos Storage Bucket
-- ===========================
-- Creates a storage bucket for unit photos with proper RLS

-- 1) Create the bucket for unit photos (public for viewing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'unit-photos',
  'unit-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2) RLS policies for unit-photos bucket

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete unit photos" ON storage.objects;

-- Public can view all photos in unit-photos bucket
CREATE POLICY "Public can view unit photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'unit-photos');

-- Authenticated users can upload photos
CREATE POLICY "Staff can upload unit photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'unit-photos');

-- Authenticated users can update photos
CREATE POLICY "Staff can update unit photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'unit-photos')
WITH CHECK (bucket_id = 'unit-photos');

-- Authenticated users can delete photos
CREATE POLICY "Staff can delete unit photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'unit-photos');

-- 3) Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- 4) Verify setup
DO $$
BEGIN
  RAISE NOTICE 'unit-photos storage bucket created successfully';
  RAISE NOTICE 'Public: Can view all photos';
  RAISE NOTICE 'Authenticated: Can upload, update, delete photos';
END $$;
