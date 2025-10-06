-- Create active views for soft-deleted tables
-- These views filter out deleted records

-- Drop views if they exist (idempotent)
DROP VIEW IF EXISTS public.accounts_active_v CASCADE;
DROP VIEW IF EXISTS public.contacts_active_v CASCADE;
DROP VIEW IF EXISTS public.leads_active_v CASCADE;
DROP VIEW IF EXISTS public.opportunities_active_v CASCADE;
DROP VIEW IF EXISTS public.units_active_v CASCADE;

-- accounts_active_v
CREATE VIEW public.accounts_active_v AS
SELECT * FROM public.accounts
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.accounts_active_v IS 'Active (non-deleted) accounts only';

-- contacts_active_v
CREATE VIEW public.contacts_active_v AS
SELECT * FROM public.contacts
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.contacts_active_v IS 'Active (non-deleted) contacts only';

-- leads_active_v
CREATE VIEW public.leads_active_v AS
SELECT * FROM public.leads
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.leads_active_v IS 'Active (non-deleted) leads only';

-- opportunities_active_v
CREATE VIEW public.opportunities_active_v AS
SELECT * FROM public.opportunities
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.opportunities_active_v IS 'Active (non-deleted) opportunities only';

-- units_active_v
CREATE VIEW public.units_active_v AS
SELECT * FROM public.units
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.units_active_v IS 'Active (non-deleted) units only';

-- Grant permissions (views inherit RLS from base tables)
GRANT SELECT ON public.accounts_active_v TO authenticated, anon;
GRANT SELECT ON public.contacts_active_v TO authenticated, anon;
GRANT SELECT ON public.leads_active_v TO authenticated, anon;
GRANT SELECT ON public.opportunities_active_v TO authenticated, anon;
GRANT SELECT ON public.units_active_v TO authenticated, anon;
