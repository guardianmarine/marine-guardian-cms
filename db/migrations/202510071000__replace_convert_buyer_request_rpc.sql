-- Replace convert_buyer_request_to_lead RPC with dynamic FK fallback
-- No triggers, no _default_owner_user(), handles FK violations dynamically

create or replace function public.convert_buyer_request_to_lead(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_actor uuid := auth.uid();
  v_now   timestamptz := now();

  v_name   text;
  v_email  text;
  v_phone  text;
  v_unit   uuid;

  v_account_id uuid;
  v_contact_id uuid;
  v_lead_id    uuid;

  v_account_name text;
  v_account_kind text; -- 'company' | 'individual'

  -- flags accounts
  acc_has_created_by boolean;
  acc_has_owner_user boolean;
  acc_has_owner_id   boolean;
  acc_has_created_at boolean;
  acc_has_kind       boolean;

  -- flags contacts
  con_has_full_name  boolean;
  con_has_name       boolean;
  con_has_email      boolean;
  con_has_phone      boolean;
  con_has_account_id boolean;
  con_has_created_by boolean;
  con_has_owner_user boolean;
  con_has_owner_id   boolean;
  con_has_created_at boolean;

  -- flags leads
  lead_has_account_id boolean;
  lead_has_contact_id boolean;
  lead_has_unit_id    boolean;
  lead_has_source     boolean;
  lead_has_status     boolean;
  lead_has_created_by boolean;
  lead_has_owner_user boolean;
  lead_has_owner_id   boolean;
  lead_has_created_at boolean;

  -- SQL dinámico
  sql_text  text;
  cols_list text;
  vals_list text;
  set_list  text;

  -- FK fallback (descubrir tabla/col de accounts_created_by_fkey)
  v_ref_table text;
  v_ref_col   text;
  v_fallback_owner uuid;
begin
  -- 0) Sesión obligatoria
  if v_actor is null then
    raise exception 'Auth required: login needed' using errcode = '28000';
  end if;

  -- 1) Cargar buyer_request
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

  -- 2) Flags de accounts
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='created_by'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='owner_user'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='owner_id'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='created_at'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='kind')
    into acc_has_created_by, acc_has_owner_user, acc_has_owner_id, acc_has_created_at, acc_has_kind;

  -- 3) KIND válido (company | individual) por heurística en nombre
  if v_name is not null and (
       v_name ~* '\b(s\.?a\.?|s\.?\s*de\s*r\.?l\.?|sa de cv|sa|s de rl|ltda|llc|inc|corp|corporation|gmbh|spa|plc|ltd|s\.?c\.?p?\.?)\b'
     ) then
    v_account_kind := 'company';
  else
    v_account_kind := 'individual';
  end if;

  -- 4) Buscar/crear ACCOUNT (sin ON CONFLICT)
  select a.id into v_account_id
  from public.accounts a
  where lower(a.name) = lower(v_account_name)
  limit 1;

  if v_account_id is null then
    cols_list := 'name';
    vals_list := quote_literal(v_account_name);

    if acc_has_kind then
      cols_list := cols_list || ', kind';
      vals_list := vals_list || ', ' || quote_literal(v_account_kind);
    end if;
    if acc_has_created_by then
      cols_list := cols_list || ', created_by';
      vals_list := vals_list || ', ' || quote_literal(v_actor::text);
    end if;
    if acc_has_owner_user then
      cols_list := cols_list || ', owner_user';
      vals_list := vals_list || ', ' || quote_literal(v_actor::text);
    elsif acc_has_owner_id then
      cols_list := cols_list || ', owner_id';
      vals_list := vals_list || ', ' || quote_literal(v_actor::text);
    end if;
    if acc_has_created_at then
      cols_list := cols_list || ', created_at';
      vals_list := vals_list || ', ' || quote_literal(v_now::text);
    end if;

    sql_text := format('insert into public.accounts (%s) values (%s) returning id', cols_list, vals_list);

    begin
      execute sql_text into v_account_id;

    exception when foreign_key_violation then
      -- Descubrir dinámicamente la tabla/col de la FK accounts_created_by_fkey
      select (confrelid::regclass)::text as ref_table,
             (select attname from pg_attribute where attrelid = confrelid and attnum = confkey[1]) as ref_col
        into v_ref_table, v_ref_col
      from pg_constraint
      where conname = 'accounts_created_by_fkey'
        and conrelid = 'public.accounts'::regclass
      limit 1;

      if v_ref_table is null or v_ref_col is null then
        raise exception 'FK violation on accounts.created_by and could not resolve referenced table/column';
      end if;

      -- Tomar cualquier id válido de la tabla referenciada
      execute format('select %I::uuid from %s limit 1', v_ref_col, v_ref_table) into v_fallback_owner;

      if v_fallback_owner is null then
        raise exception 'FK violation on accounts.created_by and no fallback owner available in %', v_ref_table;
      end if;

      -- Reintento con fallback owner
      cols_list := 'name';
      vals_list := quote_literal(v_account_name);

      if acc_has_kind then
        cols_list := cols_list || ', kind';
        vals_list := vals_list || ', ' || quote_literal(v_account_kind);
      end if;
      if acc_has_created_by then
        cols_list := cols_list || ', created_by';
        vals_list := vals_list || ', ' || quote_literal(v_fallback_owner::text);
      end if;
      if acc_has_owner_user then
        cols_list := cols_list || ', owner_user';
        vals_list := vals_list || ', ' || quote_literal(v_fallback_owner::text);
      elsif acc_has_owner_id then
        cols_list := cols_list || ', owner_id';
        vals_list := vals_list || ', ' || quote_literal(v_fallback_owner::text);
      end if;
      if acc_has_created_at then
        cols_list := cols_list || ', created_at';
        vals_list := vals_list || ', ' || quote_literal(v_now::text);
      end if;

      sql_text := format('insert into public.accounts (%s) values (%s) returning id', cols_list, vals_list);
      execute sql_text into v_account_id;
    end;
  end if;

  -- 5) CONTACTS: flags + buscar/crear (email o nombre+tel)
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='full_name'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='name'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='email'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='phone'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='account_id'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='created_by'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='owner_user'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='owner_id'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name='created_at')
    into con_has_full_name, con_has_name, con_has_email, con_has_phone, con_has_account_id,
         con_has_created_by, con_has_owner_user, con_has_owner_id, con_has_created_at;

  if v_email is not null and con_has_email then
    select c.id into v_contact_id from public.contacts c where lower(c.email)=v_email limit 1;
  else
    if con_has_full_name then
      select c.id into v_contact_id
      from public.contacts c
      where lower(c.full_name)=lower(coalesce(v_name,'prospect')) and coalesce(c.phone,'')=coalesce(v_phone,'')
      limit 1;
    elsif con_has_name then
      select c.id into v_contact_id
      from public.contacts c
      where lower(c.name)=lower(coalesce(v_name,'prospect')) and coalesce(c.phone,'')=coalesce(v_phone,'')
      limit 1;
    end if;
  end if;

  if v_contact_id is null then
    cols_list := ''; vals_list := '';

    if con_has_full_name then
      cols_list := 'full_name'; vals_list := quote_literal(coalesce(v_name, v_email, 'Prospect'));
    elsif con_has_name then
      cols_list := 'name'; vals_list := quote_literal(coalesce(v_name, v_email, 'Prospect'));
    end if;
    if con_has_email and v_email is not null then
      cols_list := cols_list || ', email'; vals_list := vals_list || ', ' || quote_literal(v_email);
    end if;
    if con_has_phone then
      cols_list := cols_list || ', phone'; vals_list := vals_list || ', ' || quote_literal(v_phone);
    end if;
    if con_has_account_id then
      cols_list := cols_list || ', account_id'; vals_list := vals_list || ', ' || quote_literal(v_account_id::text);
    end if;
    if con_has_created_by then
      cols_list := cols_list || ', created_by'; vals_list := vals_list || ', ' || quote_literal(v_actor::text);
    end if;
    if con_has_owner_user then
      cols_list := cols_list || ', owner_user'; vals_list := vals_list || ', ' || quote_literal(v_actor::text);
    elsif con_has_owner_id then
      cols_list := cols_list || ', owner_id'; vals_list := vals_list || ', ' || quote_literal(v_actor::text);
    end if;
    if con_has_created_at then
      cols_list := cols_list || ', created_at'; vals_list := vals_list || ', ' || quote_literal(v_now::text);
    end if;

    if cols_list = '' then raise exception 'contacts table lacks expected columns'; end if;

    sql_text := format('insert into public.contacts (%s) values (%s) returning id', cols_list, vals_list);
    execute sql_text into v_contact_id;
  else
    set_list := '';
    if (con_has_full_name or con_has_name) and v_name is not null then
      if con_has_full_name then
        set_list := set_list || case when set_list<>'' then ', ' else '' end || format('full_name = %L', v_name);
      elsif con_has_name then
        set_list := set_list || case when set_list<>'' then ', ' else '' end || format('name = %L', v_name);
      end if;
    end if;
    if con_has_phone and v_phone is not null then
      set_list := set_list || case when set_list<>'' then ', ' else '' end || format('phone = coalesce(%L, phone)', v_phone);
    end if;
    if con_has_account_id then
      set_list := set_list || case when set_list<>'' then ', ' else '' end || format('account_id = %L::uuid', v_account_id::text);
    end if;
    if set_list <> '' then
      sql_text := format('update public.contacts set %s where id = %L::uuid', set_list, v_contact_id::text);
      execute sql_text;
    end if;
  end if;

  -- 6) flags leads
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='account_id'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='contact_id'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='unit_id'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='source'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='status'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='created_by'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='owner_user'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='owner_id'),
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='created_at')
    into lead_has_account_id, lead_has_contact_id, lead_has_unit_id,
         lead_has_source, lead_has_status, lead_has_created_by,
         lead_has_owner_user, lead_has_owner_id, lead_has_created_at;

  -- 7) crear lead
  cols_list := ''; vals_list := '';
  if lead_has_account_id then cols_list := 'account_id'; vals_list := quote_literal(v_account_id::text); end if;
  if lead_has_contact_id then cols_list := cols_list || ', contact_id'; vals_list := vals_list || ', ' || quote_literal(v_contact_id::text); end if;
  if lead_has_unit_id    then cols_list := cols_list || ', unit_id';    vals_list := vals_list || ', ' || quote_literal(v_unit::text); end if;
  if lead_has_source     then cols_list := cols_list || ', source';      vals_list := vals_list || ', ' || quote_literal('inbound'); end if;
  if lead_has_status     then cols_list := cols_list || ', status';      vals_list := vals_list || ', ' || quote_literal('new'); end if;
  if lead_has_created_by then cols_list := cols_list || ', created_by';  vals_list := vals_list || ', ' || quote_literal(v_actor::text); end if;
  if lead_has_owner_user then cols_list := cols_list || ', owner_user';  vals_list := vals_list || ', ' || quote_literal(v_actor::text);
  elsif lead_has_owner_id then cols_list := cols_list || ', owner_id';   vals_list := vals_list || ', ' || quote_literal(v_actor::text); end if;
  if lead_has_created_at then cols_list := cols_list || ', created_at';  vals_list := vals_list || ', ' || quote_literal(v_now::text); end if;

  if cols_list = '' then raise exception 'leads table lacks expected columns'; end if;

  sql_text := format('insert into public.leads (%s) values (%s) returning id', cols_list, vals_list);
  execute sql_text into v_lead_id;

  -- 8) marcar buyer_request como convertido (si existen columnas)
  begin
    set_list := '';
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='buyer_requests' and column_name='status') then
      set_list := set_list || case when set_list<>'' then ', ' else '' end || format('status = %L', 'converted');
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='buyer_requests' and column_name='converted_at') then
      set_list := set_list || case when set_list<>'' then ', ' else '' end || format('converted_at = %L::timestamptz', v_now::text);
    end if;
    if set_list <> '' then
      sql_text := format('update public.buyer_requests set %s where id = %L::uuid', set_list, p_request_id::text);
      execute sql_text;
    end if;
  exception when others then null; end;

  return v_lead_id;
end;
$fn$;

grant execute on function public.convert_buyer_request_to_lead(uuid) to authenticated;
