-- =====================================================
-- SYNC LEGACY USERS TO NEW PERMISSIONS SYSTEM
-- Migrates data from public.users to profiles + user_roles
-- =====================================================

-- This migration syncs existing users from the legacy 'users' table
-- to the new 'profiles' and 'user_roles' tables.
-- 
-- Prerequisites:
-- 1. Run 202512221100__granular_permissions_core.sql first
-- 2. Run 202512221101__seed_role_permissions_function.sql first
-- 3. Ensure legacy users have auth_user_id linked (or email matches auth.users)

-- Helper function to map legacy role string to app_role enum
CREATE OR REPLACE FUNCTION public.map_legacy_role(legacy_role TEXT)
RETURNS app_role
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE lower(trim(legacy_role))
    WHEN 'admin' THEN 'admin'::app_role
    WHEN 'manager' THEN 'admin'::app_role  -- Map manager to admin
    WHEN 'sales' THEN 'sales'::app_role
    WHEN 'finance' THEN 'finance'::app_role
    WHEN 'inventory' THEN 'inventory'::app_role
    WHEN 'viewer' THEN 'viewer'::app_role
    ELSE 'viewer'::app_role  -- Default unmapped roles to viewer
  END;
$$;

-- Main sync function that can be run multiple times (idempotent)
CREATE OR REPLACE FUNCTION public.sync_legacy_users_to_permissions()
RETURNS TABLE(
  synced_count INT,
  skipped_count INT,
  error_count INT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_synced INT := 0;
  v_skipped INT := 0;
  v_errors INT := 0;
  v_details JSONB := '[]'::JSONB;
  v_legacy_user RECORD;
  v_auth_user_id UUID;
  v_mapped_role app_role;
BEGIN
  -- Check if legacy users table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    v_details := v_details || jsonb_build_object(
      'error', 'Legacy users table does not exist',
      'action', 'No migration needed'
    );
    RETURN QUERY SELECT 0, 0, 1, v_details;
    RETURN;
  END IF;

  -- Loop through all legacy users
  FOR v_legacy_user IN 
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      u.status,
      u.birth_date,
      u.auth_user_id,
      u.created_at,
      -- Check if already in new system
      EXISTS(SELECT 1 FROM profiles p WHERE p.email = u.email) AS already_migrated
    FROM public.users u
    WHERE u.email IS NOT NULL
  LOOP
    BEGIN
      -- Skip if already migrated
      IF v_legacy_user.already_migrated THEN
        v_skipped := v_skipped + 1;
        v_details := v_details || jsonb_build_object(
          'email', v_legacy_user.email,
          'status', 'skipped',
          'reason', 'Already exists in profiles'
        );
        CONTINUE;
      END IF;

      -- Determine auth_user_id
      v_auth_user_id := v_legacy_user.auth_user_id;
      
      -- If no auth_user_id, try to find by email in auth.users
      IF v_auth_user_id IS NULL THEN
        SELECT au.id INTO v_auth_user_id
        FROM auth.users au
        WHERE au.email = v_legacy_user.email
        LIMIT 1;
      END IF;

      -- Skip if no auth user found
      IF v_auth_user_id IS NULL THEN
        v_skipped := v_skipped + 1;
        v_details := v_details || jsonb_build_object(
          'email', v_legacy_user.email,
          'status', 'skipped',
          'reason', 'No matching auth.users record'
        );
        CONTINUE;
      END IF;

      -- Map legacy role to app_role
      v_mapped_role := public.map_legacy_role(COALESCE(v_legacy_user.role, 'viewer'));

      -- Insert into profiles
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        birth_date,
        status,
        created_at
      ) VALUES (
        v_auth_user_id,
        v_legacy_user.email,
        v_legacy_user.name,
        v_legacy_user.birth_date,
        COALESCE(v_legacy_user.status, 'active'),
        COALESCE(v_legacy_user.created_at, now())
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        birth_date = EXCLUDED.birth_date,
        status = EXCLUDED.status,
        updated_at = now();

      -- Insert into user_roles
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_auth_user_id, v_mapped_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      -- Seed permissions based on role
      PERFORM public.seed_role_permissions(v_auth_user_id, v_mapped_role);

      v_synced := v_synced + 1;
      v_details := v_details || jsonb_build_object(
        'email', v_legacy_user.email,
        'status', 'synced',
        'auth_user_id', v_auth_user_id,
        'role', v_mapped_role::TEXT
      );

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_details := v_details || jsonb_build_object(
        'email', v_legacy_user.email,
        'status', 'error',
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_synced, v_skipped, v_errors, v_details;
END;
$$;

-- Execute the sync immediately
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM public.sync_legacy_users_to_permissions();
  
  RAISE NOTICE 'Legacy User Sync Complete:';
  RAISE NOTICE '  Synced: %', v_result.synced_count;
  RAISE NOTICE '  Skipped: %', v_result.skipped_count;
  RAISE NOTICE '  Errors: %', v_result.error_count;
  
  IF v_result.error_count > 0 THEN
    RAISE NOTICE '  Details: %', v_result.details;
  END IF;
END;
$$;

-- Create a trigger to auto-sync new users from legacy table (optional, for transition period)
CREATE OR REPLACE FUNCTION public.auto_sync_legacy_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_auth_user_id UUID;
  v_mapped_role app_role;
BEGIN
  -- Only proceed if we have an email
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine auth_user_id
  v_auth_user_id := NEW.auth_user_id;
  
  IF v_auth_user_id IS NULL THEN
    SELECT au.id INTO v_auth_user_id
    FROM auth.users au
    WHERE au.email = NEW.email
    LIMIT 1;
  END IF;

  -- Skip if no auth user found
  IF v_auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map role
  v_mapped_role := public.map_legacy_role(COALESCE(NEW.role, 'viewer'));

  -- Upsert into profiles
  INSERT INTO public.profiles (id, email, full_name, birth_date, status)
  VALUES (v_auth_user_id, NEW.email, NEW.name, NEW.birth_date, COALESCE(NEW.status, 'active'))
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    birth_date = EXCLUDED.birth_date,
    status = EXCLUDED.status,
    updated_at = now();

  -- Upsert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_auth_user_id, v_mapped_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Seed permissions
  PERFORM public.seed_role_permissions(v_auth_user_id, v_mapped_role);

  -- Update auth_user_id in legacy table if it was missing
  IF NEW.auth_user_id IS NULL AND v_auth_user_id IS NOT NULL THEN
    NEW.auth_user_id := v_auth_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to legacy users table (only if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS sync_legacy_user_trigger ON public.users;
    CREATE TRIGGER sync_legacy_user_trigger
      BEFORE INSERT OR UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_sync_legacy_user();
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_legacy_users_to_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_legacy_role(TEXT) TO authenticated;

COMMENT ON FUNCTION public.sync_legacy_users_to_permissions() IS 
'Syncs users from legacy public.users table to new profiles, user_roles, and user_permissions tables. Safe to run multiple times.';
