# Soft Delete Implementation Guide

This document describes the complete soft delete implementation for the CRM and Inventory systems.

## Overview

Soft delete allows records to be marked as deleted (`deleted_at IS NOT NULL`) instead of permanently removing them from the database. This provides:
- **Recoverability**: Deleted records can be restored
- **Audit trail**: Maintain history of deleted items
- **Data integrity**: Preserve relationships and references

## Database Changes

### Migrations Created

1. **202510061206__add_soft_delete_columns.sql**
   - Adds `deleted_at TIMESTAMP WITH TIME ZONE NULL` to:
     - `accounts`
     - `contacts`
     - `leads`
     - `opportunities`
     - `units`
   - Creates indexes on `deleted_at` for performance

2. **202510061207__create_active_views.sql**
   - Creates views filtering deleted records:
     - `accounts_active_v`
     - `contacts_active_v`
     - `leads_active_v`
     - `opportunities_active_v`
     - `units_active_v`

3. **202510061208__soft_delete_rpc_functions.sql**
   - `move_to_trash(table, id)`: Soft delete (requires active staff)
   - `restore_from_trash(table, id)`: Restore deleted record (requires active staff)
   - `hard_delete(table, id)`: Permanent deletion (admin only)

4. **202510061209__soft_delete_rls_policies.sql**
   - Updated RLS policies to respect `deleted_at`
   - Staff can see all records (including trash)
   - Public only sees non-deleted records

## Frontend Components

### 1. useSoftDelete Hook (`src/hooks/useSoftDelete.ts`)

Custom hook providing soft delete operations:

```typescript
const { moveToTrash, restoreFromTrash, hardDelete, loading } = useSoftDelete('accounts');
```

Features:
- Type-safe table names
- Error handling with toast notifications
- Minimal telemetry logging (last 8 chars of UUID)
- Loading states

### 2. SoftDeleteActions Component (`src/components/common/SoftDeleteActions.tsx`)

Reusable action buttons for soft delete operations:

```tsx
<SoftDeleteActions
  table="accounts"
  id={recordId}
  isDeleted={!!record.deleted_at}
  onActionComplete={refetch}
  inline // optional: use icon buttons instead of dropdown
/>
```

Provides:
- Move to trash (trash icon)
- Restore (rotate icon)
- Delete permanently (X icon with confirmation dialog)
- Dropdown or inline button variants

### 3. ViewFilterTabs Component (`src/components/common/ViewFilterTabs.tsx`)

Filter tabs for view selection:

```tsx
<ViewFilterTabs 
  value={viewFilter} 
  onValueChange={setViewFilter}
  counts={{ all: 100, active: 85, trash: 15 }} // optional
/>
```

Displays:
- **Active**: Non-deleted records (default)
- **Trash**: Deleted records
- **All**: All records

### 4. TrashBanner Component (`src/components/common/TrashBanner.tsx`)

Yellow banner for detail pages of deleted records:

```tsx
<TrashBanner onRestore={handleRestore} loading={loading} />
```

## Updated Pages

### CRM Pages (✅ Implemented)

1. **Accounts** (`src/pages/backoffice/crm/Accounts.tsx`)
   - View filter tabs (Active/Trash/All)
   - Soft delete actions on each card
   - Uses RPC functions

2. **Contacts** (`src/pages/backoffice/crm/Contacts.tsx`)
   - View filter tabs
   - Soft delete actions
   - Uses RPC functions

3. **Leads** (`src/pages/backoffice/crm/Leads.tsx`)
   - View filter tabs
   - Inline soft delete actions in table
   - Uses RPC functions

4. **Opportunities** (`src/pages/backoffice/crm/Opportunities.tsx`)
   - View filter tabs
   - Soft delete actions on cards
   - Uses RPC functions

### Inventory Admin (⚠️ Requires Migration)

The InventoryAdmin page currently uses a Zustand store with mock data. To enable soft delete:

#### Required Changes:

1. **Migrate to Supabase queries**:
   Replace store-based data with real Supabase queries:

   ```typescript
   const [units, setUnits] = useState([]);
   const [viewFilter, setViewFilter] = useState<ViewFilter>('active');

   const loadUnits = async () => {
     let query = supabase
       .from('units')
       .select('*')
       .order('created_at', { ascending: false });

     if (viewFilter === 'active') {
       query = query.is('deleted_at', null);
     } else if (viewFilter === 'trash') {
       query = query.not('deleted_at', 'is', null);
     }

     const { data, error } = await query;
     // handle response
   };
   ```

2. **Add ViewFilterTabs**:
   ```tsx
   <ViewFilterTabs value={viewFilter} onValueChange={setViewFilter} />
   ```

3. **Add SoftDeleteActions** to table rows:
   ```tsx
   <SoftDeleteActions
     table="units"
     id={unit.id}
     isDeleted={!!unit.deleted_at}
     onActionComplete={loadUnits}
     inline
   />
   ```

## Detail Pages

For detail pages (AccountDetail, ContactDetail, LeadDetail, OpportunityDetail, UnitDetail):

1. **Check if record is deleted** on load:
   ```typescript
   if (record.deleted_at) {
     // Show TrashBanner
   }
   ```

2. **Add TrashBanner** at the top:
   ```tsx
   {record.deleted_at && (
     <TrashBanner onRestore={handleRestore} loading={loading} />
   )}
   ```

3. **Implement restore handler**:
   ```typescript
   const { restoreFromTrash } = useSoftDelete('accounts');
   
   const handleRestore = async () => {
     const success = await restoreFromTrash(record.id);
     if (success) {
       // Reload record or navigate back
     }
   };
   ```

## Security & Permissions

### RLS Policies

- **SELECT**: 
  - Staff can see all records (including deleted)
  - Public only sees non-deleted records
- **UPDATE**: Active staff only
- **DELETE**: Must use RPCs (direct DELETE blocked)

### RPC Permissions

- `move_to_trash`: Requires `is_active_staff()`
- `restore_from_trash`: Requires `is_active_staff()`
- `hard_delete`: Requires admin role (`is_admin()`)

## Testing Checklist

### Database Tests

- [ ] Migrations run successfully (dry-run in PR)
- [ ] Active views exclude deleted records
- [ ] RLS policies prevent unauthorized access
- [ ] RPCs enforce role checks

### UI Tests

- [ ] Move to trash removes from active view
- [ ] Restore brings back to active view
- [ ] Hard delete permanently removes (admin only)
- [ ] View filters work correctly (Active/Trash/All)
- [ ] TrashBanner displays on deleted record details
- [ ] Restore button works on detail pages

### Integration Tests

```typescript
// Example test structure
describe('Soft Delete Flow', () => {
  it('should move account to trash', async () => {
    // Move to trash
    // Verify not in active view
    // Verify in trash view
  });

  it('should restore from trash', async () => {
    // Restore record
    // Verify back in active view
    // Verify not in trash view
  });

  it('should permanently delete (admin only)', async () => {
    // Attempt as non-admin (should fail)
    // Attempt as admin (should succeed)
    // Verify record is gone
  });
});
```

## Telemetry

Minimal logging implemented for auditing:

```typescript
console.info(`[Soft Delete] Moved ${table} record (${idHash}) to trash`);
console.info(`[Soft Delete] Restored ${table} record (${idHash}) from trash`);
console.info(`[Soft Delete] Permanently deleted ${table} record (${idHash})`);
```

- No PII exposed
- Only last 8 characters of UUID logged
- Action type clearly indicated

## Common Patterns

### Loading with View Filter

```typescript
useEffect(() => {
  loadData();
}, [viewFilter]);

const loadData = async () => {
  let query = supabase.from('table_name').select('*');
  
  if (viewFilter === 'active') {
    query = query.is('deleted_at', null);
  } else if (viewFilter === 'trash') {
    query = query.not('deleted_at', 'is', null);
  }
  
  const { data } = await query;
  setData(data || []);
};
```

### Filtering with Deleted Records

```typescript
const filteredItems = items.filter((item) => {
  const matchesSearch = /* search logic */;
  const matchesView = 
    viewFilter === 'all' || 
    (viewFilter === 'active' && !item.deleted_at) ||
    (viewFilter === 'trash' && item.deleted_at);
  
  return matchesSearch && matchesView;
});
```

## Migration Checklist

To enable soft delete on additional tables:

1. [ ] Add migration for `deleted_at` column
2. [ ] Create `{table}_active_v` view
3. [ ] Update RLS policies
4. [ ] Add table to RPC functions (if not already included)
5. [ ] Update frontend to use `useSoftDelete` hook
6. [ ] Add `ViewFilterTabs` to list pages
7. [ ] Add `SoftDeleteActions` to rows/cards
8. [ ] Add `TrashBanner` to detail pages
9. [ ] Test all operations
10. [ ] Update documentation

## Best Practices

1. **Always use RPCs** for delete operations (never direct `UPDATE` or `DELETE`)
2. **Default to Active view** for user-facing pages
3. **Show counts** in view filter tabs when possible
4. **Use TrashBanner** prominently on deleted record details
5. **Log actions** minimally (no PII)
6. **Test permissions** thoroughly (staff vs admin vs public)
7. **Handle errors gracefully** with user-friendly messages

## Known Limitations

1. **Inventory Admin**: Still uses mock store, needs migration to Supabase
2. **Bulk operations**: Not yet implemented (could add bulk trash/restore)
3. **Auto-purge**: No automatic deletion of old trashed items (could add cron job)
4. **Trash statistics**: Not exposed in dashboards yet

## Future Enhancements

- [ ] Bulk select and trash/restore
- [ ] Trash retention policy (auto-delete after N days)
- [ ] Trash size statistics in dashboards
- [ ] Undo/redo for recent deletions
- [ ] Soft delete for additional entities (deals, invoices, etc.)
- [ ] Trash history/timeline view
