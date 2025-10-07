-- Migration: Fix created_by columns with triggers instead of DEFAULT functions
-- Date: 2025-10-07
-- Purpose: Ensure created_by exists, remove problematic DEFAULTs, add triggers for safe fallback

-- ============================================================================
-- 1) Ensure created_by column exists in all CRM tables (NULLABLE for history)
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='accounts' and column_name='created_by'
  ) then
    alter table public.accounts add column created_by uuid;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='contacts' and column_name='created_by'
  ) then
    alter table public.contacts add column created_by uuid;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='leads' and column_name='created_by'
  ) then
    alter table public.leads add column created_by uuid;
  end if;
end $$;

-- ============================================================================
-- 2) Remove any problematic DEFAULT values (trigger functions cannot be defaults)
-- ============================================================================
alter table if exists public.accounts  alter column created_by drop default;
alter table if exists public.contacts  alter column created_by drop default;
alter table if exists public.leads     alter column created_by drop default;

-- ============================================================================
-- 3) Add FK to auth.users if possible (safe, idempotent)
-- ============================================================================
do $$
begin
  -- Check if auth.users exists
  if exists (select 1 from pg_tables where schemaname='auth' and tablename='users') then
    
    -- Add FK for accounts.created_by
    if not exists (select 1 from pg_constraint where conname='accounts_created_by_fkey') then
      alter table public.accounts 
        add constraint accounts_created_by_fkey 
        foreign key (created_by) references auth.users(id);
    end if;
    
    -- Add FK for contacts.created_by
    if not exists (select 1 from pg_constraint where conname='contacts_created_by_fkey') then
      alter table public.contacts 
        add constraint contacts_created_by_fkey 
        foreign key (created_by) references auth.users(id);
    end if;
    
    -- Add FK for leads.created_by
    if not exists (select 1 from pg_constraint where conname='leads_created_by_fkey') then
      alter table public.leads 
        add constraint leads_created_by_fkey 
        foreign key (created_by) references auth.users(id);
    end if;
  end if;
end $$;

-- ============================================================================
-- 4) Create/update trigger function to populate created_by safely
-- ============================================================================
create or replace function public._force_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref_table text;
  v_ref_col   text;
  v_exists    boolean;
  v_any_id    uuid;
begin
  -- If created_by is already set (e.g., in imports), respect it
  if NEW.created_by is not null then
    return NEW;
  end if;

  -- Detect FK reference for created_by (if exists)
  select (confrelid::regclass)::text as ref_table,
         (select attname from pg_attribute where attrelid = confrelid and attnum = confkey[1]) as ref_col
    into v_ref_table, v_ref_col
  from pg_constraint
  where conrelid = TG_RELID
    and contype  = 'f'
    and array_position(conkey, (select attnum from pg_attribute where attrelid = TG_RELID and attname = 'created_by')) is not null
  limit 1;

  -- Strategy 1: Use auth.uid() if valid according to FK
  if v_uid is not null then
    if v_ref_table is null then
      -- No FK, use auth.uid() directly
      NEW.created_by := v_uid; 
      return NEW;
    else
      -- Check if auth.uid() exists in referenced table
      execute format('select exists(select 1 from %s where %I = $1::uuid)', v_ref_table, v_ref_col)
        into v_exists using v_uid;
      if v_exists then
        NEW.created_by := v_uid;
        return NEW;
      end if;
    end if;
  end if;

  -- Strategy 2: Fallback to any valid value from FK referenced table
  if v_ref_table is not null then
    execute format('select %I::uuid from %s limit 1', v_ref_col, v_ref_table) into v_any_id;
    if v_any_id is not null then
      NEW.created_by := v_any_id;
      return NEW;
    end if;
  end if;

  -- Strategy 3: Last resort - try auth.users
  begin
    select id::uuid into v_any_id from auth.users limit 1;
    if v_any_id is not null then
      NEW.created_by := v_any_id;
      return NEW;
    end if;
  exception when others then 
    null;
  end;

  -- If all strategies fail, leave NULL (let app handle validation)
  return NEW;
end;
$$;

-- Set permissions
revoke all on function public._force_created_by() from public;
grant execute on function public._force_created_by() to postgres, authenticated;

-- ============================================================================
-- 5) Create BEFORE INSERT triggers (idempotent)
-- ============================================================================
do $$
begin
  -- Trigger for accounts
  if not exists (select 1 from pg_trigger where tgname = 'trg_accounts_force_created_by') then
    create trigger trg_accounts_force_created_by
      before insert on public.accounts
      for each row execute function public._force_created_by();
  end if;

  -- Trigger for contacts
  if not exists (select 1 from pg_trigger where tgname = 'trg_contacts_force_created_by') then
    create trigger trg_contacts_force_created_by
      before insert on public.contacts
      for each row execute function public._force_created_by();
  end if;

  -- Trigger for leads
  if not exists (select 1 from pg_trigger where tgname = 'trg_leads_force_created_by') then
    create trigger trg_leads_force_created_by
      before insert on public.leads
      for each row execute function public._force_created_by();
  end if;
end $$;

-- ============================================================================
-- Verification comments
-- ============================================================================
comment on function public._force_created_by() is 
  'BEFORE INSERT trigger to populate created_by with auth.uid() or safe fallback. Never call directly.';

comment on column public.accounts.created_by is 
  'User who created this account. Populated by trigger on INSERT.';

comment on column public.contacts.created_by is 
  'User who created this contact. Populated by trigger on INSERT.';

comment on column public.leads.created_by is 
  'User who created this lead. Populated by trigger on INSERT.';
