-- =============================================================================
-- COMPLETE FIX FOR created_by SYSTEM
-- This migration:
-- 1. Ensures created_by columns exist
-- 2. Drops incorrect FKs pointing to public.users
-- 3. Creates correct FKs pointing to auth.users
-- 4. Implements the _force_created_by trigger system
-- 5. Recreates convert_buyer_request_to_lead RPC
-- =============================================================================

-- =============================================================================
-- PART 1: ENSURE created_by COLUMNS EXIST
-- =============================================================================

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- =============================================================================
-- PART 2: DROP INCORRECT FOREIGN KEYS
-- =============================================================================

-- Drop any existing FKs that might be pointing to wrong tables
ALTER TABLE public.accounts 
  DROP CONSTRAINT IF EXISTS accounts_created_by_fkey,
  DROP CONSTRAINT IF EXISTS fk_accounts_created_by;

ALTER TABLE public.contacts 
  DROP CONSTRAINT IF EXISTS contacts_created_by_fkey,
  DROP CONSTRAINT IF EXISTS fk_contacts_created_by;

ALTER TABLE public.leads 
  DROP CONSTRAINT IF EXISTS leads_created_by_fkey,
  DROP CONSTRAINT IF EXISTS fk_leads_created_by;

-- =============================================================================
-- PART 3: NUCLEAR CLEANUP OF OLD SYSTEM
-- =============================================================================

-- Drop all DEFAULT constraints on created_by
ALTER TABLE public.accounts ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.contacts ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.leads ALTER COLUMN created_by DROP DEFAULT;

-- Drop all existing triggers
DROP TRIGGER IF EXISTS trg_accounts_force_created_by ON public.accounts;
DROP TRIGGER IF EXISTS trg_contacts_force_created_by ON public.contacts;
DROP TRIGGER IF EXISTS trg_leads_force_created_by ON public.leads;

-- Drop _default_owner_user triggers if they exist
DROP TRIGGER IF EXISTS _default_owner_user ON public.accounts;
DROP TRIGGER IF EXISTS _default_owner_user ON public.contacts;
DROP TRIGGER IF EXISTS _default_owner_user ON public.leads;

-- Drop old functions
DROP FUNCTION IF EXISTS public._force_created_by() CASCADE;
DROP FUNCTION IF EXISTS public._default_owner_user() CASCADE;

-- Drop the old RPC
DROP FUNCTION IF EXISTS public.convert_buyer_request_to_lead(uuid) CASCADE;

-- =============================================================================
-- PART 4: CREATE CORRECT FOREIGN KEYS TO auth.users
-- =============================================================================

ALTER TABLE public.accounts 
  ADD CONSTRAINT accounts_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE public.contacts 
  ADD CONSTRAINT contacts_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE public.leads 
  ADD CONSTRAINT leads_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- =============================================================================
-- PART 5: RECREATE _force_created_by TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public._force_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user uuid;
  v_fallback_user uuid;
BEGIN
  -- Only set created_by if it's NULL
  IF NEW.created_by IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Try to get authenticated user
  v_auth_user := auth.uid();
  
  IF v_auth_user IS NOT NULL THEN
    -- Verify user exists in auth.users
    IF EXISTS(SELECT 1 FROM auth.users WHERE id = v_auth_user AND deleted_at IS NULL) THEN
      NEW.created_by := v_auth_user;
      RETURN NEW;
    END IF;
  END IF;
  
  -- Fallback: find any valid user in auth.users
  SELECT id INTO v_fallback_user
  FROM auth.users
  WHERE deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
  
  IF v_fallback_user IS NOT NULL THEN
    NEW.created_by := v_fallback_user;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public._force_created_by() IS 
'Automatically sets created_by field on insert. Uses auth.uid() or falls back to first available user.';

-- =============================================================================
-- PART 6: CREATE TRIGGERS ON TABLES
-- =============================================================================

CREATE TRIGGER trg_accounts_force_created_by
  BEFORE INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public._force_created_by();

CREATE TRIGGER trg_contacts_force_created_by
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public._force_created_by();

CREATE TRIGGER trg_leads_force_created_by
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public._force_created_by();

-- =============================================================================
-- PART 7: RECREATE convert_buyer_request_to_lead RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.convert_buyer_request_to_lead(
  p_request_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_account_id uuid;
  v_contact_id uuid;
  v_lead_id uuid;
  v_unit_id uuid;
  v_owner_user_id uuid;
  v_auth_user_id uuid;
BEGIN
  -- Get authenticated user
  v_auth_user_id := auth.uid();
  
  -- Get buyer request
  SELECT * INTO v_request
  FROM buyer_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buyer request not found: %', p_request_id;
  END IF;
  
  IF v_request.converted_to_lead_at IS NOT NULL THEN
    RAISE EXCEPTION 'Buyer request already converted';
  END IF;
  
  -- Find or create account
  IF v_request.email IS NOT NULL THEN
    SELECT id INTO v_account_id
    FROM accounts
    WHERE type = 'person'
      AND (
        email = v_request.email
        OR phone = v_request.phone
        OR (name ILIKE '%' || split_part(v_request.name, ' ', 1) || '%'
            AND name ILIKE '%' || split_part(v_request.name, ' ', 2) || '%')
      )
    LIMIT 1;
  END IF;
  
  -- Create new account if not found
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (
      type,
      name,
      email,
      phone,
      active,
      created_by
    ) VALUES (
      'person',
      v_request.name,
      v_request.email,
      v_request.phone,
      true,
      v_auth_user_id
    )
    RETURNING id INTO v_account_id;
  END IF;
  
  -- Find or create contact
  IF v_request.email IS NOT NULL THEN
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE account_id = v_account_id
      AND email = v_request.email
    LIMIT 1;
  END IF;
  
  -- Create new contact if not found
  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (
      account_id,
      name,
      email,
      phone,
      created_by
    ) VALUES (
      v_account_id,
      v_request.name,
      v_request.email,
      v_request.phone,
      v_auth_user_id
    )
    RETURNING id INTO v_contact_id;
  END IF;
  
  -- Try to find referenced unit
  IF v_request.unit_id IS NOT NULL THEN
    SELECT id INTO v_unit_id
    FROM units
    WHERE id = v_request.unit_id;
  END IF;
  
  -- Select owner (use first available active staff user)
  SELECT u.id INTO v_owner_user_id
  FROM users u
  WHERE u.status = 'active'
    AND u.role IN ('admin', 'sales', 'manager')
  ORDER BY 
    CASE WHEN u.id = v_auth_user_id THEN 0 ELSE 1 END,
    u.created_at
  LIMIT 1;
  
  -- Create lead
  INSERT INTO leads (
    account_id,
    contact_id,
    unit_id,
    source,
    stage,
    owner_user_id,
    notes,
    created_by
  ) VALUES (
    v_account_id,
    v_contact_id,
    v_unit_id,
    COALESCE(v_request.source, 'website'),
    'new',
    v_owner_user_id,
    COALESCE(v_request.message, ''),
    v_auth_user_id
  )
  RETURNING id INTO v_lead_id;
  
  -- Mark buyer request as converted
  UPDATE buyer_requests
  SET 
    converted_to_lead_at = now(),
    converted_to_lead_id = v_lead_id
  WHERE id = p_request_id;
  
  RETURN v_lead_id;
END;
$$;

COMMENT ON FUNCTION public.convert_buyer_request_to_lead(uuid) IS 
'Converts a buyer_request into an account, contact, and lead. Returns the new lead UUID.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  v_trigger_count int;
  v_function_exists boolean;
  v_rpc_exists boolean;
  v_fk_count int;
BEGIN
  -- Check triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name IN (
    'trg_accounts_force_created_by',
    'trg_contacts_force_created_by',
    'trg_leads_force_created_by'
  );
  
  -- Check function
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = '_force_created_by'
  ) INTO v_function_exists;
  
  -- Check RPC
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'convert_buyer_request_to_lead'
  ) INTO v_rpc_exists;
  
  -- Check FKs
  SELECT COUNT(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE constraint_name IN (
    'accounts_created_by_fkey',
    'contacts_created_by_fkey',
    'leads_created_by_fkey'
  );
  
  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  RAISE NOTICE 'Triggers created: % (expected 3)', v_trigger_count;
  RAISE NOTICE '_force_created_by function: %', v_function_exists;
  RAISE NOTICE 'convert_buyer_request_to_lead RPC: %', v_rpc_exists;
  RAISE NOTICE 'Foreign keys created: % (expected 3)', v_fk_count;
  
  IF v_trigger_count = 3 AND v_function_exists AND v_rpc_exists AND v_fk_count = 3 THEN
    RAISE NOTICE '✅ Migration completed successfully!';
  ELSE
    RAISE WARNING '⚠️ Migration may have issues - check results above';
  END IF;
END $$;
