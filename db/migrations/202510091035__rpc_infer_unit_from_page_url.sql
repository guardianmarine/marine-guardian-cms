-- Migration: Infer unit_id from page_url in convert_buyer_request_to_lead
-- Description: Extract UUID or slug from page_url when unit_id is null

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
  v_extracted_segment text;
  v_unit_slug text;
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
  
  -- Normalize preferred_contact
  v_preferred_contact := NULLIF(LOWER(COALESCE(v_request.preferred_contact, '')), '');
  
  -- =========================================================================
  -- UNIT ID INFERENCE LOGIC
  -- =========================================================================
  v_unit_id := v_request.unit_id;
  
  -- If unit_id is null, try to infer from page_url
  IF v_unit_id IS NULL AND v_request.page_url IS NOT NULL THEN
    -- Extract segment after /unit/ or /units/
    -- Pattern: /unit/<uuid-or-slug> or /units/<uuid-or-slug>
    v_extracted_segment := substring(v_request.page_url FROM '/units?/([^/?#]+)');
    
    IF v_extracted_segment IS NOT NULL THEN
      -- Try to cast as UUID first
      BEGIN
        v_unit_id := v_extracted_segment::uuid;
        -- Verify it exists
        IF NOT EXISTS (SELECT 1 FROM units WHERE id = v_unit_id) THEN
          v_unit_id := NULL;
        END IF;
      EXCEPTION WHEN invalid_text_representation THEN
        -- Not a UUID, treat as slug
        v_unit_slug := v_extracted_segment;
        SELECT id INTO v_unit_id FROM units WHERE slug = v_unit_slug LIMIT 1;
      END;
    END IF;
  END IF;
  
  -- Verify unit exists if we have one
  IF v_unit_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM units WHERE id = v_unit_id) THEN
      v_unit_id := NULL;
    END IF;
  END IF;
  
  -- Update buyer_request with inferred unit_id (persist for future reference)
  IF v_unit_id IS NOT NULL AND v_request.unit_id IS NULL THEN
    UPDATE buyer_requests SET unit_id = v_unit_id WHERE id = v_request.id;
  END IF;
  
  -- =========================================================================
  -- ACCOUNT & CONTACT LOGIC
  -- =========================================================================
  
  -- Find or create account
  SELECT id INTO v_account_id
  FROM accounts
  WHERE LOWER(name) = LOWER(trim(v_request.name))
    AND kind = 'individual'
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (
      name, kind, is_active, created_by
    ) VALUES (
      trim(v_request.name), 'individual', true, v_auth_user_id
    )
    RETURNING id INTO v_account_id;
  END IF;
  
  -- Find existing contact by email
  IF v_request.email IS NOT NULL THEN
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE account_id = v_account_id AND email = v_request.email
    LIMIT 1;
  END IF;
  
  -- If not found by email, try by phone
  IF v_contact_id IS NULL AND v_request.phone IS NOT NULL THEN
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE account_id = v_account_id AND phone = v_request.phone
    LIMIT 1;
  END IF;
  
  -- If still not found, try by name match
  IF v_contact_id IS NULL THEN
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE account_id = v_account_id
      AND LOWER(first_name) = LOWER(v_first_name)
      AND (v_last_name IS NULL OR last_name IS NULL OR LOWER(last_name) = LOWER(v_last_name))
    LIMIT 1;
  END IF;
  
  -- Create new contact if not found
  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (
      account_id, first_name, last_name, email, phone, created_by
    ) VALUES (
      v_account_id, v_first_name, v_last_name, v_request.email, v_request.phone, v_auth_user_id
    )
    RETURNING id INTO v_contact_id;
  END IF;
  
  -- =========================================================================
  -- OWNER SELECTION
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    SELECT u.id INTO v_owner_user_id
    FROM users u
    WHERE u.status = 'active' AND u.role IN ('admin', 'sales', 'manager')
    ORDER BY CASE WHEN u.id = v_auth_user_id THEN 0 ELSE 1 END, u.created_at
    LIMIT 1;
  END IF;
  
  IF v_owner_user_id IS NULL THEN
    v_owner_user_id := v_auth_user_id;
  END IF;
  
  -- =========================================================================
  -- CREATE LEAD
  -- =========================================================================
  INSERT INTO leads (
    account_id, contact_id, unit_id, source, stage, owner_user_id,
    preferred_contact, notes, created_by
  ) VALUES (
    v_account_id, v_contact_id, v_unit_id, COALESCE(v_request.source, 'website'),
    'new', v_owner_user_id, v_preferred_contact, COALESCE(v_request.message, ''), v_auth_user_id
  )
  RETURNING id INTO v_lead_id;
  
  -- Mark buyer request as converted
  UPDATE buyer_requests
  SET converted_to_lead_at = now(), lead_id = v_lead_id, status = 'converted'
  WHERE id = p_request_id;
  
  RETURN v_lead_id;
END;
$$;

COMMENT ON FUNCTION public.convert_buyer_request_to_lead(uuid) IS 
'Converts buyer_request to lead. Infers unit_id from page_url if not provided (UUID or slug lookup). Returns lead UUID.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ RPC updated: convert_buyer_request_to_lead now infers unit_id from page_url';
  RAISE NOTICE '   ✓ Extracts UUID from /unit/<uuid> or /units/<uuid>';
  RAISE NOTICE '   ✓ Falls back to slug lookup if not UUID';
  RAISE NOTICE '   ✓ Persists inferred unit_id back to buyer_requests';
END $$;
