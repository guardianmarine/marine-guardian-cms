-- Add PAC (P-A-C) cost column to units table
-- PAC is a variable admin-only cost that adds to Total Acquisition Cost

ALTER TABLE public.units ADD COLUMN IF NOT EXISTS cost_pac NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN public.units.cost_pac IS 'PAC cost - admin only, variable cost per unit. Adds to Total Acquisition Cost.';

DO $$
BEGIN
  RAISE NOTICE 'Successfully added cost_pac column to units table.';
END $$;
