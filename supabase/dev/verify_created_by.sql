-- Verification script for created_by trigger setup
-- This script checks that:
-- 1. created_by columns have no DEFAULT values
-- 2. The _force_created_by trigger function exists
-- 3. Triggers are active on accounts, contacts, leads

-- Check 1: Verify that created_by columns have NULL as default (no function defaults)
select 
  table_name, 
  column_default,
  case 
    when column_default is null then '✓ OK: No default'
    else '✗ ERROR: Has default - should be removed'
  end as status
from information_schema.columns
where table_schema = 'public' 
  and column_name = 'created_by'
  and table_name in ('accounts', 'contacts', 'leads')
order by table_name;

-- Check 2: Verify the trigger function exists and view its definition
select 
  proname as function_name,
  case 
    when pg_get_functiondef(p.oid) is not null then '✓ OK: Function exists'
    else '✗ ERROR: Function missing'
  end as status
from pg_proc p
where proname = '_force_created_by';

-- Display full function definition for review
select pg_get_functiondef(p.oid) as function_definition
from pg_proc p
where proname = '_force_created_by';

-- Check 3: Verify triggers are active on all three tables
select 
  event_object_table as table_name,
  trigger_name,
  '✓ OK: Trigger exists' as status
from information_schema.triggers
where trigger_name in (
  'trg_accounts_force_created_by',
  'trg_contacts_force_created_by',
  'trg_leads_force_created_by'
)
order by event_object_table;

-- Check 4: Show all triggers on these tables (to catch any extras)
select 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing
from information_schema.triggers
where event_object_table in ('accounts', 'contacts', 'leads')
  and trigger_schema = 'public'
order by event_object_table, trigger_name;

-- Summary check
select 
  'Expected: 3 tables with NULL defaults, 1 trigger function, 3 active triggers' as expected,
  (select count(*) from information_schema.columns 
   where table_schema='public' and column_name='created_by' 
   and table_name in ('accounts','contacts','leads') 
   and column_default is null) as tables_with_null_default,
  (select count(*) from pg_proc where proname = '_force_created_by') as trigger_functions,
  (select count(*) from information_schema.triggers 
   where trigger_name in ('trg_accounts_force_created_by','trg_contacts_force_created_by','trg_leads_force_created_by')) as active_triggers;
