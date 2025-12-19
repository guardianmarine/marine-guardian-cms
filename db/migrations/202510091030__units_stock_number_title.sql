-- Add stock_number and title columns to units table
-- ==================================================

-- 1) Add columns if they don't exist
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS stock_number text;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS title text;

-- 2) Create index on stock_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_units_stock_number ON public.units(stock_number);

-- 3) Partial unique constraint: stock_number must be unique when not null
-- Drop if exists first to avoid errors on re-run
DROP INDEX IF EXISTS idx_units_stock_number_unique;
CREATE UNIQUE INDEX idx_units_stock_number_unique ON public.units(stock_number) WHERE stock_number IS NOT NULL;

-- 4) Backfill title from make/model/year when title is null
UPDATE public.units
SET title = NULLIF(TRIM(CONCAT_WS(' ', year::text, make, model)), '')
WHERE title IS NULL OR title = '';

-- 5) Create index on title for search/display
CREATE INDEX IF NOT EXISTS idx_units_title ON public.units(title);
