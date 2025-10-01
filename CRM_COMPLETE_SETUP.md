# CRM & Deals Complete Setup Guide

## Overview
This document outlines the complete CRM workflow implementation including Buyer Request conversion, Lead management, Opportunities, Tasks, Deals with taxes/fees, and Invoice generation.

## 1. Database Setup

### Run Migration
Execute the `crm_complete_migration.sql` file in your Supabase SQL Editor:

```sql
-- Run: crm_complete_migration.sql
-- This creates all necessary tables:
-- - accounts
-- - contacts  
-- - leads (enhanced)
-- - opportunities
-- - tasks
-- - payments
-- - Updates deals table with account_id, contact_id, invoice_url
-- - Updates tax_presets with code, description, rules
-- - Updates buyer_requests with unit_id, converted_to_lead_id
-- - Creates all RLS policies
```

### Verification Queries
```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('accounts', 'contacts', 'leads', 'opportunities', 'tasks', 'payments')
ORDER BY tablename;

-- Check tax presets have rules
SELECT code, name, rules FROM public.tax_presets ORDER BY name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('accounts', 'contacts', 'leads', 'opportunities', 'tasks');
```

## 2. Complete Workflow

### A. Buyer Request → Lead Conversion

**Location**: `/backoffice/crm/inbound-requests`

**Flow**:
1. User submits request from public site (captured in `buyer_requests`)
2. Staff clicks "Convert to Lead" button
3. System automatically:
   - Checks if contact exists by email (reuses if found)
   - Creates new Account (individual) + Contact if new
   - Creates Lead with pointers to account, contact, unit
   - Creates Opportunity (expected close: 21 days)
   - Creates first contact Task (SLA: 24 hours)
   - Marks buyer_request as 'converted'

**Expected Result**: One click creates full CRM record with Account → Contact → Lead → Opportunity → Task

### B. Lead Management

**Location**: `/backoffice/crm/leads`

**Features**:
- View all leads with account, contact, unit info
- Filter by stage (new, contacted, qualified, quoted, etc.)
- Search by account name, email, phone
- Click "Create Deal" button to start deal from lead

**Create Deal Flow**:
- Button navigates to `/backoffice/deals/new?lead_id={id}`
- Pre-fills account, contact, opportunity, unit
- Creates deal in draft status
- Updates lead stage to 'quoted'

### C. Opportunities Kanban

**Location**: `/backoffice/crm/opportunities/kanban`

**Features**:
- Drag-and-drop cards between stages
- Real-time stage updates to database
- View linked account, contact, unit, expected close date
- Keyboard navigation (Arrow keys, Space, Enter)

**Stages**: new → qualified → quote → negotiation → won/lost

### D. My Tasks

**Location**: `/backoffice/crm/my-tasks-v2`

**Features**:
- View tasks assigned to current user
- Grouped by: Overdue / Today / Next 7 Days / No Due Date
- Complete tasks with checkbox
- Add new tasks with "+ Add Task" button
- Link tasks to leads, opportunities, deals, or accounts

### E. Deals with Taxes & Fees

**Location**: `/backoffice/deals/{id}/edit`

**Tabs**:
1. **Units Tab**: Add/remove units from deal
2. **Taxes & Fees Tab**: 
   - Left side: Tax Presets CRUD
   - Right side: Toggles for applying presets
   - Switches: Out of State, Temp Plates, Texas Combo, Transport In, Doc Fee, Discount

**Totals Calculation**:
- Uses `src/services/deals/totals.ts`
- Reads `deal_units`, `deal_fees`, `tax_presets.rules`
- Applies rules based on active switches
- Updates deal record with computed totals

**Tax Preset Rules Format**:
```json
{
  "lines": [
    {
      "id": "tx_title",
      "kind": "fee",
      "label": "Title Fee",
      "formula": "flat",
      "value": 33.0,
      "enabledBy": ["tx_combo"]
    },
    {
      "id": "sales_tax",
      "kind": "tax",
      "label": "Sales Tax TX",
      "formula": "rate",
      "value": 0.0825,
      "enabledBy": ["tx_combo"],
      "base": "units_subtotal"
    }
  ]
}
```

**Formula Types**:
- `flat`: Fixed amount (e.g., $33 title fee)
- `rate`: Percentage applied to base (e.g., 8.25% sales tax)
- `override`: Replace all tax with this value (e.g., $0 for out-of-state)

### F. Invoice Generation

**Location**: Deal Editor → "Generate Invoice" button

**Process**:
1. Opens preview modal with PDF
2. User can download or generate & save
3. Calls `supabase/functions/generate-deal-invoice`
4. Uploads PDF to 'invoices' storage bucket
5. Creates record in `invoices` table with auto-generated number (INV-YYYY-####)
6. Updates `deals.invoice_url`

**Signed URLs**: Download and Copy Link buttons create signed URLs with 7-day expiry

### G. Inventory Integration

**Status Updates**:
- Deal marked 'won' or 'delivered' → unit.status = 'sold'
- Deal cancelled → unit.status = 'available' (if no other active deals)
- Deal created from lead → unit.status can be set to 'reserved' (7-day expiry)

**Lead Stage Updates**:
- Deal created from lead → lead.stage = 'quoted'
- Deal won → lead.stage = 'closed_won'

## 3. Acceptance Criteria Checklist

### CRM Flow
- [ ] Convert Buyer Request creates Account + Contact + Lead + Opportunity + Task in one click
- [ ] "My Tasks" shows SLA task (24h) after conversion
- [ ] Can create manual tasks from "+ Add Task" button
- [ ] Tasks grouped correctly (Overdue / Today / Next 7 Days / No Due Date)

### Leads & Opportunities
- [ ] Leads page shows all leads with account, contact, unit info
- [ ] "Create Deal" button from lead pre-fills deal data
- [ ] Opportunity Kanban drag-and-drop updates stage in database
- [ ] No mock data - all from Supabase

### Deals & Taxes
- [ ] Tax Presets CRUD works (Add/Edit/Delete with rules)
- [ ] Toggles in Deal Editor apply correct fees/taxes
- [ ] Texas Combo applies title fee ($33) + sales tax (8.25%)
- [ ] Out of State zeroes out all taxes
- [ ] Temp Plate adds $5 flat fee
- [ ] Discount entered as negative shows in totals

### Invoices
- [ ] "Generate Invoice" creates PDF with legal template
- [ ] Invoice number format: INV-YYYY-#### (auto-incremented)
- [ ] PDF uploaded to 'invoices' bucket
- [ ] `invoices` table record created with pdf_url
- [ ] Download and Copy Link work with signed URLs (7-day expiry)
- [ ] `deals.invoice_url` updated after save

### Integration
- [ ] Unit status changes to 'sold' when deal won/delivered
- [ ] Unit freed when deal cancelled (if no other deals)
- [ ] Lead stage updates to 'quoted' on deal creation
- [ ] Lead stage updates to 'closed_won' on deal won

### UX & SPA
- [ ] All navigation uses `<Link>` or `useNavigate()` (no full page reloads)
- [ ] Loading skeletons shown during data fetches
- [ ] All buttons have `type="button"` to prevent form submission
- [ ] Dark mode works correctly on all new pages

### Security
- [ ] RLS policies verified: `e@guardianm.com` (active staff) can CRUD all
- [ ] Inactive users cannot access backoffice tables
- [ ] `public.is_active_staff()` function used in all policies

## 4. Routes Added

```
/backoffice/crm/my-tasks-v2         → New functional tasks page with DB
/backoffice/deals/new               → Create deal (optionally from lead)
/backoffice/deals/tax-regimes       → Existing tax presets manager (now with rules)
```

## 5. New Files Created

### Services
- `src/services/crmFlow.ts` - Lead conversion & deal creation logic
- `src/services/deals/totals.ts` - Deal totals computation with tax rules

### Pages
- `src/pages/backoffice/crm/MyTasksV2.tsx` - Functional tasks page
- `src/pages/backoffice/deals/NewDeal.tsx` - Deal creation flow

### Migrations
- `crm_complete_migration.sql` - Complete database schema

## 6. Testing Guide

### Test Scenario 1: Full Lead-to-Deal Flow
1. Go to public site, submit buyer request for a unit
2. Navigate to `/backoffice/crm/inbound-requests`
3. Click "Convert to Lead"
4. Verify: Account, Contact, Lead, Opportunity, Task all created
5. Go to `/backoffice/crm/my-tasks-v2`
6. Verify: "First contact (SLA 24h)" task appears in Today section
7. Go to `/backoffice/crm/leads`
8. Click on the new lead
9. Click "Create Deal" button
10. Verify: Deal created with unit pre-filled
11. Add Texas Combo + Temp Plate toggles
12. Verify: Totals show $33 title + $5 temp plate + 8.25% tax
13. Generate Invoice
14. Verify: PDF downloads, invoice_url saved

### Test Scenario 2: Tax Presets
1. Go to `/backoffice/deals/tax-regimes`
2. Click "+ New Preset"
3. Create preset with rules JSON
4. Enable preset, set as default if desired
5. Go to deal editor
6. Apply preset via toggle
7. Verify: Totals update correctly

### Test Scenario 3: Inventory Integration
1. Create deal with unit
2. Mark deal as "Won"
3. Check unit record: `status` should be 'sold', `sold_at` should be set
4. Cancel the deal
5. Check unit record: `status` should be 'available' (if no other deals)

## 7. Troubleshooting

### Issue: "Table does not exist" errors
**Solution**: Run `crm_complete_migration.sql` again (it's idempotent)

### Issue: RLS permission denied
**Solution**: Verify user has active role:
```sql
SELECT * FROM public.users WHERE auth_user_id = auth.uid();
-- Ensure role is 'admin', 'sales', 'inventory', or 'finance'
-- Ensure status is 'active'
```

### Issue: Invoice generation fails
**Solution**: Check edge function logs:
```bash
supabase functions logs generate-deal-invoice
```

### Issue: Totals not calculating
**Solution**: Check tax_presets have valid rules JSON:
```sql
SELECT code, rules FROM public.tax_presets WHERE is_active = true;
```

## 8. Next Steps (Nice-to-Have)

- [ ] Lead Detail page shows linked unit card with photo
- [ ] Inbound Requests detects duplicate emails, suggests merge
- [ ] Deal Editor "Reserve Unit" button (7-day expiry)
- [ ] Email notifications for task assignments
- [ ] Activity timeline for accounts showing all touches
- [ ] Bulk task creation for multiple leads
- [ ] Deal templates for common configurations

## 9. Dark Mode Considerations

All new pages use semantic tokens from `index.css` and `tailwind.config.ts`:
- No hardcoded colors (text-white, bg-black, etc.)
- Use `text-foreground`, `bg-background`, `border-border` semantic tokens
- Test in both light and dark modes before deploying

## 10. Support

For questions or issues:
1. Check Supabase logs for edge function errors
2. Verify RLS policies are active
3. Ensure migration ran successfully
4. Review browser console for client-side errors
5. Test with `e@guardianm.com` (known active staff user)
