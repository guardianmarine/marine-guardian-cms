-- Create PAC Ledger table for tracking PAC Fund transactions
-- Credits = PAC assigned to units, Debits = manual fund usage

CREATE TABLE IF NOT EXISTS public.pac_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL, -- nullable for manual debits
  amount NUMERIC(12,2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  note TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pac_ledger_unit_id ON public.pac_ledger(unit_id);
CREATE INDEX IF NOT EXISTS idx_pac_ledger_direction ON public.pac_ledger(direction);
CREATE INDEX IF NOT EXISTS idx_pac_ledger_created_at ON public.pac_ledger(created_at DESC);

-- Enable RLS
ALTER TABLE public.pac_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admin can view/insert
CREATE POLICY pac_ledger_admin_select ON public.pac_ledger
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY pac_ledger_admin_insert ON public.pac_ledger
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY pac_ledger_admin_update ON public.pac_ledger
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY pac_ledger_admin_delete ON public.pac_ledger
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.pac_ledger;

DO $$
BEGIN
  RAISE NOTICE 'Successfully created pac_ledger table with RLS policies.';
END $$;
