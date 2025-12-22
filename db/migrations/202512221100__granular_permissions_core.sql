-- =====================================================
-- GRANULAR PERMISSIONS SYSTEM - CORE TABLES & FUNCTIONS
-- =====================================================

-- 1. Create app_role enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'inventory', 'sales', 'finance', 'viewer');
  END IF;
END$$;

-- 2. Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    birth_date DATE,
    emergency_contact JSONB,
    commission_percent NUMERIC(5,2) DEFAULT 10.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create user_roles table (multiple roles per user)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create user_permissions table (granular CRUD per module)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, module_name)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 5. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 6. Create function to check current user role
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(auth.uid(), _role);
$$;

-- 7. Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- 8. Create function to check module permissions
CREATE OR REPLACE FUNCTION public.user_has_module_permission(
    p_user_id UUID, 
    p_module TEXT, 
    p_action TEXT -- 'view', 'create', 'edit', 'delete'
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE p_action
    WHEN 'view' THEN COALESCE((SELECT can_view FROM public.user_permissions WHERE user_id = p_user_id AND module_name = p_module LIMIT 1), false)
    WHEN 'create' THEN COALESCE((SELECT can_create FROM public.user_permissions WHERE user_id = p_user_id AND module_name = p_module LIMIT 1), false)
    WHEN 'edit' THEN COALESCE((SELECT can_edit FROM public.user_permissions WHERE user_id = p_user_id AND module_name = p_module LIMIT 1), false)
    WHEN 'delete' THEN COALESCE((SELECT can_delete FROM public.user_permissions WHERE user_id = p_user_id AND module_name = p_module LIMIT 1), false)
    ELSE false
  END;
$$;

-- 9. Create function to check current user module permissions
CREATE OR REPLACE FUNCTION public.current_user_has_module_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.user_has_module_permission(auth.uid(), p_module, p_action);
$$;

-- 10. Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS user_permissions_updated_at ON public.user_permissions;
CREATE TRIGGER user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. RLS Policies for profiles
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles FOR SELECT
  TO authenticated
  USING ((id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles FOR UPDATE
  TO authenticated
  USING ((id = auth.uid()) OR public.is_admin())
  WITH CHECK ((id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((id = auth.uid()) OR public.is_admin());

-- 12. RLS Policies for user_roles (only admins can see all, users see their own)
DROP POLICY IF EXISTS user_roles_select_policy ON public.user_roles;
CREATE POLICY user_roles_select_policy ON public.user_roles FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS user_roles_insert_policy ON public.user_roles;
CREATE POLICY user_roles_insert_policy ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_roles_update_policy ON public.user_roles;
CREATE POLICY user_roles_update_policy ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_roles_delete_policy ON public.user_roles;
CREATE POLICY user_roles_delete_policy ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 13. RLS Policies for user_permissions (only admins can see all, users see their own)
DROP POLICY IF EXISTS user_permissions_select_policy ON public.user_permissions;
CREATE POLICY user_permissions_select_policy ON public.user_permissions FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS user_permissions_insert_policy ON public.user_permissions;
CREATE POLICY user_permissions_insert_policy ON public.user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_permissions_update_policy ON public.user_permissions;
CREATE POLICY user_permissions_update_policy ON public.user_permissions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_permissions_delete_policy ON public.user_permissions;
CREATE POLICY user_permissions_delete_policy ON public.user_permissions FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 14. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON public.user_permissions(module_name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
