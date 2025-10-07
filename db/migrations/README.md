# Database Migrations Guide

This directory contains SQL migration files for the database schema. Migrations must be applied in chronological order based on their timestamp prefix.

## Migration Naming Convention

All migration files follow this format:
```
YYYYMMDDHHMM__description.sql
```

Example: `202510071035__replace_convert_buyer_request_rpc.sql`

## Current Migration Order (Required)

Apply migrations in this exact order to ensure database integrity:

### 1. Core CRM Setup
- `202510061200__crm_core.sql` - Initial CRM tables and RLS
- `202510061201__crm_complete_migration.sql` - Complete CRM schema (accounts, contacts, leads, opportunities, tasks)
- `202510061202__crm_soft_delete_and_rpc.sql` - Add soft delete columns and OLD RPC (will be replaced)

### 2. Deals & Invoices
- `202510061203__deals_invoices.sql` - Deals, payments, invoices tables
- `202510061204__buyer_requests_setup.sql` - Buyer requests table with RLS

### 3. CMS & Soft Delete Enhancements
- `202510061205__cms_home_hero_setup.sql` - CMS tables for home page
- `202510061206__add_soft_delete_columns.sql` - Ensure soft delete on all tables
- `202510061207__create_active_views.sql` - Create views filtering deleted records
- `202510061208__soft_delete_rpc_functions.sql` - Soft delete utility functions
- `202510061209__soft_delete_rls_policies.sql` - RLS policies for soft delete

### 4. 🔧 Critical Fixes (MUST APPLY)
- **`202510071030__fix_created_by_triggers.sql`** ⭐ 
  - Adds `created_by` columns to accounts/contacts/leads
  - Removes problematic DEFAULT constraints
  - Creates `_force_created_by()` trigger function
  - Creates BEFORE INSERT triggers for auto-populating `created_by`
  
- **`202510071035__replace_convert_buyer_request_rpc.sql`** ⭐
  - Replaces old `convert_buyer_request_to_lead` RPC
  - Uses `first_name`/`last_name` (not `full_name`)
  - Uses `stage` (not `status`) for leads
  - Does NOT call trigger functions directly
  - Returns UUID instead of JSONB

## How to Apply Migrations

### Option 1: Using psql (Recommended for local testing)

```bash
# Set your database connection string
export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:[port]/postgres"

# Apply a single migration
psql "$SUPABASE_DB_URL" -f db/migrations/202510071030__fix_created_by_triggers.sql

# Or apply all migrations in order
for file in db/migrations/*.sql; do
  echo "Applying $file..."
  psql "$SUPABASE_DB_URL" -f "$file"
  if [ $? -ne 0 ]; then
    echo "❌ Error applying $file"
    exit 1
  fi
done
```

### Option 2: Using Supabase CLI

```bash
# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 3: Using Supabase Dashboard

1. Go to your project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file
4. Execute in chronological order

## Verification

After applying migrations, run the verification script:

```bash
psql "$SUPABASE_DB_URL" -f supabase/dev/verify_created_by.sql
```

Expected results:
- ✅ All `created_by` columns exist with NULL default
- ✅ `_force_created_by()` function exists as RETURNS trigger
- ✅ BEFORE INSERT triggers exist on accounts, contacts, leads
- ✅ Foreign keys point to auth.users
- ❌ No DEFAULT constraints calling trigger functions
- ❌ No direct calls to `_force_created_by()` in RPCs

## Common Issues & Solutions

### Issue: "trigger functions can only be called as triggers"

**Cause**: An RPC or DEFAULT constraint is calling a RETURNS trigger function directly.

**Solution**: 
1. Apply `202510071030__fix_created_by_triggers.sql` to remove bad DEFAULTs
2. Apply `202510071035__replace_convert_buyer_request_rpc.sql` to fix the RPC
3. Verify with `supabase/dev/verify_created_by.sql`

### Issue: "column 'full_name' does not exist"

**Cause**: RPC uses `full_name` but table has `first_name`/`last_name`.

**Solution**: Migration `202510071035` has been updated to use correct columns.

### Issue: "column 'status' does not exist in leads"

**Cause**: RPC uses `status` but table has `stage` (lead_stage enum).

**Solution**: Migration `202510071035` has been updated to use `stage`.

### Issue: "created_by cannot be null"

**Cause**: Missing trigger or DEFAULT constraint issue.

**Solution**: Ensure `202510071030__fix_created_by_triggers.sql` is applied and triggers are active.

## Best Practices

1. **Always test migrations locally first** before applying to production
2. **Use transactions** (`BEGIN; ... COMMIT;`) when manually applying migrations
3. **Never modify existing migration files** - create new ones for changes
4. **Document breaking changes** in migration comments
5. **Run verification scripts** after applying migrations
6. **Backup your database** before applying migrations to production

## Migration File Template

```sql
-- Migration: [Description]
-- Date: YYYY-MM-DD
-- Purpose: [What this migration does]

-- ============================================================================
-- [Section Name]
-- ============================================================================
-- Changes:
--   ✓ [Change 1]
--   ✓ [Change 2]
-- ============================================================================

-- Your SQL here

-- Grant permissions
grant execute on function public.your_function to authenticated;

-- Add comments
comment on function public.your_function is 'Description of what it does';
```

## Getting Help

If migrations fail:
1. Check error messages carefully
2. Review `supabase/dev/verify_created_by.sql` output
3. Ensure correct order of application
4. Check for schema conflicts with older migrations
5. Review `TESTING_CRM_FLOW.md` for end-to-end testing steps
