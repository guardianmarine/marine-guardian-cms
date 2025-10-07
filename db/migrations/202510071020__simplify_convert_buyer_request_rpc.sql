-- Migration: Simplify convert_buyer_request_to_lead RPC
-- Date: 2025-10-07
-- Purpose: Remove explicit created_by handling, let triggers do the work

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
begin
  if v_uid is null then
    raise exception 'Auth required' using errcode = '28000';
  end if;

  select br.name, br.email, br.phone, br.unit_id
    into v_name, v_email, v_phone, v_unit
  from public.buyer_requests br
  where br.id = p_request_id;

  if not found then
    raise exception 'buyer_request % not found', p_request_id using errcode = 'P0002';
  end if;

  v_name  := nullif(trim(v_name), '');
  v_email := nullif(lower(trim(v_email)), '');
  v_phone := nullif(regexp_replace(coalesce(v_phone,''), '\s+', '', 'g'), '');
  v_account_name := coalesce(v_name, coalesce(v_email, 'Inbound'));

  if v_name is not null and (
      v_name ~* '\b(s\.?a\.?|s\.?\s*de\s*r\.?l\.?|sa de cv|sa|s de rl|ltda|llc|inc|corp|corporation|gmbh|spa|plc|ltd|s\.?c\.?p?\.?)\b'
     ) then
    v_account_kind := 'company';
  else
    v_account_kind := 'individual';
  end if;

  -- Account (buscar por nombre)
  select a.id into v_account_id
  from public.accounts a
  where lower(a.name) = lower(v_account_name)
  limit 1;

  if v_account_id is null then
    insert into public.accounts (name, kind)
    values (v_account_name, v_account_kind)
    returning id into v_account_id;
    -- created_by lo rellena el trigger BEFORE INSERT
  end if;

  -- Contact (buscar por email o por nombre+tel)
  if v_email is not null then
    select c.id into v_contact_id
    from public.contacts c
    where lower(c.email) = v_email
    limit 1;

    if v_contact_id is null then
      insert into public.contacts (full_name, email, phone, account_id)
      values (coalesce(v_name, v_email), v_email, v_phone, v_account_id)
      returning id into v_contact_id;
    else
      update public.contacts
         set full_name = coalesce(coalesce(v_name, v_email), full_name),
             phone     = coalesce(v_phone, phone),
             account_id= coalesce(v_account_id, account_id)
       where id = v_contact_id;
    end if;
  else
    select c.id into v_contact_id
    from public.contacts c
    where lower(coalesce(c.full_name, c.name)) = lower(coalesce(v_name,'Prospect'))
      and coalesce(c.phone,'') = coalesce(v_phone,'')
    limit 1;

    if v_contact_id is null then
      insert into public.contacts (full_name, phone, account_id)
      values (coalesce(v_name, 'Prospect'), v_phone, v_account_id)
      returning id into v_contact_id;
    end if;
  end if;

  -- Lead
  insert into public.leads (account_id, contact_id, unit_id, source, status)
  values (v_account_id, v_contact_id, v_unit, 'inbound', 'new')
  returning id into v_lead_id;

  -- Marcar buyer_request como convertido
  update public.buyer_requests
     set status = 'converted',
         converted_at = v_now
   where id = p_request_id;

  return v_lead_id;
end;
$fn$;

grant execute on function public.convert_buyer_request_to_lead(uuid) to authenticated;
