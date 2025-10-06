-- crm_soft_delete_and_rpc.sql
-- Add soft delete support and conversion RPC for CRM tables

-- Add deleted_at column to all CRM tables if they don't exist
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add account_name and contact_email/phone columns to leads for easier querying
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_phone text;

-- Create indexes on deleted_at for performance
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON public.accounts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON public.contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON public.leads(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_deleted_at ON public.opportunities(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks(deleted_at) WHERE deleted_at IS NULL;

-- Trigger to auto-populate account_name and contact info in leads
CREATE OR REPLACE FUNCTION public.sync_lead_denormalized_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Populate account_name
  IF NEW.account_id IS NOT NULL THEN
    SELECT name INTO NEW.account_name
    FROM public.accounts
    WHERE id = NEW.account_id;
  END IF;
  
  -- Populate contact_email and contact_phone
  IF NEW.contact_id IS NOT NULL THEN
    SELECT email, phone INTO NEW.contact_email, NEW.contact_phone
    FROM public.contacts
    WHERE id = NEW.contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_denormalized_fields ON public.leads;
CREATE TRIGGER trg_sync_lead_denormalized_fields
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_denormalized_fields();

-- RPC function to convert buyer_request to lead
CREATE OR REPLACE FUNCTION public.convert_buyer_request_to_lead(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_unit_id uuid;
  v_account_id uuid;
  v_contact_id uuid;
  v_lead_id uuid;
  v_first_name text;
  v_last_name text;
  v_name_parts text[];
  v_actor_user uuid;
BEGIN
  -- Get the authenticated user
  v_actor_user := auth.uid();
  
  -- Require authentication with clear error message
  IF v_actor_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Your session may have expired. Please log in and try again.';
  END IF;

  -- Get the buyer request
  SELECT * INTO v_request
  FROM public.buyer_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buyer request with ID % not found', p_request_id;
  END IF;
  
  -- Check if already converted
  IF v_request.status = 'converted' THEN
    RAISE EXCEPTION 'This request has already been converted to a lead';
  END IF;
  
  -- Parse unit ID from page_url if needed
  v_unit_id := v_request.unit_id;
  IF v_unit_id IS NULL AND v_request.page_url IS NOT NULL THEN
    -- Try to extract UUID or slug from URL
    DECLARE
      v_url_segment text;
      v_url_parts text[];
    BEGIN
      v_url_parts := string_to_array(v_request.page_url, '/');
      v_url_segment := v_url_parts[array_length(v_url_parts, 1)];
      
      -- Try UUID lookup first
      IF v_url_segment ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT id INTO v_unit_id FROM public.units WHERE id = v_url_segment::uuid;
      ELSE
        -- Try slug lookup
        SELECT id INTO v_unit_id FROM public.units WHERE slug = v_url_segment;
      END IF;
    END;
  END IF;
  
  -- Split name into first/last
  v_name_parts := regexp_split_to_array(trim(v_request.name), '\s+');
  v_first_name := v_name_parts[1];
  v_last_name := array_to_string(v_name_parts[2:array_length(v_name_parts, 1)], ' ');
  
  -- Check if contact exists by email
  SELECT id, account_id INTO v_contact_id, v_account_id
  FROM public.contacts
  WHERE email = v_request.email
  LIMIT 1;
  
  IF FOUND THEN
    -- Update existing contact
    UPDATE public.contacts
    SET 
      first_name = COALESCE(v_first_name, first_name),
      last_name = COALESCE(v_last_name, last_name),
      phone = COALESCE(v_request.phone, phone),
      updated_at = now()
    WHERE id = v_contact_id;
  ELSE
    -- Check if individual account with this name exists
    SELECT id INTO v_account_id
    FROM public.accounts
    WHERE kind = 'individual' AND name = v_request.name AND deleted_at IS NULL
    LIMIT 1;
    
    -- Create account if needed
    IF NOT FOUND THEN
      INSERT INTO public.accounts (kind, name, created_by)
      VALUES ('individual', v_request.name, v_actor_user)
      RETURNING id INTO v_account_id;
    END IF;
    
    -- Create contact
    INSERT INTO public.contacts (account_id, first_name, last_name, email, phone)
    VALUES (v_account_id, v_first_name, v_last_name, v_request.email, v_request.phone)
    ON CONFLICT (email) DO UPDATE
    SET 
      account_id = EXCLUDED.account_id,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      updated_at = now()
    RETURNING id INTO v_contact_id;
  END IF;
  
  -- Create lead
  INSERT INTO public.leads (account_id, contact_id, unit_id, source, stage, notes, owner_user_id)
  VALUES (v_account_id, v_contact_id, v_unit_id, 'website', 'new', v_request.message, v_actor_user)
  RETURNING id INTO v_lead_id;
  
  -- Mark request as converted
  UPDATE public.buyer_requests
  SET status = 'converted', updated_at = now()
  WHERE id = p_request_id;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'account_id', v_account_id,
    'contact_id', v_contact_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.convert_buyer_request_to_lead(uuid) TO authenticated;
