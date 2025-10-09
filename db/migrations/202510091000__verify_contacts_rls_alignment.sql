-- ============================================================================
-- Verification and Documentation: Contacts RLS Alignment with Accounts
-- ============================================================================
-- 
-- PURPOSE:
--   Ensure contacts table RLS policies are aligned with accounts table policies
--   so that any user who can see an account can also see its contacts.
--
-- CURRENT STATE:
--   Both tables use public.is_active_staff() which checks:
--   - User exists in public.users table
--   - users.auth_user_id = auth.uid()
--   - users.status = 'active'
--   - users.role IN ('admin','sales','inventory','finance','manager')
--
-- EXPECTED BEHAVIOR:
--   If is_active_staff() returns TRUE:
--     ✅ User can see ALL accounts
--     ✅ User can see ALL contacts (regardless of account_id)
--   If is_active_staff() returns FALSE:
--     ❌ User cannot see any accounts
--     ❌ User cannot see any contacts
--
-- COMMON ISSUES:
--   1. User not in public.users table → is_active_staff() returns FALSE
--   2. User has wrong role → is_active_staff() returns FALSE
--   3. User status != 'active' → is_active_staff() returns FALSE
--   4. FK join syntax in aggregated queries may fail even with correct RLS
--
-- DIAGNOSTIC:
--   Use /admin/debug/supabase to verify:
--   - Current user exists in users table
--   - is_active_staff() returns TRUE
--   - Direct contacts count works
--   - Aggregated count syntax
-- ============================================================================

-- Verify is_active_staff function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_active_staff'
  ) THEN
    RAISE EXCEPTION 'is_active_staff() function not found. Run crm_core.sql migration first.';
  END IF;
END $$;

-- Verify index exists for performance
CREATE INDEX IF NOT EXISTS idx_contacts_account_id 
  ON public.contacts(account_id) 
  WHERE deleted_at IS NULL;

-- Verify index for deleted_at filtering
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at 
  ON public.contacts(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Document current policies (no changes, just verification)
DO $$
BEGIN
  -- Check accounts policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'accounts' 
    AND (policyname LIKE '%staff%' OR policyname LIKE '%all%')
  ) THEN
    RAISE WARNING 'No staff policy found on accounts table. RLS may block all queries.';
  END IF;

  -- Check contacts policy exists  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contacts' 
    AND (policyname LIKE '%staff%' OR policyname LIKE '%all%')
  ) THEN
    RAISE WARNING 'No staff policy found on contacts table. RLS may block all queries.';
  END IF;
  
  RAISE NOTICE 'RLS policies verification complete. Both accounts and contacts use is_active_staff().';
END $$;

-- ============================================================================
-- TROUBLESHOOTING GUIDE
-- ============================================================================
--
-- SYMPTOM: Contacts count shows 0 in Accounts list
-- 
-- STEP 1: Verify user has staff access
--   SELECT public.is_active_staff();
--   → Should return TRUE
--
-- STEP 2: Check if user exists in users table
--   SELECT * FROM public.users WHERE auth_user_id = auth.uid();
--   → Should return 1 row with role in allowed list and status = 'active'
--
-- STEP 3: If user not in users table, add them:
--   INSERT INTO public.users (auth_user_id, email, full_name, role, status)
--   VALUES (
--     auth.uid(),
--     (SELECT email FROM auth.users WHERE id = auth.uid()),
--     'Admin User',
--     'admin',
--     'active'
--   );
--
-- STEP 4: Test direct contacts count
--   SELECT count(*) 
--   FROM public.contacts c
--   WHERE c.deleted_at IS NULL;
--   → Should return actual count if is_active_staff() = TRUE
--
-- STEP 5: If direct count works but aggregated doesn't, try alternative FK syntax:
--   -- Option A: Explicit FK by column (current)
--   SELECT a.id, a.name, contacts!account_id(count)
--   FROM accounts a;
--
--   -- Option B: Inner join aggregate
--   SELECT a.id, a.name, count(c.id) as contact_count
--   FROM accounts a
--   LEFT JOIN contacts c ON c.account_id = a.id AND c.deleted_at IS NULL
--   GROUP BY a.id, a.name;
--
-- ============================================================================
