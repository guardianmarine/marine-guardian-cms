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
-- Check for problematic patterns (should return 0 rows)
-- ============================================================================
-- Any column with trigger function in DEFAULT?
select 
  '✗ ERROR: Trigger function in column DEFAULT' as issue,
  table_name,
  column_name,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (column_default ilike '%trigger%' 
       or column_default ilike '%_force_created_by%'
       or column_default ilike '%_default_owner_user%')
union all
-- Any RPC that directly calls trigger functions?
select 
  '⚠ WARNING: Check RPC for direct trigger calls' as issue,
  p.proname as table_name,
  'RPC function' as column_name,
  pg_get_functiondef(p.oid)::text as column_default
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and pg_get_functiondef(p.oid) ilike '%_force_created_by()%'
  and p.proname != '_force_created_by';

-- ============================================================================
-- If all checks pass, you should see:
--   ✓ 3 NULL defaults
--   ✓ 1 Trigger function
--   ✓ 3 BEFORE INSERT triggers
--   ✓ 3 FK constraints (if auth.users exists)
--   ✓ 0 rows in problematic patterns check
-- ============================================================================
