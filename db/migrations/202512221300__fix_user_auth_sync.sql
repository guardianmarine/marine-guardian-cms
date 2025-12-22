-- Fix user auth sync: ensure profiles and user_roles use the correct auth.users UUID
-- This migration finds the auth.users UUID by email and syncs profiles/user_roles

DO $$
DECLARE
  v_auth_uid uuid;
  v_email text := 'e@guardianm.com';
BEGIN
  -- Get the correct UUID from auth.users
  SELECT id INTO v_auth_uid FROM auth.users WHERE email = v_email;
  
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users entry found for email %', v_email;
  END IF;
  
  RAISE NOTICE 'Found auth.users UUID: %', v_auth_uid;
  
  -- Upsert into profiles with the correct auth UUID
  INSERT INTO public.profiles (id, email, full_name, status, created_at, updated_at)
  VALUES (
    v_auth_uid,
    v_email,
    'Eugenio Guerra',
    'active',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    status = 'active',
    updated_at = now();
  
  RAISE NOTICE 'Upserted profile for UUID: %', v_auth_uid;
  
  -- Upsert into user_roles with admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_auth_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Upserted user_roles (admin) for UUID: %', v_auth_uid;
  
  -- Seed full permissions for admin
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_role_permissions') THEN
    PERFORM public.seed_role_permissions(v_auth_uid, 'admin');
    RAISE NOTICE 'Seeded admin permissions for UUID: %', v_auth_uid;
  END IF;
  
  RAISE NOTICE 'SUCCESS: User % is now synced with auth UUID %', v_email, v_auth_uid;
END $$;

-- Verify the fix
SELECT 
  'auth.users' as source,
  id,
  email
FROM auth.users 
WHERE email = 'e@guardianm.com'

UNION ALL

SELECT 
  'profiles' as source,
  id,
  email
FROM public.profiles 
WHERE email = 'e@guardianm.com'

UNION ALL

SELECT 
  'user_roles' as source,
  user_id as id,
  role::text as email
FROM public.user_roles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'e@guardianm.com');
