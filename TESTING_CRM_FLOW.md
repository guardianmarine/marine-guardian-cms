# Testing CRM Flow: Inbound Requests → Lead Conversion

This document provides step-by-step instructions to manually test the complete CRM flow from buyer request creation to lead conversion.

## Prerequisites

1. ✅ All migrations applied (see `db/migrations/README.md`)
2. ✅ Database verification passed (`supabase/dev/verify_created_by.sql`)
3. ✅ User authenticated in the backoffice
4. ✅ User has staff role (admin, sales, inventory, or finance)

## Test Scenario: Complete Inbound Request Flow

### Step 1: Create a Buyer Request (Public Site)

**Location**: Public facing website (e.g., `/request-unit` or unit detail page)

**Actions**:
1. Navigate to a unit detail page or request form
2. Fill out the form:
   - **Name**: "John Smith Test"
   - **Email**: `test+buyer${Date.now()}@example.com` (unique email)
   - **Phone**: "+1-555-0123"
   - **Message**: "Interested in this unit for commercial fleet"
3. Submit the form

**Expected Results**:
- ✅ Form submits successfully
- ✅ Success toast/message appears
- ✅ Record created in `buyer_requests` table with `status = 'new'`

**SQL Verification**:
```sql
SELECT id, name, email, phone, status, created_at
FROM public.buyer_requests
WHERE email LIKE 'test+buyer%'
ORDER BY created_at DESC
LIMIT 5;
```

---

### Step 2: Badge Notification Appears

**Location**: Backoffice sidebar (`/backoffice`)

**Actions**:
1. Navigate to backoffice dashboard
2. Look at the CRM section in the sidebar

**Expected Results**:
- ✅ Badge with count appears on "Inbound Requests" menu item
- ✅ Count reflects number of `status IN ('new', 'processing')` requests
- ✅ Badge updates in real-time (Supabase realtime subscription)

**Component**: `src/hooks/useBuyerRequestsBadge.ts`

---

### Step 3: View Inbound Requests List

**Location**: `/backoffice/crm/inbound-requests`

**Actions**:
1. Click on "Inbound Requests" in the sidebar
2. Review the table of requests

**Expected Results**:
- ✅ Table displays all non-converted requests
- ✅ Columns show: Name, Email, Phone, Category, Status, Date
- ✅ "Convert to Lead" button visible for each request
- ✅ Search and filter controls work

**SQL Verification**:
```sql
SELECT 
  br.id,
  br.name,
  br.email,
  br.status,
  u.title as unit_title
FROM public.buyer_requests br
LEFT JOIN public.units u ON br.unit_id = u.id
WHERE br.status != 'converted'
  AND br.deleted_at IS NULL
ORDER BY br.created_at DESC;
```

---

### Step 4: Convert Request to Lead

**Location**: `/backoffice/crm/inbound-requests`

**Actions**:
1. Click "Convert to Lead" button for the test request
2. Wait for processing

**Expected Results**:
- ✅ Success toast: "Lead created successfully"
- ✅ Request disappears from the list (status changed to 'converted')
- ✅ Redirect to lead detail page OR lead appears in Leads list
- ✅ No console errors

**What Happens Internally** (RPC: `convert_buyer_request_to_lead`):

1. **Session Check**: Verifies `auth.uid()` is present
2. **Account Creation/Lookup**:
   - Searches for account by name (case-insensitive)
   - If not found, creates new account (kind: 'company' or 'individual')
   - `created_by` is auto-populated by trigger (`trg_accounts_force_created_by`)
3. **Contact Creation/Lookup**:
   - Searches for contact by email (case-insensitive)
   - If not found, creates new contact with `first_name`, `last_name`
   - `created_by` is auto-populated by trigger (`trg_contacts_force_created_by`)
   - If found, updates phone if missing
4. **Lead Creation**:
   - Creates lead with `stage = 'new'`, `source = 'inbound'`
   - Links to account, contact, and unit (if available)
   - `created_by` is auto-populated by trigger (`trg_leads_force_created_by`)
5. **Mark Converted**:
   - Updates `buyer_requests.status = 'converted'`
   - Sets `converted_at = now()`
6. **Returns**: UUID of the newly created lead

**SQL Verification**:
```sql
-- Check buyer request is marked converted
SELECT id, status, converted_at
FROM public.buyer_requests
WHERE email = 'test+buyer...'  -- Use your test email
ORDER BY created_at DESC
LIMIT 1;

-- Check account was created
SELECT id, name, kind, created_by, created_at
FROM public.accounts
WHERE name ILIKE '%John Smith Test%'
ORDER BY created_at DESC
LIMIT 1;

-- Check contact was created
SELECT id, first_name, last_name, email, phone, account_id, created_by
FROM public.contacts
WHERE email = 'test+buyer...'  -- Use your test email
LIMIT 1;

-- Check lead was created
SELECT 
  l.id,
  l.stage,
  l.source,
  l.created_by,
  l.account_id,
  l.contact_id,
  l.unit_id,
  a.name as account_name,
  c.first_name || ' ' || c.last_name as contact_name
FROM public.leads l
JOIN public.accounts a ON l.account_id = a.id
JOIN public.contacts c ON l.contact_id = c.id
WHERE c.email = 'test+buyer...'  -- Use your test email
ORDER BY l.created_at DESC
LIMIT 1;
```

**Verify `created_by` is populated**:
```sql
SELECT 
  'accounts' as table_name,
  id,
  name,
  created_by,
  (SELECT email FROM auth.users WHERE id = created_by) as created_by_email
FROM public.accounts
WHERE name ILIKE '%John Smith Test%'
UNION ALL
SELECT 
  'contacts',
  c.id,
  c.first_name || ' ' || c.last_name,
  c.created_by,
  (SELECT email FROM auth.users WHERE id = c.created_by)
FROM public.contacts c
WHERE c.email = 'test+buyer...'
UNION ALL
SELECT 
  'leads',
  l.id::text,
  l.source,
  l.created_by,
  (SELECT email FROM auth.users WHERE id = l.created_by)
FROM public.leads l
JOIN public.contacts c ON l.contact_id = c.id
WHERE c.email = 'test+buyer...';
```

---

### Step 5: Verify Lead Details

**Location**: `/backoffice/crm/leads/{leadId}`

**Actions**:
1. Navigate to the lead detail page
2. Review all information

**Expected Results**:
- ✅ Lead displays with stage "New"
- ✅ Account information visible
- ✅ Contact information visible (name, email, phone)
- ✅ Unit information visible (if request had unit_id)
- ✅ Source shows "inbound"
- ✅ Notes populated from buyer request message

**SQL Verification**:
```sql
SELECT 
  l.id as lead_id,
  l.stage,
  l.source,
  l.notes,
  a.name as account_name,
  a.kind as account_kind,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  u.title as unit_title,
  u.vin
FROM public.leads l
JOIN public.accounts a ON l.account_id = a.id
JOIN public.contacts c ON l.contact_id = c.id
LEFT JOIN public.units u ON l.unit_id = u.id
WHERE c.email = 'test+buyer...'  -- Use your test email
ORDER BY l.created_at DESC
LIMIT 1;
```

---

### Step 6: Badge Count Updates

**Location**: Backoffice sidebar

**Actions**:
1. Return to dashboard or any backoffice page
2. Check the badge on "Inbound Requests"

**Expected Results**:
- ✅ Badge count decreases by 1
- ✅ If no more pending requests, badge disappears
- ✅ Updates happen automatically (realtime)

---

## Error Scenarios to Test

### 1. Session Expired
**Test**: Clear session/cookies, try to convert
**Expected**: Error message "Authentication required. Your session may have expired."

### 2. Duplicate Conversion
**Test**: Try to convert the same request twice
**Expected**: Request already shows "converted" status, button disabled

### 3. Missing Data
**Test**: Create request with minimal data (just email)
**Expected**: Still converts successfully with fallback values

### 4. Invalid Unit ID
**Test**: Create request with non-existent unit_id
**Expected**: Converts successfully, lead has NULL unit_id

---

## Database Constraints Verification

Run these queries to verify data integrity:

```sql
-- All accounts should have created_by
SELECT COUNT(*) as total,
       COUNT(created_by) as with_created_by
FROM public.accounts;

-- All contacts should have created_by
SELECT COUNT(*) as total,
       COUNT(created_by) as with_created_by
FROM public.contacts;

-- All leads should have created_by
SELECT COUNT(*) as total,
       COUNT(created_by) as with_created_by
FROM public.leads;

-- Verify foreign keys are valid
SELECT 
  'accounts' as table_name,
  COUNT(*) as invalid_fk_count
FROM public.accounts a
WHERE created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = a.created_by)
UNION ALL
SELECT 
  'contacts',
  COUNT(*)
FROM public.contacts c
WHERE created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = c.created_by)
UNION ALL
SELECT 
  'leads',
  COUNT(*)
FROM public.leads l
WHERE created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = l.created_by);
```

---

## Cleanup Test Data

After testing, remove test records:

```sql
-- Find test records
SELECT id, name, email FROM public.buyer_requests WHERE email LIKE 'test+buyer%';
SELECT id, name FROM public.accounts WHERE name LIKE '%Test%';
SELECT id, first_name, last_name, email FROM public.contacts WHERE email LIKE 'test+buyer%';
SELECT l.id, c.email FROM public.leads l JOIN public.contacts c ON l.contact_id = c.id WHERE c.email LIKE 'test+buyer%';

-- Soft delete (preferred)
UPDATE public.buyer_requests SET deleted_at = now() WHERE email LIKE 'test+buyer%';
UPDATE public.leads SET deleted_at = now() WHERE id IN (
  SELECT l.id FROM public.leads l 
  JOIN public.contacts c ON l.contact_id = c.id 
  WHERE c.email LIKE 'test+buyer%'
);
UPDATE public.contacts SET deleted_at = now() WHERE email LIKE 'test+buyer%';
UPDATE public.accounts SET deleted_at = now() WHERE name LIKE '%Test%';

-- Or hard delete (use with caution)
-- DELETE FROM public.leads WHERE id IN (...);
-- DELETE FROM public.contacts WHERE email LIKE 'test+buyer%';
-- DELETE FROM public.accounts WHERE name LIKE '%Test%';
-- DELETE FROM public.buyer_requests WHERE email LIKE 'test+buyer%';
```

---

## Troubleshooting

### Issue: "trigger functions can only be called as triggers"

**Check**: Are you using the old RPC or new RPC?
```sql
-- View current RPC definition
\df+ public.convert_buyer_request_to_lead
```

**Solution**: Apply migration `202510071035__replace_convert_buyer_request_rpc.sql`

### Issue: "column 'created_by' does not exist"

**Solution**: Apply migration `202510071030__fix_created_by_triggers.sql`

### Issue: Badge count doesn't update

**Check**: 
1. Verify realtime is enabled in Supabase project settings
2. Check browser console for subscription errors
3. Verify RLS policies allow SELECT on buyer_requests

### Issue: RLS error on insert

**Check**: 
```sql
-- Verify your user has staff role
SELECT u.role, u.status 
FROM public.users u
WHERE u.auth_user_id = auth.uid();

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('accounts', 'contacts', 'leads');
```

---

## Success Criteria

✅ Buyer request created from public site  
✅ Badge appears with correct count  
✅ Request visible in Inbound Requests table  
✅ "Convert to Lead" executes without errors  
✅ Account created/found with `created_by` populated  
✅ Contact created/found with `created_by` populated  
✅ Lead created with `created_by` populated  
✅ Buyer request marked as "converted"  
✅ Badge count decreases  
✅ Lead detail page displays correctly  
✅ All data integrity constraints satisfied  
✅ No console errors or SQL warnings
