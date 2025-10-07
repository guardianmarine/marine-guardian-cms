-- Migration: Replace convert_buyer_request_to_lead RPC (remove trigger function calls)
-- Date: 2025-10-07
-- Purpose: Ensure RPC does NOT call trigger functions and relies on BEFORE INSERT triggers

-- ============================================================================
-- Replace RPC: convert_buyer_request_to_lead
-- ============================================================================
-- Changes:
--   ✓ NO calls to _default_owner_user() or _force_created_by()
--   ✓ NO manual setting of created_by (triggers handle it)
--   ✓ Returns UUID directly (not JSONB)
--   ✓ Follows: inbound → account/contact/lead → mark converted
-- ============================================================================

create or replace function public.convert_buyer_request_to_lead(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
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
  v_account_kind text; -- 'company' | 'individual'
  
  v_name_parts text[];
  v_first_name text;
  v_last_name text;
begin
  -- Auth check
  if v_uid is null then
    raise exception 'Auth required' using errcode = '28000';
  end if;

  -- Get buyer request data
  select br.name, br.email, br.phone, br.unit_id
    into v_name, v_email, v_phone, v_unit
  from public.buyer_requests br
  where br.id = p_request_id;

  if not found then
    raise exception 'buyer_request % not found', p_request_id using errcode = 'P0002';
  end if;

  -- Clean data and split name
  v_name  := nullif(trim(v_name), '');
  v_email := nullif(lower(trim(v_email)), '');
  v_phone := nullif(regexp_replace(coalesce(v_phone,''), '\s+', '', 'g'), '');
  v_account_name := coalesce(v_name, coalesce(v_email, 'Inbound'));

  -- Split name into first_name and last_name
  v_name_parts := regexp_split_to_array(coalesce(v_name, 'Prospect'), '\s+');
  v_first_name := v_name_parts[1];
  v_last_name := array_to_string(v_name_parts[2:array_length(v_name_parts, 1)], ' ');

  -- Determine account type (company vs individual)
  if v_name is not null and (
      v_name ~* '\b(s\.?a\.?|s\.?\s*de\s*r\.?l\.?|sa de cv|sa|s de rl|ltda|llc|inc|corp|corporation|gmbh|spa|plc|ltd|s\.?c\.?p?\.?)\b'
     ) then
    v_account_kind := 'company';
  else
    v_account_kind := 'individual';
  end if;

  -- ========================================================================
  -- Account: Find or create (NO created_by - trigger handles it)
  -- ========================================================================
  select a.id into v_account_id
  from public.accounts a
  where lower(a.name) = lower(v_account_name)
  limit 1;

  if v_account_id is null then
    insert into public.accounts (name, kind)
    values (v_account_name, v_account_kind)
    returning id into v_account_id; 
    -- Note: created_by populated by trg_accounts_force_created_by trigger
  end if;

  -- ========================================================================
  -- Contact: Find by email or create (NO created_by - trigger handles it)
  -- ========================================================================
  if v_email is not null then
    select c.id into v_contact_id
    from public.contacts c
    where lower(c.email) = v_email
    limit 1;

    if v_contact_id is null then
      insert into public.contacts (first_name, last_name, email, phone, account_id)
      values (v_first_name, v_last_name, v_email, v_phone, v_account_id)
      returning id into v_contact_id;
      -- Note: created_by populated by trg_contacts_force_created_by trigger
    else
      -- Update existing contact
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
      insert into public.contacts (first_name, last_name, phone, account_id)
      values (v_first_name, v_last_name, v_phone, v_account_id)
      returning id into v_contact_id;
      -- Note: created_by populated by trg_contacts_force_created_by trigger
    end if;
  end if;

  -- ========================================================================
  -- Lead: Create new lead (NO created_by - trigger handles it)
  -- ========================================================================
  insert into public.leads (account_id, contact_id, unit_id, source, stage)
  values (v_account_id, v_contact_id, v_unit, 'inbound', 'new'::lead_stage)
  returning id into v_lead_id;
  -- Note: created_by populated by trg_leads_force_created_by trigger

  -- ========================================================================
  -- Mark buyer request as converted
  -- ========================================================================
  update public.buyer_requests
     set status = 'converted',
         converted_at = v_now
   where id = p_request_id;

  -- Return only the lead ID (UUID)
  return v_lead_id;
end;
$fn$;

-- Grant permissions
grant execute on function public.convert_buyer_request_to_lead(uuid) to authenticated;

-- Add helpful comment
comment on function public.convert_buyer_request_to_lead(uuid) is 
  'Converts a buyer request to lead. Does NOT set created_by manually - relies on BEFORE INSERT triggers. Returns lead UUID.';
