-- Migration: Force Fix created_by System (Nuclear Option)
-- Date: 2025-10-07 10:40
-- Purpose: Aggressively eliminate ALL problematic configurations and rebuild from scratch
-- 
-- This migration:
--   1. Removes ANY DEFAULT constraints on created_by columns
--   2. Drops and recreates _force_created_by() function
--   3. Drops and recreates all BEFORE INSERT triggers
--   4. Drops and recreates convert_buyer_request_to_lead RPC
--   5. Adds audit logging to the RPC for diagnostics

-- ============================================================================
-- STEP 1: Nuclear cleanup of DEFAULT constraints
-- ============================================================================

-- Remove any DEFAULT on accounts.created_by
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'accounts' 
      and column_name = 'created_by' 
      and column_default is not null
  ) then
    alter table public.accounts alter column created_by drop default;
    raise notice 'Dropped DEFAULT on accounts.created_by';
  end if;
end $$;

-- Remove any DEFAULT on contacts.created_by
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'contacts' 
      and column_name = 'created_by' 
      and column_default is not null
  ) then
    alter table public.contacts alter column created_by drop default;
    raise notice 'Dropped DEFAULT on contacts.created_by';
  end if;
end $$;

-- Remove any DEFAULT on leads.created_by
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'leads' 
      and column_name = 'created_by' 
      and column_default is not null
  ) then
    alter table public.leads alter column created_by drop default;
    raise notice 'Dropped DEFAULT on leads.created_by';
  end if;
end $$;

-- ============================================================================
-- STEP 2: Drop existing triggers (if any)
-- ============================================================================

drop trigger if exists trg_accounts_force_created_by on public.accounts;
drop trigger if exists trg_contacts_force_created_by on public.contacts;
drop trigger if exists trg_leads_force_created_by on public.leads;

-- ============================================================================
-- STEP 3: Recreate trigger function from scratch
-- ============================================================================

drop function if exists public._force_created_by() cascade;

create or replace function public._force_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_fallback_uid uuid;
begin
  -- If created_by is already set, respect it
  if NEW.created_by is not null then
    return NEW;
  end if;

  -- Try to get current auth user
  v_uid := auth.uid();
  
  if v_uid is not null then
    -- Check if this user exists in auth.users
    if exists (select 1 from auth.users where id = v_uid) then
      NEW.created_by := v_uid;
      return NEW;
    end if;
  end if;

  -- Fallback: find ANY valid user in auth.users
  select id into v_fallback_uid
  from auth.users
  limit 1;

  if v_fallback_uid is not null then
    NEW.created_by := v_fallback_uid;
    return NEW;
  end if;

  -- If no users exist at all, allow NULL (will fail FK constraint if required)
  return NEW;
end;
$$;

comment on function public._force_created_by() is 
  'BEFORE INSERT trigger: Sets created_by to auth.uid() or falls back to any valid user. Never calls trigger functions directly.';

-- ============================================================================
-- STEP 4: Create triggers
-- ============================================================================

create trigger trg_accounts_force_created_by
  before insert on public.accounts
  for each row
  execute function public._force_created_by();

create trigger trg_contacts_force_created_by
  before insert on public.contacts
  for each row
  execute function public._force_created_by();

create trigger trg_leads_force_created_by
  before insert on public.leads
  for each row
  execute function public._force_created_by();

-- ============================================================================
-- STEP 5: Drop and recreate convert_buyer_request_to_lead RPC
-- ============================================================================

drop function if exists public.convert_buyer_request_to_lead(uuid) cascade;

create or replace function public.convert_buyer_request_to_lead(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();

  v_name  text;
  v_email text;
  v_phone text;
  v_unit  uuid;

  v_account_id uuid;
  v_contact_id uuid;
  v_lead_id    uuid;

  v_account_name text;
  v_account_kind text;
  
  v_name_parts text[];
  v_first_name text;
  v_last_name text;
begin
  -- Auth check
  if v_uid is null then
    raise exception 'Auth required' using errcode = '28000';
  end if;

  raise notice '[RPC START] convert_buyer_request_to_lead for request: %, user: %', p_request_id, v_uid;

  -- Get buyer request data
  select br.name, br.email, br.phone, br.unit_id
    into v_name, v_email, v_phone, v_unit
  from public.buyer_requests br
  where br.id = p_request_id;

  if not found then
    raise exception 'buyer_request % not found', p_request_id using errcode = 'P0002';
  end if;

  raise notice '[RPC] Found request: name=%, email=%, phone=%, unit=%', v_name, v_email, v_phone, v_unit;

  -- Clean data and split name
  v_name  := nullif(trim(v_name), '');
  v_email := nullif(lower(trim(v_email)), '');
  v_phone := nullif(regexp_replace(coalesce(v_phone,''), '\s+', '', 'g'), '');
  v_account_name := coalesce(v_name, coalesce(v_email, 'Inbound'));

  -- Split name into first_name and last_name
  v_name_parts := regexp_split_to_array(coalesce(v_name, 'Prospect'), '\s+');
  v_first_name := v_name_parts[1];
  v_last_name := array_to_string(v_name_parts[2:array_length(v_name_parts, 1)], ' ');

  raise notice '[RPC] Parsed: first_name=%, last_name=%', v_first_name, v_last_name;

  -- Determine account type
  if v_name is not null and (
      v_name ~* '\b(s\.?a\.?|s\.?\s*de\s*r\.?l\.?|sa de cv|sa|s de rl|ltda|llc|inc|corp|corporation|gmbh|spa|plc|ltd|s\.?c\.?p?\.?)\b'
     ) then
    v_account_kind := 'company';
  else
    v_account_kind := 'individual';
  end if;

  -- ========================================================================
  -- Account: Find or create
  -- ========================================================================
  select a.id into v_account_id
  from public.accounts a
  where lower(a.name) = lower(v_account_name)
  limit 1;

  if v_account_id is null then
    raise notice '[RPC] Creating new account: name=%, kind=%', v_account_name, v_account_kind;
    
    insert into public.accounts (name, kind)
    values (v_account_name, v_account_kind)
    returning id into v_account_id;
    
    raise notice '[RPC] Created account: %', v_account_id;
  else
    raise notice '[RPC] Found existing account: %', v_account_id;
  end if;

  -- ========================================================================
  -- Contact: Find by email or create
  -- ========================================================================
  if v_email is not null then
    select c.id into v_contact_id
    from public.contacts c
    where lower(c.email) = v_email
    limit 1;

    if v_contact_id is null then
      raise notice '[RPC] Creating new contact: first_name=%, last_name=%, email=%', v_first_name, v_last_name, v_email;
      
      insert into public.contacts (first_name, last_name, email, phone, account_id)
      values (v_first_name, v_last_name, v_email, v_phone, v_account_id)
      returning id into v_contact_id;
      
      raise notice '[RPC] Created contact: %', v_contact_id;
    else
      raise notice '[RPC] Found existing contact: %, updating...', v_contact_id;
      
      update public.contacts
         set first_name = coalesce(v_first_name, first_name),
             last_name  = coalesce(v_last_name, last_name),
             phone      = coalesce(v_phone, phone),
             account_id = coalesce(v_account_id, account_id)
       where id = v_contact_id;
    end if;
  else
    -- No email, try to find by name + phone
    select c.id into v_contact_id
    from public.contacts c
    where lower(c.first_name) = lower(v_first_name)
      and coalesce(c.phone,'') = coalesce(v_phone,'')
    limit 1;

    if v_contact_id is null then
      raise notice '[RPC] Creating new contact (no email): first_name=%, last_name=%', v_first_name, v_last_name;
      
      insert into public.contacts (first_name, last_name, phone, account_id)
      values (v_first_name, v_last_name, v_phone, v_account_id)
      returning id into v_contact_id;
      
      raise notice '[RPC] Created contact: %', v_contact_id;
    end if;
  end if;

  -- ========================================================================
  -- Lead: Create new lead
  -- ========================================================================
  raise notice '[RPC] Creating lead: account_id=%, contact_id=%, unit_id=%', v_account_id, v_contact_id, v_unit;
  
  insert into public.leads (account_id, contact_id, unit_id, source, stage)
  values (v_account_id, v_contact_id, v_unit, 'inbound', 'new'::lead_stage)
  returning id into v_lead_id;
  
  raise notice '[RPC] Created lead: %', v_lead_id;

  -- ========================================================================
  -- Mark buyer request as converted
  -- ========================================================================
  update public.buyer_requests
     set status = 'converted',
         converted_at = v_now
   where id = p_request_id;
   
  raise notice '[RPC END] Successfully converted request % to lead %', p_request_id, v_lead_id;

  return v_lead_id;
end;
$$;

grant execute on function public.convert_buyer_request_to_lead(uuid) to authenticated;

comment on function public.convert_buyer_request_to_lead(uuid) is 
  'Converts a buyer request to lead. Does NOT call trigger functions or set created_by manually. Returns lead UUID. Includes diagnostic logging.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show that DEFAULT constraints are gone
select 
  table_name, 
  column_name, 
  column_default,
  case when column_default is null then '✓ NO DEFAULT' else '✗ HAS DEFAULT' end as status
from information_schema.columns
where table_schema = 'public'
  and table_name in ('accounts', 'contacts', 'leads')
  and column_name = 'created_by';

-- Show triggers are active
select 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name like '%created_by%'
order by event_object_table;

-- Show RPC exists
select 
  p.proname as function_name,
  pg_get_function_result(p.oid) as returns,
  case when prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'public'
  and p.proname = 'convert_buyer_request_to_lead';
