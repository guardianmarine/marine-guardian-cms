-- ============================================================================
-- Verification script for created_by trigger setup
-- Run this after applying migration 202510071030__fix_created_by_triggers.sql
-- ============================================================================
-- Expected results:
--   ✓ created_by columns exist with NULL defaults (no function defaults)
--   ✓ _force_created_by() trigger function exists
--   ✓ 3 BEFORE INSERT triggers active on accounts, contacts, leads
--   ✓ Foreign keys to auth.users exist (if auth.users exists)
-- ============================================================================

-- ============================================================================
-- Check 1: Verify created_by columns exist and have NULL default
-- ============================================================================
select 
  table_name, 
  data_type,
  is_nullable,
  column_default,
  case 
    when column_default is null then '✓ OK: No default (triggers will handle)'
    when column_default ilike '%trigger%' then '✗ ERROR: Has trigger function as default'
    else '⚠ WARNING: Has unexpected default: ' || column_default
  end as status
from information_schema.columns
where table_schema = 'public' 
  and column_name = 'created_by'
  and table_name in ('accounts', 'contacts', 'leads')
order by table_name;

-- ============================================================================
-- Check 2: Verify _force_created_by() function exists and is type TRIGGER
-- ============================================================================
select 
  p.proname as function_name,
  pg_catalog.format_type(p.prorettype, null) as return_type,
  case 
    when pg_catalog.format_type(p.prorettype, null) = 'trigger' then '✓ OK: Returns trigger'
    else '✗ ERROR: Wrong return type - should be trigger'
  end as status,
  case 
    when p.prosecdef then '✓ SECURITY DEFINER'
    else '⚠ Not SECURITY DEFINER'
  end as security
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = '_force_created_by'
  and n.nspname = 'public';

-- Display full function definition for manual review
select pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = '_force_created_by'
  and n.nspname = 'public';

-- ============================================================================
-- Check 3: Verify BEFORE INSERT triggers exist on all three tables
-- ============================================================================
select 
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  case 
    when action_timing = 'BEFORE' and event_manipulation = 'INSERT' 
    then '✓ OK: BEFORE INSERT trigger'
    else '⚠ WARNING: Wrong timing/event'
  end as status
from information_schema.triggers
where trigger_name in (
  'trg_accounts_force_created_by',
  'trg_contacts_force_created_by',
  'trg_leads_force_created_by'
)
order by event_object_table;

-- ============================================================================
-- Check 4: Foreign key constraints to auth.users
-- ============================================================================
select 
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as foreign_schema,
  ccu.table_name as foreign_table,
  ccu.column_name as foreign_column,
  '✓ OK: FK exists' as status
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('accounts', 'contacts', 'leads')
  and kcu.column_name = 'created_by'
order by tc.table_name;

-- ============================================================================
-- Check 5: Show all triggers on CRM tables (to detect extras or conflicts)
-- ============================================================================
select 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement as function_call
from information_schema.triggers
where event_object_table in ('accounts', 'contacts', 'leads')
  and trigger_schema = 'public'
order by event_object_table, action_timing, trigger_name;

-- ============================================================================
-- SUMMARY: Overall health check
-- ============================================================================
select 
  'Expected: 3 tables with NULL defaults, 1 trigger function, 3 BEFORE INSERT triggers, 3 FKs' as requirement,
  (select count(*) from information_schema.columns 
   where table_schema='public' and column_name='created_by' 
   and table_name in ('accounts','contacts','leads') 
   and column_default is null) as "✓ NULL defaults",
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where p.proname = '_force_created_by' and n.nspname='public'
   and pg_catalog.format_type(p.prorettype, null) = 'trigger') as "✓ Trigger functions",
  (select count(*) from information_schema.triggers 
   where trigger_name in ('trg_accounts_force_created_by','trg_contacts_force_created_by','trg_leads_force_created_by')
   and action_timing='BEFORE' and event_manipulation='INSERT') as "✓ BEFORE INSERT triggers",
  (select count(*) from information_schema.table_constraints
   where constraint_type='FOREIGN KEY' and table_schema='public'
   and table_name in ('accounts','contacts','leads')
   and constraint_name like '%created_by_fkey') as "✓ FK constraints";

-- ============================================================================
-- 7. CHECK CONTACTS SCHEMA (first_name/last_name vs full_name)
-- ============================================================================
select 
  '7. Contacts Schema' as check_name,
  case 
    when exists (select 1 from pg_attribute where attrelid = 'public.contacts'::regclass and attname = 'first_name')
     and exists (select 1 from pg_attribute where attrelid = 'public.contacts'::regclass and attname = 'last_name')
    then '✅ PASS - Uses first_name/last_name (correct)'
    when exists (select 1 from pg_attribute where attrelid = 'public.contacts'::regclass and attname = 'full_name')
    then '❌ FAIL - Uses full_name (RPC expects first_name/last_name)'
    else '❌ FAIL - Missing name columns'
  end as status,
  case 
    when exists (select 1 from pg_attribute where attrelid = 'public.contacts'::regclass and attname = 'first_name')
     and exists (select 1 from pg_attribute where attrelid = 'public.contacts'::regclass and attname = 'last_name')
    then 'Schema matches RPC requirements'
    when exists (select 1 from pg_attribute where attrelid = 'public.contacts'::regclass and attname = 'full_name')
    then 'RPC will fail - needs migration to add first_name/last_name or update RPC'
    else 'Critical error - name columns missing'
  end as details;

-- ============================================================================
-- 8. CHECK LEADS SCHEMA (stage vs status)
-- ============================================================================
select 
  '8. Leads Schema' as check_name,
  case 
    when exists (select 1 from pg_attribute where attrelid = 'public.leads'::regclass and attname = 'stage')
    then '✅ PASS - Uses stage (lead_stage enum)'
    when exists (select 1 from pg_attribute where attrelid = 'public.leads'::regclass and attname = 'status')
    then '❌ FAIL - Uses status (RPC expects stage)'
    else '❌ FAIL - Missing stage/status column'
  end as status,
  case 
    when exists (select 1 from pg_attribute where attrelid = 'public.leads'::regclass and attname = 'stage')
    then 'Schema matches RPC requirements'
    when exists (select 1 from pg_attribute where attrelid = 'public.leads'::regclass and attname = 'status')
    then 'RPC will fail - needs migration to rename status to stage or update RPC'
    else 'Critical error - stage column missing'
  end as details;

-- ============================================================================
-- 9. CHECK FOR PROBLEMATIC RPC PATTERNS
-- ============================================================================
select 
  '9. RPC Pattern Check' as check_name,
  case 
    when exists (
      select 1 from pg_proc 
      where proname = 'convert_buyer_request_to_lead'
      and pg_get_functiondef(oid) like '%_default_owner_user()%'
    )
    then '❌ FAIL - RPC calls _default_owner_user() (trigger function)'
    when exists (
      select 1 from pg_proc 
      where proname = 'convert_buyer_request_to_lead'
      and pg_get_functiondef(oid) like '%_force_created_by()%'
    )
    then '❌ FAIL - RPC calls _force_created_by() (trigger function)'
    when exists (
      select 1 from pg_proc 
      where proname = 'convert_buyer_request_to_lead'
      and pg_get_functiondef(oid) like '%created_by :=%'
    )
    then '⚠️ WARNING - RPC manually sets created_by (should rely on triggers)'
    else '✅ PASS - RPC does not call trigger functions'
  end as status,
  case 
    when exists (
      select 1 from pg_proc 
      where proname = 'convert_buyer_request_to_lead'
      and (pg_get_functiondef(oid) like '%_default_owner_user()%'
           or pg_get_functiondef(oid) like '%_force_created_by()%')
    )
    then 'Apply migration 202510071035__replace_convert_buyer_request_rpc.sql'
    when exists (
      select 1 from pg_proc 
      where proname = 'convert_buyer_request_to_lead'
      and pg_get_functiondef(oid) like '%created_by :=%'
    )
    then 'RPC sets created_by manually - should rely on triggers instead'
    else 'RPC correctly relies on triggers for created_by'
  end as details;

-- ============================================================================
-- RPC Pattern Checks (Extended)
-- ============================================================================

-- Check if RPC calls trigger functions directly
select '🔍 Checking for problematic RPC patterns...' as status;

select 
  p.proname as rpc_name,
  case 
    when pg_get_functiondef(p.oid) ~* '_force_created_by\s*\('
      then '✗ CALLS TRIGGER FUNCTION DIRECTLY'
    when pg_get_functiondef(p.oid) ~* 'created_by\s*:=.*_default_owner_user'
      then '✗ SETS created_by MANUALLY'
    else '✓ Does not call trigger functions'
  end as pattern_check,
  case 
    when pg_get_functiondef(p.oid) ~* '_force_created_by\s*\('
      or pg_get_functiondef(p.oid) ~* 'created_by\s*:=.*_default_owner_user'
      then '🚨 THIS RPC NEEDS TO BE UPDATED'
    else '✅ OK'
  end as action_needed
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'public'
  and p.proname in ('convert_buyer_request_to_lead');

-- ============================================================================
-- DEFAULT Constraint Check
-- ============================================================================

-- Check for problematic DEFAULT constraints
select '🔍 Checking for DEFAULT constraints on created_by columns...' as status;

select 
  table_name,
  column_name,
  column_default,
  case 
    when column_default is null then '✓ NO DEFAULT (correct)'
    when column_default ~* '_force_created_by|_default_owner_user' then '✗ CALLS TRIGGER FUNCTION (problematic)'
    else '⚠️ HAS DEFAULT (review needed)'
  end as status,
  case 
    when column_default ~* '_force_created_by|_default_owner_user' 
      then '🚨 MUST DROP THIS DEFAULT: ALTER TABLE ' || table_name || ' ALTER COLUMN created_by DROP DEFAULT;'
    else null
  end as fix_command
from information_schema.columns
where table_schema = 'public'
  and table_name in ('accounts', 'contacts', 'leads', 'opportunities')
  and column_name = 'created_by';

-- ============================================================================
-- Show Full RPC Definition
-- ============================================================================

-- Show the complete RPC definition for manual review
select '🔍 Full RPC Definition (for manual review)...' as status;

select 
  p.proname as rpc_name,
  pg_get_functiondef(p.oid) as full_definition
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'public'
  and p.proname = 'convert_buyer_request_to_lead';

-- ============================================================================
-- CHECK FOR PROBLEMATIC PATTERNS (AGGREGATED)
-- ============================================================================

DO $$
DECLARE
  v_bad_defaults int;
  v_bad_rpc_calls int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '10. PROBLEMATIC PATTERN SUMMARY';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Count problematic DEFAULT constraints
  SELECT COUNT(*) INTO v_bad_defaults
  FROM pg_attribute a
  JOIN pg_class t ON a.attrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
  WHERE a.attname = 'created_by'
    AND n.nspname = 'public'
    AND t.relname IN ('accounts', 'contacts', 'leads')
    AND d.adbin IS NOT NULL
    AND pg_get_expr(d.adbin, d.adrelid) LIKE '%force_created_by%';
  
  -- Count problematic RPC calls
  SELECT COUNT(*) INTO v_bad_rpc_calls
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'convert_buyer_request_to_lead'
    AND (
      pg_get_functiondef(p.oid) LIKE '%_force_created_by()%'
      OR pg_get_functiondef(p.oid) LIKE '%created_by := %'
      OR pg_get_functiondef(p.oid) LIKE '%created_by = %'
    );
  
  IF v_bad_defaults > 0 THEN
    RAISE NOTICE '❌ Found % DEFAULT constraint(s) that call trigger functions', v_bad_defaults;
    RAISE NOTICE '   → This causes "trigger functions can only be called as triggers" error';
    RAISE NOTICE '   → Run: ALTER TABLE <table> ALTER COLUMN created_by DROP DEFAULT;';
  ELSE
    RAISE NOTICE '✅ No problematic DEFAULT constraints found';
  END IF;
  
  IF v_bad_rpc_calls > 0 THEN
    RAISE NOTICE '❌ RPC convert_buyer_request_to_lead has problematic patterns';
    RAISE NOTICE '   → It may be calling trigger functions directly';
    RAISE NOTICE '   → Apply migration: 202510071050__nuclear_fix_created_by.sql';
  ELSE
    RAISE NOTICE '✅ RPC convert_buyer_request_to_lead looks clean';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_accounts_ok boolean;
  v_contacts_ok boolean;
  v_leads_ok boolean;
  v_function_ok boolean;
  v_rpc_ok boolean;
  v_triggers_ok boolean;
  v_no_bad_defaults boolean;
  v_clean_rpc boolean;
BEGIN
  -- Check all critical components
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'created_by') INTO v_accounts_ok;
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'created_by') INTO v_contacts_ok;
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'created_by') INTO v_leads_ok;
  SELECT 
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = '_force_created_by') INTO v_function_ok;
  SELECT 
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'convert_buyer_request_to_lead') INTO v_rpc_ok;
  SELECT 
    (SELECT COUNT(*) FROM information_schema.triggers 
     WHERE trigger_name IN ('trg_accounts_force_created_by', 'trg_contacts_force_created_by', 'trg_leads_force_created_by')) = 3 
    INTO v_triggers_ok;
  
  -- Check for problematic patterns
  SELECT 
    NOT EXISTS(
      SELECT 1 FROM pg_attribute a
      JOIN pg_class t ON a.attrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      WHERE a.attname = 'created_by' AND n.nspname = 'public'
        AND t.relname IN ('accounts', 'contacts', 'leads')
        AND d.adbin IS NOT NULL
    ) INTO v_no_bad_defaults;
  
  SELECT 
    NOT EXISTS(
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'convert_buyer_request_to_lead'
        AND (pg_get_functiondef(p.oid) LIKE '%_force_created_by()%'
             OR pg_get_functiondef(p.oid) LIKE '%created_by := auth.uid()%')
    ) INTO v_clean_rpc;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '                           FINAL VERIFICATION STATUS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 SCHEMA COMPONENTS:';
  RAISE NOTICE '   Accounts table: %', CASE WHEN v_accounts_ok THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE '   Contacts table: %', CASE WHEN v_contacts_ok THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE '   Leads table: %', CASE WHEN v_leads_ok THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 FUNCTIONS & TRIGGERS:';
  RAISE NOTICE '   Trigger function _force_created_by: %', CASE WHEN v_function_ok THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE '   RPC convert_buyer_request_to_lead: %', CASE WHEN v_rpc_ok THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE '   Triggers (3 required): %', CASE WHEN v_triggers_ok THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  PROBLEMATIC PATTERNS:';
  RAISE NOTICE '   No DEFAULT constraints on created_by: %', CASE WHEN v_no_bad_defaults THEN '✅ CLEAN' ELSE '❌ FOUND' END;
  RAISE NOTICE '   RPC does not call triggers directly: %', CASE WHEN v_clean_rpc THEN '✅ CLEAN' ELSE '❌ PROBLEMATIC' END;
  RAISE NOTICE '';
  
  IF v_accounts_ok AND v_contacts_ok AND v_leads_ok AND v_function_ok AND v_rpc_ok AND v_triggers_ok 
     AND v_no_bad_defaults AND v_clean_rpc THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED! The system is correctly configured.';
    RAISE NOTICE '   You should be able to convert buyer requests to leads without errors.';
  ELSE
    RAISE NOTICE '⚠️  SOME CHECKS FAILED - Review the output above for details.';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 RECOMMENDED FIX:';
    RAISE NOTICE '   1. Apply migration: db/migrations/202510071050__nuclear_fix_created_by.sql';
    RAISE NOTICE '   2. OR follow manual steps in: db/migrations/MANUAL_FIX_GUIDE.md';
    RAISE NOTICE '   3. Re-run this verification script after applying the fix';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- If all checks pass, you should see:
--   ✓ 3 NULL defaults
--   ✓ 1 Trigger function
--   ✓ 3 BEFORE INSERT triggers
--   ✓ 3 FK constraints (if auth.users exists)
--   ✓ Schema consistency (first_name/last_name, stage)
--   ✓ 0 rows in problematic patterns check
-- ============================================================================
