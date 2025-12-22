-- =====================================================
-- SEED ROLE PERMISSIONS FUNCTION
-- Seeds default permissions based on role
-- =====================================================

CREATE OR REPLACE FUNCTION public.seed_role_permissions(p_user_id UUID, p_role_name app_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Clear existing permissions for this user
  DELETE FROM public.user_permissions WHERE user_id = p_user_id;
  
  IF p_role_name = 'admin' THEN
    -- Admin gets full access to everything
    INSERT INTO public.user_permissions (user_id, module_name, can_view, can_create, can_edit, can_delete)
    VALUES
      (p_user_id, 'dashboard', true, true, true, true),
      (p_user_id, 'inventory', true, true, true, true),
      (p_user_id, 'media', true, true, true, true),
      (p_user_id, 'cms', true, true, true, true),
      (p_user_id, 'purchasing', true, true, true, true),
      (p_user_id, 'crm_accounts', true, true, true, true),
      (p_user_id, 'crm_contacts', true, true, true, true),
      (p_user_id, 'crm_leads', true, true, true, true),
      (p_user_id, 'crm_opportunities', true, true, true, true),
      (p_user_id, 'crm_tasks', true, true, true, true),
      (p_user_id, 'crm_inbound', true, true, true, true),
      (p_user_id, 'deals', true, true, true, true),
      (p_user_id, 'tax_presets', true, true, true, true),
      (p_user_id, 'finance_overview', true, true, true, true),
      (p_user_id, 'finance_dashboard', true, true, true, true),
      (p_user_id, 'pac_fund', true, true, true, true),
      (p_user_id, 'commissions', true, true, true, true),
      (p_user_id, 'insights', true, true, true, true),
      (p_user_id, 'admin_users', true, true, true, true)
    ON CONFLICT (user_id, module_name) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete,
      updated_at = now();
    
  ELSIF p_role_name = 'sales' THEN
    -- Sales: CRM full access, inventory read-only, no finance/admin
    INSERT INTO public.user_permissions (user_id, module_name, can_view, can_create, can_edit, can_delete)
    VALUES
      (p_user_id, 'dashboard', true, false, false, false),
      (p_user_id, 'inventory', true, false, false, false),
      (p_user_id, 'crm_accounts', true, true, true, false),
      (p_user_id, 'crm_contacts', true, true, true, false),
      (p_user_id, 'crm_leads', true, true, true, false),
      (p_user_id, 'crm_opportunities', true, true, true, false),
      (p_user_id, 'crm_tasks', true, true, true, true),
      (p_user_id, 'crm_inbound', true, true, true, false),
      (p_user_id, 'deals', true, true, true, false),
      (p_user_id, 'commissions', true, false, false, false),
      (p_user_id, 'insights', true, false, false, false)
    ON CONFLICT (user_id, module_name) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete,
      updated_at = now();
    
  ELSIF p_role_name = 'finance' THEN
    -- Finance: Full finance access, CRM read-only, can edit deals for payments
    INSERT INTO public.user_permissions (user_id, module_name, can_view, can_create, can_edit, can_delete)
    VALUES
      (p_user_id, 'dashboard', true, false, false, false),
      (p_user_id, 'inventory', true, false, false, false),
      (p_user_id, 'crm_accounts', true, false, false, false),
      (p_user_id, 'crm_contacts', true, false, false, false),
      (p_user_id, 'deals', true, false, true, false),
      (p_user_id, 'tax_presets', true, true, true, true),
      (p_user_id, 'finance_overview', true, true, true, false),
      (p_user_id, 'finance_dashboard', true, true, true, false),
      (p_user_id, 'commissions', true, true, true, true),
      (p_user_id, 'insights', true, false, false, false)
    ON CONFLICT (user_id, module_name) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete,
      updated_at = now();
    
  ELSIF p_role_name = 'inventory' THEN
    -- Inventory: Full inventory/media/purchasing access, CRM read-only
    INSERT INTO public.user_permissions (user_id, module_name, can_view, can_create, can_edit, can_delete)
    VALUES
      (p_user_id, 'dashboard', true, false, false, false),
      (p_user_id, 'inventory', true, true, true, true),
      (p_user_id, 'media', true, true, true, true),
      (p_user_id, 'cms', true, true, true, false),
      (p_user_id, 'purchasing', true, true, true, false),
      (p_user_id, 'crm_accounts', true, false, false, false),
      (p_user_id, 'crm_contacts', true, false, false, false)
    ON CONFLICT (user_id, module_name) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete,
      updated_at = now();
    
  ELSIF p_role_name = 'viewer' THEN
    -- Viewer: Read-only access to basic modules
    INSERT INTO public.user_permissions (user_id, module_name, can_view, can_create, can_edit, can_delete)
    VALUES
      (p_user_id, 'dashboard', true, false, false, false),
      (p_user_id, 'inventory', true, false, false, false),
      (p_user_id, 'crm_accounts', true, false, false, false),
      (p_user_id, 'crm_contacts', true, false, false, false)
    ON CONFLICT (user_id, module_name) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete,
      updated_at = now();
  END IF;
END;
$$;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(
  module_name TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT module_name, can_view, can_create, can_edit, can_delete
  FROM public.user_permissions
  WHERE user_id = p_user_id;
$$;

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE(role app_role)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = p_user_id;
$$;

-- Function to get the primary (highest privilege) role for a user
CREATE OR REPLACE FUNCTION public.get_primary_role(p_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = p_user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1
      WHEN 'finance' THEN 2
      WHEN 'sales' THEN 3
      WHEN 'inventory' THEN 4
      WHEN 'viewer' THEN 5
    END
  LIMIT 1;
$$;
