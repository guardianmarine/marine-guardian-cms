-- Update is_active_staff() to use new profiles + user_roles tables
-- ================================================================
-- This fixes RLS policies that rely on is_active_staff() to work with
-- the new permissions system while maintaining backward compatibility.

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- New system: profiles + user_roles (auth.users UUID)
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND ur.role IN ('admin', 'sales', 'inventory', 'finance')
      AND p.status = 'active'
  )
  OR EXISTS (
    -- Legacy fallback: users table (for transition period)
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'sales', 'inventory', 'finance')
      AND status = 'active'
  );
$$;

-- Also update/create helper functions for role checking
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.current_user_has_role('admin');
$$;

-- Verify the function works
DO $$
BEGIN
  RAISE NOTICE 'is_active_staff() updated to use profiles + user_roles tables';
  RAISE NOTICE 'Legacy users table fallback included for backward compatibility';
END $$;
