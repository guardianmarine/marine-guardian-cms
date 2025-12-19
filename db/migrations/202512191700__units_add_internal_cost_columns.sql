-- Add internal cost tracking columns to units table
-- These are internal-only fields, never exposed publicly

-- 1) Add hours column (internal only - engine/equipment hours)
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS hours INTEGER;

-- 2) Add cost tracking columns (internal only)
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_purchase NUMERIC(12,2);

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_transport_in NUMERIC(12,2);

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_reconditioning NUMERIC(12,2);

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_recon_parts NUMERIC(12,2);

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_recon_labor NUMERIC(12,2);

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_detailing NUMERIC(12,2);

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_marketing NUMERIC(12,2);

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_fees NUMERIC(12,2);

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS cost_overhead_applied NUMERIC(12,2);

-- 3) Add additional internal fields that may be in the form
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS acquisition_source TEXT;

ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS condition TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.units.hours IS 'Engine/equipment hours - internal use only';
COMMENT ON COLUMN public.units.cost_purchase IS 'Initial purchase/acquisition cost - internal only';
COMMENT ON COLUMN public.units.cost_transport_in IS 'Inbound shipping/transport cost - internal only';
COMMENT ON COLUMN public.units.cost_reconditioning IS 'Total reconditioning cost - internal only';
COMMENT ON COLUMN public.units.cost_recon_parts IS 'Parts cost for reconditioning - internal only';
COMMENT ON COLUMN public.units.cost_recon_labor IS 'Labor cost for reconditioning - internal only';
COMMENT ON COLUMN public.units.cost_detailing IS 'Detailing/cleaning cost - internal only';
COMMENT ON COLUMN public.units.cost_marketing IS 'Marketing/photography cost - internal only';
COMMENT ON COLUMN public.units.cost_fees IS 'Acquisition fees - internal only';
COMMENT ON COLUMN public.units.cost_overhead_applied IS 'Applied overhead - internal only';

-- Verify the columns were added
DO $$
BEGIN
  RAISE NOTICE 'Internal cost columns added to units table successfully';
END $$;
