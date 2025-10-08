-- Migration: Verify CRM Schema Alignment
-- Description: Final verification that all CRM tables and RPC are correctly aligned

-- ============================================================================
-- VERIFICATION: Schema Check
-- ============================================================================

DO $$
DECLARE
  v_accounts_ok boolean := true;
  v_contacts_ok boolean := true;
  v_leads_ok boolean := true;
  v_buyer_requests_ok boolean := true;
  v_rpc_ok boolean := false;
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'CRM Schema Alignment Verification';
  RAISE NOTICE '======================================';
  
  -- Check accounts table
  RAISE NOTICE '';
  RAISE NOTICE '📋 Checking accounts table...';
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'kind') THEN
    RAISE NOTICE '   ✅ accounts.kind exists';
  ELSE
    RAISE WARNING '   ❌ accounts.kind missing';
    v_accounts_ok := false;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'is_active') THEN
    RAISE NOTICE '   ✅ accounts.is_active exists';
  ELSE
    RAISE WARNING '   ❌ accounts.is_active missing';
    v_accounts_ok := false;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'type') THEN
    RAISE WARNING '   ⚠️  accounts.type exists (OBSOLETE - should not exist)';
    v_accounts_ok := false;
  END IF;
  
  -- Check contacts table
  RAISE NOTICE '';
  RAISE NOTICE '📋 Checking contacts table...';
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'first_name') THEN
    RAISE NOTICE '   ✅ contacts.first_name exists';
  ELSE
    RAISE WARNING '   ❌ contacts.first_name missing';
    v_contacts_ok := false;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'last_name') THEN
    RAISE NOTICE '   ✅ contacts.last_name exists';
  ELSE
    RAISE WARNING '   ❌ contacts.last_name missing';
    v_contacts_ok := false;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'name') THEN
    RAISE WARNING '   ⚠️  contacts.name exists (OBSOLETE - should not exist)';
    v_contacts_ok := false;
  END IF;
  
  -- Check leads table
  RAISE NOTICE '';
  RAISE NOTICE '📋 Checking leads table...';
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'account_id') THEN
    RAISE NOTICE '   ✅ leads.account_id exists';
  ELSE
    RAISE WARNING '   ❌ leads.account_id missing';
    v_leads_ok := false;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'contact_id') THEN
    RAISE NOTICE '   ✅ leads.contact_id exists';
  ELSE
    RAISE WARNING '   ❌ leads.contact_id missing';
    v_leads_ok := false;
  END IF;
  
  -- Check buyer_requests table
  RAISE NOTICE '';
  RAISE NOTICE '📋 Checking buyer_requests table...';
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buyer_requests' AND column_name = 'lead_id') THEN
    RAISE NOTICE '   ✅ buyer_requests.lead_id exists';
  ELSE
    RAISE WARNING '   ❌ buyer_requests.lead_id missing';
    v_buyer_requests_ok := false;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buyer_requests' AND column_name = 'converted_to_lead_at') THEN
    RAISE NOTICE '   ✅ buyer_requests.converted_to_lead_at exists';
  ELSE
    RAISE WARNING '   ❌ buyer_requests.converted_to_lead_at missing';
    v_buyer_requests_ok := false;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buyer_requests' AND column_name = 'converted_to_lead_id') THEN
    RAISE WARNING '   ⚠️  buyer_requests.converted_to_lead_id exists (OBSOLETE - should not exist)';
    v_buyer_requests_ok := false;
  END IF;
  
  -- Check RPC
  RAISE NOTICE '';
  RAISE NOTICE '📋 Checking RPC function...';
  
  IF EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'convert_buyer_request_to_lead'
  ) THEN
    v_rpc_ok := true;
    RAISE NOTICE '   ✅ convert_buyer_request_to_lead exists';
    
    -- Check return type
    DECLARE
      v_return_type text;
    BEGIN
      SELECT pg_get_function_result(p.oid) INTO v_return_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'convert_buyer_request_to_lead';
      
      IF v_return_type = 'uuid' THEN
        RAISE NOTICE '   ✅ Returns uuid (correct)';
      ELSE
        RAISE WARNING '   ⚠️  Returns % (should be uuid)', v_return_type;
        v_rpc_ok := false;
      END IF;
    END;
  ELSE
    RAISE WARNING '   ❌ convert_buyer_request_to_lead missing';
  END IF;
  
  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Summary';
  RAISE NOTICE '======================================';
  
  IF v_accounts_ok THEN
    RAISE NOTICE '✅ accounts table: OK';
  ELSE
    RAISE WARNING '❌ accounts table: ISSUES FOUND';
  END IF;
  
  IF v_contacts_ok THEN
    RAISE NOTICE '✅ contacts table: OK';
  ELSE
    RAISE WARNING '❌ contacts table: ISSUES FOUND';
  END IF;
  
  IF v_leads_ok THEN
    RAISE NOTICE '✅ leads table: OK';
  ELSE
    RAISE WARNING '❌ leads table: ISSUES FOUND';
  END IF;
  
  IF v_buyer_requests_ok THEN
    RAISE NOTICE '✅ buyer_requests table: OK';
  ELSE
    RAISE WARNING '❌ buyer_requests table: ISSUES FOUND';
  END IF;
  
  IF v_rpc_ok THEN
    RAISE NOTICE '✅ RPC function: OK';
  ELSE
    RAISE WARNING '❌ RPC function: ISSUES FOUND';
  END IF;
  
  RAISE NOTICE '';
  IF v_accounts_ok AND v_contacts_ok AND v_leads_ok AND v_buyer_requests_ok AND v_rpc_ok THEN
    RAISE NOTICE '🎉 All checks passed! Schema is correctly aligned.';
    RAISE NOTICE '';
    RAISE NOTICE '✨ Next steps:';
    RAISE NOTICE '   1. Test converting a buyer_request to lead';
    RAISE NOTICE '   2. Verify account, contact, and lead are created';
    RAISE NOTICE '   3. Check that buyer_requests.lead_id is populated';
    RAISE NOTICE '   4. Confirm navigation to lead detail works';
  ELSE
    RAISE WARNING '⚠️  Some checks failed. Please review the issues above.';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Required actions:';
    IF NOT v_accounts_ok OR NOT v_contacts_ok OR NOT v_buyer_requests_ok THEN
      RAISE NOTICE '   - Execute migration: 202510081115__consolidate_buyer_requests_schema.sql';
    END IF;
    IF NOT v_rpc_ok THEN
      RAISE NOTICE '   - Execute migration: 202510081110__fix_convert_rpc_schema_alignment.sql';
    END IF;
  END IF;
  
  RAISE NOTICE '======================================';
END $$;

-- Show actual column structure for reference
RAISE NOTICE '';
RAISE NOTICE '📊 Current Schema Details:';
RAISE NOTICE '';

SELECT 
  '🔹 ' || table_name || '.' || column_name || ' (' || data_type || ')' as "Column Info"
FROM information_schema.columns
WHERE table_name IN ('accounts', 'contacts', 'leads', 'buyer_requests')
  AND table_schema = 'public'
ORDER BY 
  CASE table_name
    WHEN 'accounts' THEN 1
    WHEN 'contacts' THEN 2
    WHEN 'leads' THEN 3
    WHEN 'buyer_requests' THEN 4
  END,
  ordinal_position;
