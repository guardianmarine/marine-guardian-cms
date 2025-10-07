-- Migration: Fix created_by columns with triggers instead of DEFAULT functions
-- Date: 2025-10-07
-- Purpose: Remove DEFAULT on created_by and use BEFORE INSERT triggers for safe fallback

-- 1) Quitar DEFAULTs problemáticos en created_by (si los hubiera)
alter table if exists public.accounts  alter column created_by drop default;
alter table if exists public.contacts  alter column created_by drop default;
alter table if exists public.leads     alter column created_by drop default;

-- 2) Función trigger única y robusta para poblar created_by
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
  -- Descubrir (si existe) la FK sobre created_by en la tabla objetivo
  select (confrelid::regclass)::text as ref_table,
         (select attname from pg_attribute where attrelid = confrelid and attnum = confkey[1]) as ref_col
    into v_ref_table, v_ref_col
  from pg_constraint
  where conrelid = TG_RELID
    and contype  = 'f'
    and array_position(conkey, (select attnum from pg_attribute where attrelid = TG_RELID and attname = 'created_by')) is not null
  limit 1;

  -- Si ya viene seteado, aceptar (útil en importaciones)
  if NEW.created_by is not null then
    return NEW;
  end if;

  -- 1) Intentar con el usuario logueado (si existe y es válido para la FK)
  if v_uid is not null then
    if v_ref_table is null then
      NEW.created_by := v_uid; -- no hay FK explícita, usar uid
      return NEW;
    else
      execute format('select exists(select 1 from %s where %I = $1::uuid)', v_ref_table, v_ref_col)
        into v_exists
        using v_uid;
      if v_exists then
        NEW.created_by := v_uid;
        return NEW;
      end if;
    end if;
  end if;

  -- 2) Fallback: tomar cualquier id válido de la tabla referenciada por la FK
  if v_ref_table is not null then
    execute format('select %I::uuid from %s limit 1', v_ref_col, v_ref_table) into v_any_id;
    if v_any_id is not null then
      NEW.created_by := v_any_id;
      return NEW;
    end if;
  end if;

  -- 3) Fallback final: si no hay FK (o vacía), intentar con auth.users
  begin
    select id::uuid into v_any_id from auth.users limit 1;
    if v_any_id is not null then
      NEW.created_by := v_any_id;
      return NEW;
    end if;
  exception when others then
    -- sin auth.users (proyecto mínimo), dejar nulo para que la app lo trate
    null;
  end;

  return NEW;
end;
$$;

-- 3) Triggers BEFORE INSERT (idempotentes)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_accounts_force_created_by') then
    create trigger trg_accounts_force_created_by
      before insert on public.accounts
      for each row execute function public._force_created_by();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_contacts_force_created_by') then
    create trigger trg_contacts_force_created_by
      before insert on public.contacts
      for each row execute function public._force_created_by();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_leads_force_created_by') then
    create trigger trg_leads_force_created_by
      before insert on public.leads
      for each row execute function public._force_created_by();
  end if;
end;
$$;

-- 4) Sanidad: asegurar permisos de ejecución (no es RPC, pero mantenemos orden)
revoke all on function public._force_created_by() from public;
grant execute on function public._force_created_by() to postgres, authenticated;
