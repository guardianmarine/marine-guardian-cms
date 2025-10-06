-- Secure RPCs for soft delete operations
-- All functions use SECURITY DEFINER to bypass RLS during execution

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  );
$$;

-- Move record to trash (soft delete)
CREATE OR REPLACE FUNCTION public.move_to_trash(
  _table text,
  _id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_staff boolean;
BEGIN
  -- Check if user is active staff
  SELECT public.is_active_staff() INTO _is_staff;
  
  IF NOT _is_staff THEN
    RAISE EXCEPTION 'Only active staff can move records to trash';
  END IF;

  -- Validate table name (prevent SQL injection)
  IF _table NOT IN ('accounts', 'contacts', 'leads', 'opportunities', 'units') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  -- Execute soft delete
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
    _table
  ) USING _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or already deleted';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.move_to_trash IS 'Soft delete: set deleted_at to now()';

-- Restore record from trash
CREATE OR REPLACE FUNCTION public.restore_from_trash(
  _table text,
  _id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_staff boolean;
BEGIN
  -- Check if user is active staff
  SELECT public.is_active_staff() INTO _is_staff;
  
  IF NOT _is_staff THEN
    RAISE EXCEPTION 'Only active staff can restore records';
  END IF;

  -- Validate table name
  IF _table NOT IN ('accounts', 'contacts', 'leads', 'opportunities', 'units') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  -- Execute restore
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    _table
  ) USING _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or not in trash';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.restore_from_trash IS 'Restore soft-deleted record';

-- Hard delete (permanent removal)
CREATE OR REPLACE FUNCTION public.hard_delete(
  _table text,
  _id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT public.is_admin(auth.uid()) INTO _is_admin;
  
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Only admins can permanently delete records';
  END IF;

  -- Validate table name
  IF _table NOT IN ('accounts', 'contacts', 'leads', 'opportunities', 'units') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  -- Execute hard delete
  EXECUTE format(
    'DELETE FROM public.%I WHERE id = $1',
    _table
  ) USING _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.hard_delete IS 'Permanently delete record (admin only)';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.move_to_trash TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_from_trash TO authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete TO authenticated;
