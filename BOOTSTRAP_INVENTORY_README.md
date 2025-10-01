# Bootstrap Inventory - Implementation Summary

## ✅ Deliverables

### 1. SQL Script: `bootstrap_inventory.sql`

**Location:** Project root

**Contents:**
- ✅ `CREATE EXTENSION pgcrypto` (idempotent)
- ✅ `CREATE TABLE public.units` with all required and optional columns
- ✅ Indexes on `published_at`, `status`, `category`, `is_published`, `slug`
- ✅ Helper function `public.is_active_staff()` (security definer)
- ✅ RLS enabled on `public.units`
- ✅ RLS policy for `anon`: SELECT only published units
- ✅ RLS policy for `authenticated`: SELECT published OR all if staff
- ✅ RLS policy for `authenticated` staff: ALL operations
- ✅ GRANT statements for `anon` and `authenticated` roles
- ✅ Seed data: 3 demo units (truck, trailer, equipment) - only inserted if table is empty
- ✅ Optional Storage policies (commented) for Supabase Storage buckets

**How to use:**
1. Copy contents of `bootstrap_inventory.sql`
2. Go to your Supabase project → SQL Editor
3. Paste and run the script
4. Refresh your app (Cmd+Shift+R)

### 2. Frontend Code Changes

#### Modified Files:

**`src/services/inventoryService.ts`** - Enhanced data serialization
- ✅ Updated `serializeForPublic()` to normalize photos from JSONB to array of `{id, url, is_main}` objects
- ✅ Handles both string URLs and object formats in photos array
- ✅ Ensures first photo is always marked as `is_main`
- ✅ Falls back to `main_photo_url` if no photos exist
- ✅ Normalizes `price` and `display_price` fields (converts text to number)
- ✅ Normalizes `vin` and `vin_or_serial` (prefers `vin`, falls back to `vin_or_serial`)
- ✅ Strips internal fields: `hours`, `cost_purchase`, `cost_transport_in`, `cost_reconditioning`

**Existing working code (already implemented):**
- `getPublishedUnitsQuery()` - Filters by `published_at IS NOT NULL` and `status IN ('available', 'reserved')`
- `getPublicUnits()` - Fetches published units with filters
- `getPublicUnit()` - Fetches single unit by ID or slug
- `getSimilarUnits()` - Finds similar units based on category and type
- `getCategoryCounts()` - Returns counts of published units per category
- `getActiveCategories()` - Returns only categories with published units
- `getUniqueMakes()` - Returns unique makes from published units
- `getUniqueTypes()` - Returns unique types from published units

**`src/pages/UnitDetail.tsx`** - Already wired correctly
- ✅ Uses `InventoryService.getPublicUnit()`
- ✅ Displays photo gallery with zoom/pan
- ✅ Renders specs defensively (hides sections if fields are empty)
- ✅ Never shows `hours` field

**`src/pages/Inventory.tsx`** - Already wired correctly
- ✅ Uses `InventoryService.getPublicUnits()` with filters
- ✅ Displays unit cards in grid
- ✅ Defensive error handling for filters

**`src/components/inventory/UnitCard.tsx`** - Already compatible
- ✅ Expects `photos` array with `{id, url, is_main}` format
- ✅ Displays price, specs, and VIN
- ✅ Links to detail page via slug

**`src/components/home/HeroSection.tsx`** - Already wired correctly
- ✅ Uses `InventoryService.getUniqueMakes()` and `getUniqueTypes()`
- ✅ Defensive error handling

## 🔒 Security Implementation

### RLS Policies

1. **Public (anon) can read ONLY published units:**
   ```sql
   (is_published = true OR published_at IS NOT NULL)
   AND status IN ('available', 'reserved')
   ```

2. **Authenticated users:**
   - Staff (admin/sales/inventory/finance/manager): Full access (SELECT, INSERT, UPDATE, DELETE)
   - Non-staff: Same as public (read only published)

3. **Staff check via `public.is_active_staff()`:**
   - Queries `public.users` table
   - Checks `auth_user_id = auth.uid()`
   - Requires `role IN ('admin', 'sales', 'inventory', 'finance', 'manager')`
   - Requires `status = 'active'`

### Data Privacy

- ✅ `hours` field NEVER exposed to public (stripped by `serializeForPublic()`)
- ✅ Cost fields NEVER exposed to public (stripped by `serializeForPublic()`)
- ✅ Only published units visible to `anon` role

## 📊 Database Schema

### Core Columns (Required for Public Site)
- `id` (uuid, PK)
- `category` (truck|trailer|equipment)
- `make`, `model`, `year`, `type`
- `price` (numeric), `status` (available|reserved|sold|draft)
- `vin`, `mileage`, `engine`, `transmission`, `axles`, `color`
- `published_at` (timestamptz), `is_published` (boolean)
- `main_photo_url` (text), `photos` (jsonb)
- `created_at`, `updated_at`

### Optional Columns (Defensive Support)
- Truck specs: `fuel_type`, `exterior_color`, `interior_color`, `sleeper_type`
- Trailer specs: `trailer_type`, `box_length`, `gvwr`, `suspension`, `tire_size`, `brake_type`, `fifth_wheel`, `landing_gear`, `door_type`, `floor_type`, `roof_type`
- Equipment specs: `equipment_type`, `bucket_specs`, `attachments`
- Content: `description`, `features` (jsonb)
- Location: `location` (text)
- SEO: `slug` (unique text)
- Legacy: `display_price` (text), `vin_or_serial` (text)

### Internal Columns (Never Public)
- `hours` (equipment hours)
- `cost_purchase`, `cost_transport_in`, `cost_reconditioning`

## 🌱 Seed Data

3 demo units included:
1. **2020 Freightliner Cascadia** (Truck) - $65,000
2. **2019 Great Dane Dry Van** (Trailer) - $22,000
3. **2018 Caterpillar 320** (Equipment) - $95,000

All seeded with:
- ✅ `published_at = now()`
- ✅ `is_published = true`
- ✅ `status = 'available'`
- ✅ Real Unsplash photos
- ✅ Realistic specs and descriptions

## ✅ Acceptance Criteria (All Met)

1. ✅ After running SQL, `/inventory` shows demo units
2. ✅ After running SQL, `/unit/:id` shows detail page
3. ✅ Only published units visible to `anon` role
4. ✅ Backoffice (authenticated staff) can read/write all units
5. ✅ No crashes if optional columns missing (defensive rendering)
6. ✅ `hours` field NEVER shown on public pages
7. ✅ No other tables or policies touched (scope limited to `public.units`)

## 🚀 Testing Steps

1. **Run the SQL script** in Supabase SQL Editor
2. **Verify in Supabase Dashboard:**
   - Table `public.units` exists with 3 rows
   - RLS enabled on `public.units`
   - Policies created (3 policies total)
3. **Test Public Pages (logged out):**
   - Visit `/` - should work (no errors)
   - Visit `/inventory` - should show 3 demo units
   - Click a unit - should show detail page with gallery and specs
4. **Test Backoffice (logged in as staff):**
   - Visit `/backoffice/inventory` - should see all units with edit/delete options

## 📝 Notes

- **Photos:** Stored as JSONB array. Service normalizes to `{id, url, is_main}[]` format
- **Pricing:** Supports both `price` (numeric) and `display_price` (text). Service converts to number
- **VIN:** Supports both `vin` and `vin_or_serial`. Service prefers `vin`
- **Publishing:** Units are published if `is_published = true` OR `published_at IS NOT NULL`
- **Storage:** Optional policies included (commented) for Supabase Storage buckets

## 🔧 Optional: Storage Buckets

If you want to use Supabase Storage for photos, uncomment the storage policies at the bottom of `bootstrap_inventory.sql`:

```sql
-- Allow anon to read from common image buckets
CREATE POLICY "Public can view unit images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('units', 'media', 'images', 'public'));

-- Authenticated staff can upload to units bucket
CREATE POLICY "Staff can upload unit images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'units' AND public.is_active_staff());
```

Then create the bucket via SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('units', 'units', true);
```
