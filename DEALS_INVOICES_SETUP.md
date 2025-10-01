# Deals & Invoices System - Setup Instructions

## Database Setup

### 1. Run the Migration

Copy and run the complete SQL migration in your Supabase SQL Editor:

**File:** `supabase/migrations/20250102000001_deals_invoices_complete.sql`

This migration creates:
- ✅ **Tables:** `tax_presets`, `deals`, `deal_units`, `deal_fees`, `invoices`
- ✅ **RLS Policies:** All tables secured with staff-only access
- ✅ **Invoice Number Generator:** Auto-generates `INV-YYYY-####` format
- ✅ **Storage Bucket:** Private `invoices` bucket with RLS policies
- ✅ **Seed Data:** 3 default tax presets (Texas Sales Tax, Out-of-State, Temp Plate)

### 2. Verify Setup

After running the migration, check that everything is set up correctly:

```sql
-- Check tables exist
SELECT 'tax_presets exists?' AS check, to_regclass('public.tax_presets') IS NOT NULL AS ok
UNION ALL
SELECT 'deals exists?', to_regclass('public.deals') IS NOT NULL
UNION ALL
SELECT 'deal_units exists?', to_regclass('public.deal_units') IS NOT NULL
UNION ALL
SELECT 'deal_fees exists?', to_regclass('public.deal_fees') IS NOT NULL
UNION ALL
SELECT 'invoices exists?', to_regclass('public.invoices') IS NOT NULL;

-- Check tax presets were seeded
SELECT name, type, rate, is_active FROM public.tax_presets ORDER BY name;

-- Check storage bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'invoices';
```

## Acceptance Criteria - QA Checklist

### ✅ 1. Tax Presets CRUD
- [ ] Navigate to `/backoffice/deals-v2/tax-presets`
- [ ] Create new tax preset (name, type, rate)
- [ ] Edit existing preset
- [ ] Verify values are saved to database
- [ ] Delete preset (with confirmation)

### ✅ 2. Create Deal with Units & Fees
- [ ] Navigate to `/backoffice/deals-v2/new`
- [ ] Fill in Bill To information
- [ ] Click "Add Unit" and select a unit
- [ ] Set price for the unit
- [ ] Click "Add from Preset" and select "Texas Sales Tax (8.25%)"
- [ ] Click "Add from Preset" and select "Temporary Plate (TX) $5.00"
- [ ] Click "Add Custom" and create a discount:
  - Type: Discount
  - Label: "Promotional Discount"
  - Amount: 500.00
- [ ] Verify totals calculate correctly:
  - Subtotal = Unit price
  - Discounts = -$500.00
  - Fees = $5.00 (temp plate)
  - Tax = (Subtotal - Discount) × 8.25%
  - Total Due = Subtotal + Fees + Tax - Discount

### ✅ 3. Invoice Generation
- [ ] Click "Generate & Save" button
- [ ] Verify invoice number format: `INV-2025-0001`, `INV-2025-0002`, etc.
- [ ] Click "Preview Invoice" to see PDF preview
- [ ] Verify PDF shows:
  - Guardian Marine logo and header
  - Invoice number, issued date, due date
  - Bill To information
  - Unit details (Year, Make, Model, VIN, Price)
  - All fees with labels and amounts
  - Subtotal, Discounts, Fees, Taxes, Total Due
  - Legal texts at bottom (unchanged from original)
- [ ] Click "Generate & Save" to upload to Storage
- [ ] Verify `pdf_url` is saved in database

### ✅ 4. Download & Share Invoice
- [ ] Click "Download PDF" button
- [ ] Verify PDF opens in new tab and can be downloaded
- [ ] Click "Copy Link" button
- [ ] Verify toast notification shows "Invoice link copied to clipboard"
- [ ] Paste link in browser and verify it opens (signed URL valid for 7 days)

### ✅ 5. SPA Navigation (No Full Reloads)
- [ ] Open browser DevTools → Network tab
- [ ] Navigate: `/backoffice/deals-v2` → `/backoffice/deals-v2/new`
- [ ] Verify: No full page reload (no `document` request)
- [ ] Navigate: Deal Editor → Tax Presets → Deals List
- [ ] Verify: All navigation uses SPA routing (no white flash)

### ✅ 6. RLS Security
**As Active Staff (e.g., e@guardianm.com):**
- [ ] Log in with active staff account
- [ ] Verify you can:
  - View deals list
  - Create new deal
  - Edit existing deal
  - Generate invoice
  - Download invoice PDF
  - View and edit tax presets

**As Inactive User:**
- [ ] Create test user with `status = 'inactive'` in `users` table:
  ```sql
  UPDATE public.users 
  SET status = 'inactive' 
  WHERE email = 'test@example.com';
  ```
- [ ] Log in with inactive account
- [ ] Verify you CANNOT:
  - View deals (empty list or error)
  - Create new deal (401 Unauthorized)
  - Access tax presets
  - Generate invoices

**As Unauthenticated (No Login):**
- [ ] Log out completely
- [ ] Try accessing `/backoffice/deals-v2`
- [ ] Verify: Redirected to `/login`

## Common Issues & Troubleshooting

### Issue: "Column does not exist" errors
**Fix:** Run the migration SQL script in Supabase SQL Editor.

### Issue: "Row violates row-level security policy"
**Fix:** Ensure your user has `role IN ('admin', 'sales', 'inventory', 'finance')` and `status = 'active'` in `users` table.

### Issue: Invoice number not auto-generating
**Fix:** Check that the trigger is active:
```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'invoices';
```

### Issue: Cannot upload invoice PDFs to Storage
**Fix:** Verify storage bucket exists and RLS policies are correct:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'invoices';
```

### Issue: Signed URL expires immediately
**Fix:** Check the expiry is set to 7 days (604800 seconds) in `useInvoiceGeneration.ts` line 83:
```typescript
.createSignedUrl(filePath, 7 * 24 * 60 * 60); // 7 days
```

## Routes Reference

- **Deals List (V2):** `/backoffice/deals-v2`
- **New Deal:** `/backoffice/deals-v2/new`
- **Edit Deal:** `/backoffice/deals-v2/:id`
- **Tax Presets:** `/backoffice/deals-v2/tax-presets`

## Data Models

### Deal
- `sales_rep_id`: UUID (auth.users)
- `status`: draft | quoted | won | lost | invoiced | delivered | cancelled
- `subtotal`, `discounts_total`, `fees_total`, `tax_total`, `total_due`, `commission_base`
- `bill_to`: JSONB (company, contact, email, phone)
- `notes`: Text

### Deal Unit
- `deal_id`: UUID (deals)
- `unit_id`: UUID (units) - nullable
- `price`: Numeric (12, 2)
- `unit_snapshot`: JSONB (full unit details at time of deal)

### Deal Fee
- `deal_id`: UUID (deals)
- `kind`: tax | temp_plate | transport | doc | discount | other
- `label`: Text (display name)
- `amount`: Numeric (12, 2)
- `taxable`: Boolean
- `sort_order`: Integer

### Tax Preset
- `name`: Text
- `type`: percent | fixed
- `rate`: Numeric (10, 4)
- `apply_scope`: deal | unit | fee
- `is_default`: Boolean
- `is_active`: Boolean
- `notes`: Text

### Invoice
- `deal_id`: UUID (deals)
- `number`: Text (auto-generated: INV-YYYY-####)
- `pdf_url`: Text (signed URL from Storage)
- `issued_at`: Date
- `due_date`: Date

## Next Steps

After completing QA:
1. Test with real unit data
2. Customize invoice PDF layout (logo, colors, legal text)
3. Add payment recording functionality
4. Implement commission calculations
5. Add email/WhatsApp sharing for invoices