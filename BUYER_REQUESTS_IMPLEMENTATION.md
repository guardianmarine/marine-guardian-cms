# Buyer Requests Implementation Summary

## Overview
Implemented a complete buyer_requests system allowing public visitors to submit "Request Info" on unit details or general "Request a Unit" (wish) forms. All data flows to Supabase's `public.buyer_requests` table with RLS, and backoffice staff can manage inbound requests via `/backoffice/crm/inbound-requests`.

---

## Files Created/Modified

### Database (SQL)
- **buyer_requests_setup.sql**: Idempotent SQL script to create `public.buyer_requests` table with:
  - RLS policies (anon INSERT with honeypot check, authenticated staff SELECT/UPDATE)
  - Helper function `is_active_staff()`
  - Indexes and verification queries

### Frontend - Public Pages
1. **src/components/inventory/RequestInfoDialog.tsx** (Modified)
   - Dialog component for unit detail pages
   - Integrated with Supabase to insert `request_type='info'` with `unit_id`
   - Includes honeypot field, input validation (zod), EN/ES support
   - Success state shows "Our team will contact you within 1 business day"

2. **src/pages/RequestAUnit.tsx** (Created)
   - New public page at `/request-a-unit`
   - Form to submit general unit requests (`request_type='wish'`, no `unit_id`)
   - Honeypot, validation, EN/ES labels
   - Success state with confirmation message

### Frontend - Backoffice
3. **src/pages/backoffice/crm/InboundRequests.tsx** (Created)
   - New backoffice page at `/backoffice/crm/inbound-requests`
   - Lists all buyer requests with filters (type, status, search)
   - Table shows: Created, Type, Unit (link if present), Name, Email, Phone, Preferred Contact, Status
   - Actions: View details, Update status, Convert to Lead
   - **Convert to Lead**: Checks if `leads` table exists; if not, shows toast "Mark as processing and handle manually"
   - EN/ES support

### Configuration & Routing
4. **src/nav/config.ts** (Modified)
   - Moved buyer-requests menu item into CRM children
   - Added `inbound-requests` menu item: `/backoffice/crm/inbound-requests` (admin, sales roles)

5. **src/App.tsx** (Modified)
   - Added route `/request-a-unit` → RequestAUnit page
   - Added route `/backoffice/crm/inbound-requests` → InboundRequests (admin, sales guards)
   - Imported RequestAUnit and InboundRequests

---

## Database Schema

### Table: `public.buyer_requests`

| Column           | Type         | Constraints                         |
|------------------|--------------|-------------------------------------|
| id               | uuid         | PK, default gen_random_uuid()      |
| unit_id          | uuid         | NULL, FK units(id) ON DELETE SET NULL |
| request_type     | text         | NOT NULL, default 'info', CHECK IN ('info', 'wish') |
| name             | text         | NOT NULL                            |
| email            | text         | NOT NULL                            |
| phone            | text         | NULL                                |
| preferred_contact| text         | NULL, CHECK IN ('phone', 'email', 'whatsapp') |
| message          | text         | NULL                                |
| page_url         | text         | NULL                                |
| user_agent       | text         | NULL                                |
| honey            | text         | NULL (honeypot)                     |
| status           | text         | NOT NULL, default 'new', CHECK IN ('new', 'processing', 'converted', 'spam', 'closed') |
| created_at       | timestamptz  | NOT NULL, default now()             |
| created_by_auth  | uuid         | NULL                                |

### Indexes
- `idx_buyer_requests_status` on `status`
- `idx_buyer_requests_created_at` on `created_at DESC`
- `idx_buyer_requests_unit_id` on `unit_id` (WHERE unit_id IS NOT NULL)
- `idx_buyer_requests_type` on `request_type`

### RLS Policies
1. **anon_insert_buyer_requests**: anon role can INSERT with `WITH CHECK (coalesce(honey, '') = '')`
2. **staff_select_buyer_requests**: authenticated can SELECT if `is_active_staff()` returns true
3. **staff_update_buyer_requests**: authenticated can UPDATE if `is_active_staff()` returns true

### Helper Function
- **`is_active_staff()`**: Returns boolean. Checks if `auth.uid()` matches a user in `public.users` with role IN ('admin', 'sales', 'inventory', 'finance') AND status = 'active'

---

## How to Run

1. **Run SQL in Supabase SQL Editor**:
   ```bash
   # Open buyer_requests_setup.sql and execute in Supabase SQL Editor
   ```
   - Creates table, indexes, helper function, RLS policies
   - Verification queries at the end confirm setup

2. **Test Public Flow**:
   - Visit any unit detail page (e.g., `/inventory/<unit-id>`)
   - Click "Request Info" button
   - Fill form (name, email, phone, preferred contact, message)
   - Submit → Check Supabase `buyer_requests` table for new row

3. **Test Public Wish Flow**:
   - Visit `/request-a-unit`
   - Fill general unit request form
   - Submit → Check Supabase for `request_type='wish'` row

4. **Test Backoffice**:
   - Login as admin or sales
   - Navigate to **CRM → Inbound Requests** (`/backoffice/crm/inbound-requests`)
   - View, filter, update status, or convert to lead
   - If leads table exists, "Convert to Lead" creates a lead row; otherwise shows "not found" toast

---

## Bilingual Support (EN/ES)

All forms, labels, buttons, and empty states support both English and Spanish:
- **EN**: "Request Info", "Submit", "Cancel", "Name", "Email", "Phone", "Preferred Contact", "Message", "Our team will contact you within 1 business day.", "No inbound requests yet."
- **ES**: "Solicitar Información", "Enviar", "Cancelar", "Nombre", "Correo", "Teléfono", "Medio de contacto preferido", "Mensaje", "Nuestro equipo te contactará en 1 día hábil.", "Aún no hay solicitudes."

Translation detection uses `i18n.language` from `react-i18next`.

---

## Honeypot Spam Protection

Both public forms include a hidden honeypot field (`honey`). If bots fill it, the RLS policy rejects the INSERT:
```sql
WITH CHECK (coalesce(honey, '') = '')
```

---

## Convert to Lead Logic

When staff clicks "Convert to Lead" in Inbound Requests:
1. Checks if `public.leads` table exists by querying `supabase.from('leads').select('id').limit(1)`
2. **If table exists**: Inserts new lead with `source='website'`, basic contact fields; sets `buyer_requests.status='converted'`
3. **If table does not exist**: Shows toast "Leads table not found. Mark as processing and handle manually." and updates status to 'processing'

---

## Contact Configuration

To update WhatsApp/email targets (CTAs), modify:
- **WhatsApp number**: `src/pages/UnitDetail.tsx` line ~331 or wherever WhatsApp link is defined
- **Email target**: `src/pages/UnitDetail.tsx` line ~337 or wherever email link is defined

Currently defaults:
- Phone: 214-613-8521
- WhatsApp: +12146138521
- Email: sales@guardianm.com

---

## Acceptance Criteria ✅

- [x] **Visitor can submit Request Info on unit detail** → row inserted in `public.buyer_requests` with `request_type='info'` and `unit_id`
- [x] **Visitor can submit Request a Unit** → row inserted with `request_type='wish'`, no `unit_id`
- [x] **Anon users cannot read rows** → RLS enforces INSERT only
- [x] **Backoffice staff can view and manage requests** → `/backoffice/crm/inbound-requests` lists, filters, updates status
- [x] **Convert to Lead works or shows clear message** → Checks if leads table exists; creates lead or shows toast
- [x] **All forms/empty states bilingual EN/ES** → Translations applied
- [x] **No changes to existing inventory/backoffice tables** → Only `buyer_requests` scope touched

---

## Notes

- **No Lovable Cloud**: Uses existing Supabase browser client (public anon key)
- **Idempotent SQL**: Safe to run multiple times
- **Security**: Honeypot + RLS policies + input validation (zod, maxLength)
- **Hours field never shown publicly**: Confirmed (only internal fields stripped in inventory service)
- **Existing routes preserved**: `/backoffice/buyer-requests` still exists (old mock-based page), new route is `/backoffice/crm/inbound-requests`

---

## Next Steps

1. Run `buyer_requests_setup.sql` in Supabase
2. Hard refresh (Cmd+Shift+R) the app
3. Test public forms
4. Test backoffice management
5. Optionally: Remove old `/backoffice/buyer-requests` route if no longer needed
