-- =============================================
-- CMS Home Hero Setup Migration
-- =============================================
-- Creates site_settings table for managing the public Home hero section
-- with multi-language support (EN/ES), draft/publish workflow, and media storage

-- 1. Create site_settings table (idempotent)
-- =============================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int DEFAULT 1,
  is_published boolean DEFAULT false,
  locale text NOT NULL CHECK (locale IN ('en','es')),
  
  -- Hero Content
  hero_title text,
  hero_subtitle text,
  hero_cta_label text,
  hero_cta_url text,
  hero_image_desktop_url text,
  hero_image_mobile_url text,
  hero_overlay_opacity numeric(3,2) DEFAULT 0.35 CHECK (hero_overlay_opacity >= 0 AND hero_overlay_opacity <= 1),
  hero_alignment text DEFAULT 'center' CHECK (hero_alignment IN ('left','center','right')),
  hero_show_search boolean DEFAULT true,
  
  -- Metadata
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  
  UNIQUE(locale, version)
);

-- Index for quick lookup of published settings
CREATE INDEX IF NOT EXISTS idx_site_settings_published 
  ON public.site_settings(locale, is_published, published_at DESC) 
  WHERE is_published = true;

-- Index for lookup by locale
CREATE INDEX IF NOT EXISTS idx_site_settings_locale 
  ON public.site_settings(locale, updated_at DESC);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_settings
-- =============================================

-- Public read access (anon and authenticated) - only published
DROP POLICY IF EXISTS "Public can view published settings" ON public.site_settings;
CREATE POLICY "Public can view published settings" 
  ON public.site_settings 
  FOR SELECT 
  USING (is_published = true);

-- Staff can view all settings
DROP POLICY IF EXISTS "Staff can view all settings" ON public.site_settings;
CREATE POLICY "Staff can view all settings" 
  ON public.site_settings 
  FOR SELECT 
  TO authenticated
  USING (public.is_active_staff());

-- Staff can insert settings
DROP POLICY IF EXISTS "Staff can insert settings" ON public.site_settings;
CREATE POLICY "Staff can insert settings" 
  ON public.site_settings 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_active_staff());

-- Staff can update settings
DROP POLICY IF EXISTS "Staff can update settings" ON public.site_settings;
CREATE POLICY "Staff can update settings" 
  ON public.site_settings 
  FOR UPDATE 
  TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

-- 2. Create view for published settings
-- =============================================

CREATE OR REPLACE VIEW public.site_settings_published AS
SELECT DISTINCT ON (locale)
  id,
  version,
  locale,
  hero_title,
  hero_subtitle,
  hero_cta_label,
  hero_cta_url,
  hero_image_desktop_url,
  hero_image_mobile_url,
  hero_overlay_opacity,
  hero_alignment,
  hero_show_search,
  published_at,
  updated_at
FROM public.site_settings
WHERE is_published = true
ORDER BY locale, published_at DESC;

-- Grant permissions on the view
GRANT SELECT ON public.site_settings_published TO anon, authenticated;

-- 3. Create media storage bucket
-- =============================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for media bucket
-- =============================================

-- Public read access to media bucket
DROP POLICY IF EXISTS "Public can view media files" ON storage.objects;
CREATE POLICY "Public can view media files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media');

-- Staff can upload to media bucket
DROP POLICY IF EXISTS "Staff can upload media files" ON storage.objects;
CREATE POLICY "Staff can upload media files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' AND
    public.is_active_staff()
  );

-- Staff can update media files
DROP POLICY IF EXISTS "Staff can update media files" ON storage.objects;
CREATE POLICY "Staff can update media files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    public.is_active_staff()
  )
  WITH CHECK (
    bucket_id = 'media' AND
    public.is_active_staff()
  );

-- Staff can delete media files
DROP POLICY IF EXISTS "Staff can delete media files" ON storage.objects;
CREATE POLICY "Staff can delete media files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    public.is_active_staff()
  );

-- 4. Seed initial data (draft versions for EN and ES)
-- =============================================

-- Insert English draft (if no records exist)
INSERT INTO public.site_settings (
  locale,
  is_published,
  hero_title,
  hero_subtitle,
  hero_cta_label,
  hero_cta_url,
  hero_image_desktop_url,
  hero_overlay_opacity,
  hero_alignment,
  hero_show_search
)
SELECT
  'en',
  false,
  'Premium Heavy-Duty Trucks & Trailers',
  'Quality commercial vehicles for your business needs',
  'Browse Inventory',
  '/inventory',
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&q=80',
  0.50,
  'center',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_settings WHERE locale = 'en'
);

-- Insert Spanish draft (if no records exist)
INSERT INTO public.site_settings (
  locale,
  is_published,
  hero_title,
  hero_subtitle,
  hero_cta_label,
  hero_cta_url,
  hero_image_desktop_url,
  hero_overlay_opacity,
  hero_alignment,
  hero_show_search
)
SELECT
  'es',
  false,
  'Camiones y Remolques Premium de Servicio Pesado',
  'Vehículos comerciales de calidad para las necesidades de su negocio',
  'Ver Inventario',
  '/inventory',
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&q=80',
  0.50,
  'center',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_settings WHERE locale = 'es'
);

-- 5. Verification queries
-- =============================================

-- Check site_settings table
SELECT 'site_settings table exists?' AS check,
       to_regclass('public.site_settings') IS NOT NULL AS ok;

-- Check view
SELECT 'site_settings_published view exists?' AS check,
       to_regclass('public.site_settings_published') IS NOT NULL AS ok;

-- Check media bucket
SELECT 'media bucket exists?' AS check,
       EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'media') AS ok;

-- Show seeded data
SELECT locale, is_published, hero_title, updated_at
FROM public.site_settings
ORDER BY locale, updated_at DESC;

-- Done!
SELECT 'CMS Home Hero setup complete!' AS status;
