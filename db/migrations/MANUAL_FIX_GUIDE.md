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

## Verification Checklist

After applying the fix, verify these items:

- [ ] `created_by` columns exist on `accounts`, `contacts`, `leads`
- [ ] No DEFAULT constraints on `created_by` columns
- [ ] `_force_created_by()` function exists and returns `trigger`
- [ ] BEFORE INSERT triggers exist on all three tables
- [ ] `convert_buyer_request_to_lead` RPC exists and returns `uuid`
- [ ] Can successfully convert a buyer request to lead in the UI

---

## Success Criteria

✅ **Working System:**

1. Create a buyer request on the public site
2. Go to Backoffice → Inbound Requests
3. Click "Convert to Lead" on a request
4. No errors appear
5. New lead appears in Leads page
6. Badge count updates correctly

If all steps work, the fix is successful! 🎉

---

## Support

If you continue experiencing issues:

1. Run `supabase/dev/verify_created_by.sql` and share the output
2. Check Supabase logs for detailed error messages
3. Share the exact error message from the UI
