# Manual Database Fix Guide

**Use this guide if automatic migrations fail or if you need to apply fixes directly to your Supabase database.**

---

## Prerequisites

- Access to Supabase Dashboard (SQL Editor) or `psql` CLI
- Admin/Owner role on the Supabase project

---

## Option 1: Supabase Dashboard (Recommended)

### Step 1: Navigate to SQL Editor

1. Go to your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**

### Step 2: Copy and Execute the Migration

Copy the **entire contents** of `db/migrations/202510071040__force_fix_created_by_system.sql` and paste it into the SQL editor.

**Important:** Make sure to copy the whole file, including all comments and sections.

### Step 3: Run the Query

1. Click **"Run"** (or press `Cmd/Ctrl + Enter`)
2. Wait for the query to complete (should take 1-5 seconds)
3. Check the **Results** panel for any errors

### Step 4: Verify Success

Run the verification script:

```sql
-- Copy and run the contents of:
-- supabase/dev/verify_created_by.sql
```

Expected output should show:
- ✅ All checks passed
- No DEFAULT constraints on `created_by` columns
- Triggers active on `accounts`, `contacts`, `leads`
- RPC `convert_buyer_request_to_lead` exists and returns `uuid`

---

## Option 2: psql Command Line

### Step 1: Get Database Connection String

1. Go to Supabase Dashboard → **Settings** → **Database**
2. Copy the **Connection string** (use "Transaction" mode)
3. Replace `[YOUR-PASSWORD]` with your database password

### Step 2: Connect to Database

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"
```

### Step 3: Execute Migration

```bash
# Run the migration file
\i db/migrations/202510071040__force_fix_created_by_system.sql
```

### Step 4: Verify

```bash
# Run the verification script
\i supabase/dev/verify_created_by.sql
```

---

## Option 3: Manual SQL Commands (Nuclear Option)

If the migration file fails, run these commands **one by one** in SQL Editor:

### 1. Remove DEFAULT Constraints

```sql
-- Remove DEFAULT on accounts.created_by
alter table public.accounts alter column created_by drop default;

-- Remove DEFAULT on contacts.created_by
alter table public.contacts alter column created_by drop default;

-- Remove DEFAULT on leads.created_by
alter table public.leads alter column created_by drop default;
```

### 2. Drop Old Triggers

```sql
drop trigger if exists trg_accounts_force_created_by on public.accounts;
drop trigger if exists trg_contacts_force_created_by on public.contacts;
drop trigger if exists trg_leads_force_created_by on public.leads;
```

### 3. Recreate Trigger Function

```sql
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
  if NEW.created_by is not null then
    return NEW;
  end if;

  v_uid := auth.uid();
  
  if v_uid is not null then
    if exists (select 1 from auth.users where id = v_uid) then
      NEW.created_by := v_uid;
      return NEW;
    end if;
  end if;

  select id into v_fallback_uid
  from auth.users
  limit 1;

  if v_fallback_uid is not null then
    NEW.created_by := v_fallback_uid;
    return NEW;
  end if;

  return NEW;
end;
$$;
```

### 4. Create Triggers

```sql
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
```

### 5. Recreate RPC

```sql
drop function if exists public.convert_buyer_request_to_lead(uuid) cascade;

-- (Copy the full RPC definition from the migration file)
```

---

## Troubleshooting

### Error: "trigger functions can only be called as triggers"

**Cause:** An old RPC or DEFAULT constraint is calling `_force_created_by()` directly.

**Fix:**
1. Check for DEFAULT constraints:
   ```sql
   select table_name, column_name, column_default
   from information_schema.columns
   where table_schema = 'public'
     and table_name in ('accounts', 'contacts', 'leads')
     and column_name = 'created_by';
   ```
2. If `column_default` contains `_force_created_by()`, run:
   ```sql
   alter table public.[table_name] alter column created_by drop default;
   ```

### Error: "column 'created_by' does not exist"

**Cause:** The column was not created by previous migrations.

**Fix:**
1. Add the column:
   ```sql
   alter table public.accounts add column if not exists created_by uuid;
   alter table public.contacts add column if not exists created_by uuid;
   alter table public.leads add column if not exists created_by uuid;
   ```
2. Add foreign keys:
   ```sql
   alter table public.accounts 
     add constraint fk_accounts_created_by foreign key (created_by) references auth.users(id);
   
   alter table public.contacts 
     add constraint fk_contacts_created_by foreign key (created_by) references auth.users(id);
   
   alter table public.leads 
     add constraint fk_leads_created_by foreign key (created_by) references auth.users(id);
   ```

### Error: "relation 'auth.users' does not exist"

**Cause:** You're testing in a local environment without Supabase Auth.

**Fix:**
1. Use a real Supabase project for testing
2. Or remove the FK constraints (not recommended for production)

---

## Option 4: Direct SQL Commands (Emergency Fix)

If all else fails, copy and paste these commands directly into SQL Editor:

```sql
-- Step 1: Remove DEFAULT constraints
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN 
    SELECT t.relname as table_name
    FROM pg_attribute a
    JOIN pg_class t ON a.attrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    WHERE a.attname = 'created_by' AND n.nspname = 'public'
      AND t.relname IN ('accounts', 'contacts', 'leads') AND d.adbin IS NOT NULL
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN created_by DROP DEFAULT', r.table_name);
  END LOOP;
END $$;

-- Step 2: Drop old triggers and functions
DROP TRIGGER IF EXISTS trg_accounts_force_created_by ON public.accounts CASCADE;
DROP TRIGGER IF EXISTS trg_contacts_force_created_by ON public.contacts CASCADE;
DROP TRIGGER IF EXISTS trg_leads_force_created_by ON public.leads CASCADE;
DROP FUNCTION IF EXISTS public._force_created_by() CASCADE;
DROP FUNCTION IF EXISTS public.convert_buyer_request_to_lead(uuid) CASCADE;

-- Step 3: Recreate the trigger function
CREATE OR REPLACE FUNCTION public._force_created_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_auth_user uuid; v_fallback_user uuid;
BEGIN
  IF NEW.created_by IS NOT NULL THEN RETURN NEW; END IF;
  v_auth_user := auth.uid();
  IF v_auth_user IS NOT NULL THEN
    NEW.created_by := v_auth_user;
    RETURN NEW;
  END IF;
  SELECT id INTO v_fallback_user FROM auth.users WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF v_fallback_user IS NOT NULL THEN
    NEW.created_by := v_fallback_user;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Create triggers
CREATE TRIGGER trg_accounts_force_created_by BEFORE INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public._force_created_by();
CREATE TRIGGER trg_contacts_force_created_by BEFORE INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public._force_created_by();
CREATE TRIGGER trg_leads_force_created_by BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public._force_created_by();

-- Step 5: Recreate the RPC (see migration file for full version)
-- For brevity, this is simplified - use the full version from 202510071050__nuclear_fix_created_by.sql
```

## Verification Checklist

After applying the fix, run this in SQL Editor:

```sql
-- Check DEFAULT constraints (should return 0 rows)
SELECT t.relname, pg_get_expr(d.adbin, d.adrelid)
FROM pg_attribute a
JOIN pg_class t ON a.attrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
WHERE a.attname = 'created_by' AND n.nspname = 'public'
  AND t.relname IN ('accounts', 'contacts', 'leads') AND d.adbin IS NOT NULL;

-- Check triggers (should return 3 rows)
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND trigger_name LIKE '%force_created_by%';

-- Check RPC exists (should return 1 row)
SELECT proname FROM pg_proc WHERE proname = 'convert_buyer_request_to_lead';
```

Checklist:
- [ ] `created_by` columns exist in accounts, contacts, leads
- [ ] **NO DEFAULT constraints** on `created_by` columns (query returns 0 rows)
- [ ] Triggers exist: 3 triggers named `trg_*_force_created_by`
- [ ] Function `_force_created_by()` exists
- [ ] RPC `convert_buyer_request_to_lead` exists
- [ ] Converting a buyer request works without errors

## Success Criteria

Test the complete flow:

1. Go to `/backoffice/crm/inbound-requests`
2. Click "Convert to Lead" on any pending request
3. ✅ See success toast notification
4. ✅ Be redirected to `/backoffice/crm/leads/{lead_id}`
5. ✅ Lead has proper account and contact links
6. ✅ All `created_by` fields are populated
7. ✅ **NO ERROR**: "trigger functions can only be called as triggers"

If all these work, the fix was successful! 🎉

---

## Support

If you continue experiencing issues:

1. Run `supabase/dev/verify_created_by.sql` and share the output
2. Check Supabase logs for detailed error messages
3. Share the exact error message from the UI
