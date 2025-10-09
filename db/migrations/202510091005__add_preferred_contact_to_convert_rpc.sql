-- Migration: Add preferred_contact to convert_buyer_request_to_lead RPC
-- Description: Maps buyer_requests.preferred_contact → leads.preferred_contact (normalized to lowercase)

-- ============================================================================
-- UPDATE RPC TO INCLUDE PREFERRED_CONTACT
-- ============================================================================

DROP FUNCTION IF EXISTS public.convert_buyer_request_to_lead(uuid);

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
  v_first_name text;
  v_last_name text;
  v_name_parts text[];
  v_preferred_contact text;
BEGIN
  -- Require authentication
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;
  
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
  
  -- Split name into first_name and last_name
  v_name_parts := string_to_array(trim(v_request.name), ' ');
  v_first_name := COALESCE(v_name_parts[1], v_request.name);
  
  IF array_length(v_name_parts, 1) > 1 THEN
    v_last_name := array_to_string(v_name_parts[2:array_length(v_name_parts, 1)], ' ');
  ELSE
    v_last_name := NULL;
  END IF;
  
  -- Normalize preferred_contact to lowercase (email, phone, whatsapp)
  v_preferred_contact := LOWER(COALESCE(v_request.preferred_contact, ''));
  IF v_preferred_contact = '' THEN
    v_preferred_contact := NULL;
  END IF;
  
  -- Find or create account (search by normalized name only, accounts has no email/phone)
  SELECT id INTO v_account_id
  FROM accounts
  WHERE LOWER(name) = LOWER(trim(v_request.name))
    AND kind = 'individual'
  LIMIT 1;
  
  -- Create new account if not found
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (
      name,
      kind,
      is_active,
      created_by
    ) VALUES (
      trim(v_request.name),
      'individual',
      true,
      v_auth_user_id
    )
    RETURNING id INTO v_account_id;
  END IF;
  
  -- Find existing contact by email (if provided)
  IF v_request.email IS NOT NULL THEN
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE account_id = v_account_id
      AND email = v_request.email
    LIMIT 1;
  END IF;
  
  -- If not found by email, try by phone (if provided)
  IF v_contact_id IS NULL AND v_request.phone IS NOT NULL THEN
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE account_id = v_account_id
      AND phone = v_request.phone
    LIMIT 1;
  END IF;
  
  -- If still not found, try by name match
  IF v_contact_id IS NULL THEN
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE account_id = v_account_id
      AND LOWER(first_name) = LOWER(v_first_name)
      AND (
        v_last_name IS NULL 
        OR last_name IS NULL 
        OR LOWER(last_name) = LOWER(v_last_name)
      )
    LIMIT 1;
  END IF;
  
  -- Create new contact if not found
  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (
      account_id,
      first_name,
      last_name,
      email,
      phone,
      created_by
    ) VALUES (
      v_account_id,
      v_first_name,
      v_last_name,
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
  
  -- Select owner (prefer current user, fallback to active staff)
  -- Check if public.users table exists, otherwise use auth user
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    SELECT u.id INTO v_owner_user_id
    FROM users u
    WHERE u.status = 'active'
      AND u.role IN ('admin', 'sales', 'manager')
    ORDER BY 
      CASE WHEN u.id = v_auth_user_id THEN 0 ELSE 1 END,
      u.created_at
    LIMIT 1;
  END IF;
  
  -- Fallback to authenticated user if no owner found
  IF v_owner_user_id IS NULL THEN
    v_owner_user_id := v_auth_user_id;
  END IF;
  
  -- Create lead with correct schema including preferred_contact
  INSERT INTO leads (
    account_id,
    contact_id,
    unit_id,
    source,
    stage,
    owner_user_id,
    preferred_contact,
    notes,
    created_by
  ) VALUES (
    v_account_id,
    v_contact_id,
    v_unit_id,
    COALESCE(v_request.source, 'website'),
    'new',
    v_owner_user_id,
    v_preferred_contact,
    COALESCE(v_request.message, ''),
    v_auth_user_id
  )
  RETURNING id INTO v_lead_id;
  
  -- Mark buyer request as converted (use lead_id, not converted_to_lead_id)
  UPDATE buyer_requests
  SET 
    converted_to_lead_at = now(),
    lead_id = v_lead_id,
    status = 'converted'
  WHERE id = p_request_id;
  
  RETURN v_lead_id;
END;
$$;

COMMENT ON FUNCTION public.convert_buyer_request_to_lead(uuid) IS 
'Converts a buyer_request into an account (kind/is_active), contact (first_name/last_name), and lead. Includes preferred_contact mapping (normalized to lowercase). Returns lead UUID.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_function_exists boolean;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'convert_buyer_request_to_lead'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ RPC convert_buyer_request_to_lead updated successfully';
    RAISE NOTICE '   ✓ Maps buyer_requests.preferred_contact → leads.preferred_contact';
    RAISE NOTICE '   ✓ Normalizes preferred_contact to lowercase (email|phone|whatsapp)';
    RAISE NOTICE '   ✓ All previous schema alignments preserved';
  ELSE
    RAISE WARNING '⚠️  Function not found after update';
  END IF;
END $$;
