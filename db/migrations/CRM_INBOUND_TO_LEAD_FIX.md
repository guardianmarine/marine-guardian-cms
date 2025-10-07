# CRM Inbound Request to Lead Conversion - Complete Fix Documentation

## Problem Summary

The "Convert to Lead" button in the Inbound Requests page was failing with the error:

```
Failed to create lead: trigger functions can only be called as triggers
```

## Root Cause Analysis

### What Went Wrong

1. **Conflicting Migration Files**: Multiple migrations (`202510061202`, `202510071030`, `202510071035`, `202510071040`) all attempted to define the same RPC and triggers, creating conflicts.

2. **Problematic DEFAULT Constraints**: Some migrations added `DEFAULT` constraints on `created_by` columns that called trigger functions directly:
   ```sql
   ALTER TABLE accounts ALTER COLUMN created_by SET DEFAULT _force_created_by();
   ```
   This is invalid because trigger functions can ONLY be called by triggers, not by DEFAULT constraints.

3. **Old RPC Still Active**: The database was likely still running an older version of the `convert_buyer_request_to_lead` RPC that either:
   - Called trigger functions directly
   - Had the old DEFAULT constraints interfering with its execution

4. **Historical Context**: The system worked correctly in early October 2024 (commit "feat: Implement Invoice PDF generation"). Subsequent migrations introduced the problematic patterns.

## The Solution: Nuclear Cleanup and Rebuild

### Migration: `202510071050__nuclear_fix_created_by.sql`

This migration performs a complete cleanup and rebuild:

#### Phase 1: Nuclear Cleanup
- **Removes ALL DEFAULT constraints** on `created_by` columns
- **Drops ALL old triggers** (with CASCADE)
- **Drops ALL trigger functions** (with CASCADE)
- **Drops the RPC** (with CASCADE)

#### Phase 2: Rebuild from Scratch
- **Recreates `_force_created_by()` function**: Clean implementation that only runs as a trigger
- **Recreates triggers**: `BEFORE INSERT` triggers on `accounts`, `contacts`, `leads`
- **Recreates RPC**: New version with:
  - Enhanced logging for diagnostics
  - Proper error handling
  - No direct calls to trigger functions
  - Reliance on triggers to populate `created_by`

#### Phase 3: Verification
- Validates that all components are installed correctly
- Reports status via RAISE NOTICE statements

## How It Works Now

### The Correct Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Convert to Lead" button                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Frontend calls RPC: convert_buyer_request_to_lead()          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. RPC validates buyer_request exists and not already converted │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RPC finds or creates ACCOUNT                                 │
│    INSERT INTO accounts (name, kind)                            │
│    VALUES ('John Doe', 'individual')                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. TRIGGER fires: trg_accounts_force_created_by                 │
│    Calls: _force_created_by()                                   │
│    Sets: NEW.created_by = auth.uid()                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. RPC finds or creates CONTACT                                 │
│    INSERT INTO contacts (account_id, first_name, ...)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. TRIGGER fires: trg_contacts_force_created_by                 │
│    Calls: _force_created_by()                                   │
│    Sets: NEW.created_by = auth.uid()                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. RPC creates LEAD                                             │
│    INSERT INTO leads (account_id, contact_id, ...)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. TRIGGER fires: trg_leads_force_created_by                    │
│    Calls: _force_created_by()                                   │
│    Sets: NEW.created_by = auth.uid()                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. RPC marks buyer_request as 'converted'                      │
│     Returns: lead_id (UUID)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 11. Frontend receives lead_id, shows success toast              │
│     Navigates to: /backoffice/crm/leads/{lead_id}               │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Trigger Functions Are ONLY Called by Triggers**
   - Never called directly in DEFAULT constraints
   - Never called directly in RPCs or other functions
   - Only called automatically by database triggers

2. **RPC Focuses on Business Logic**
   - Validates input
   - Finds or creates records
   - Links relationships
   - Returns results
   - Does NOT manually set `created_by`

3. **Triggers Handle Audit Fields**
   - Automatically populate `created_by` using `auth.uid()`
   - Fall back to a valid user if `auth.uid()` is NULL
   - Run on every INSERT, ensuring consistency

## Files Involved

### Deleted (Obsolete)
- ❌ `db/migrations/202510061202__crm_soft_delete_and_rpc.sql`

### Created/Updated
- ✅ `db/migrations/202510071050__nuclear_fix_created_by.sql` (NEW - nuclear cleanup)
- ✅ `db/migrations/MANUAL_FIX_GUIDE.md` (UPDATED - manual application steps)
- ✅ `supabase/dev/verify_created_by.sql` (UPDATED - enhanced verification)
- ✅ `db/migrations/CRM_INBOUND_TO_LEAD_FIX.md` (NEW - this documentation)

### Frontend
- ✅ `src/services/crm/convertBuyerRequestToLead.ts` (Already correct)
- ✅ `src/pages/backoffice/crm/InboundRequests.tsx` (Uses the service correctly)

## How to Apply the Fix

### Option 1: Automatic Migration (Recommended)

The migration should run automatically when you deploy or push changes. The system will detect the new migration file and apply it.

### Option 2: Manual Application

If the automatic migration fails, follow the steps in `db/migrations/MANUAL_FIX_GUIDE.md`:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `202510071050__nuclear_fix_created_by.sql`
3. Paste and execute
4. Review the NOTICE messages in the output
5. Run the verification script from `supabase/dev/verify_created_by.sql`

## Verification

After applying the migration, verify success by:

1. **Check Database Logs**:
   ```
   ✅ Nuclear cleanup completed
   ✅ Triggers recreated on accounts, contacts, leads
   ✅ RPC convert_buyer_request_to_lead recreated successfully
   ✅ ALL SYSTEMS OPERATIONAL - Nuclear fix completed successfully!
   ```

2. **Run Verification Script**:
   Execute `supabase/dev/verify_created_by.sql` in SQL Editor

3. **Test the Feature**:
   - Go to `/backoffice/crm/inbound-requests`
   - Click "Convert to Lead" on any pending request
   - Should redirect to the new lead detail page
   - No errors should appear

## Success Criteria

✅ Button click triggers conversion  
✅ New account is created (if needed)  
✅ New contact is created (if needed)  
✅ New lead is created  
✅ All `created_by` fields are populated automatically  
✅ Buyer request is marked as 'converted'  
✅ User is redirected to lead detail page  
✅ No errors in console or database logs  

## Troubleshooting

### If the error still persists:

1. **Check which RPC version is active**:
   ```sql
   SELECT pg_get_functiondef(oid)
   FROM pg_proc
   WHERE proname = 'convert_buyer_request_to_lead';
   ```
   
2. **Check for DEFAULT constraints**:
   ```sql
   SELECT 
     t.relname as table_name,
     pg_get_expr(d.adbin, d.adrelid) as default_value
   FROM pg_attribute a
   JOIN pg_class t ON a.attrelid = t.oid
   JOIN pg_namespace n ON t.relnamespace = n.oid
   LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
   WHERE a.attname = 'created_by'
     AND n.nspname = 'public'
     AND t.relname IN ('accounts', 'contacts', 'leads')
     AND d.adbin IS NOT NULL;
   ```
   Should return **0 rows**.

3. **Check triggers are active**:
   ```sql
   SELECT trigger_name, event_object_table
   FROM information_schema.triggers
   WHERE event_object_schema = 'public'
     AND trigger_name LIKE '%force_created_by%';
   ```
   Should return **3 rows** (one for each table).

4. **Manually apply the fix**:
   Follow `db/migrations/MANUAL_FIX_GUIDE.md` to apply SQL commands directly.

## Lessons Learned

1. **Never call trigger functions directly** - They can only be called by triggers
2. **Never use trigger functions in DEFAULT constraints** - This causes the error
3. **Consolidate migrations** - Multiple files defining the same thing create conflicts
4. **Test migrations in isolation** - Ensure each migration works independently
5. **Use proper diagnostic tools** - Enhanced logging helps identify issues quickly

## Future Maintenance

When modifying the CRM system in the future:

- ✅ Keep the trigger pattern for audit fields (`created_by`, `updated_at`)
- ✅ Never add DEFAULT constraints that call functions
- ✅ Test RPC changes in a development environment first
- ✅ Use the verification script after any schema changes
- ✅ Document any changes to the conversion flow

---

**Status**: ✅ Fixed and documented  
**Date**: 2025-10-07  
**Migration**: `202510071050__nuclear_fix_created_by.sql`
