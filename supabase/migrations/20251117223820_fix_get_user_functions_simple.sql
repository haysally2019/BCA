/*
  # Fix get_user_role and get_user_company_id functions
  
  1. Changes
    - Drop and recreate get_user_company_id to fix the dependency issue
    - Ensure get_user_role exists and works correctly
    - Both functions query the profiles table directly
    
  2. Security
    - Functions are SECURITY DEFINER to bypass RLS when needed
    - Functions are STABLE (results don't change within query)
*/

-- ============================================================
-- DROP EXISTING FUNCTIONS (CASCADE will drop dependent policies)
-- ============================================================
DROP FUNCTION IF EXISTS get_user_company_id() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

-- ============================================================
-- RECREATE: Get user role from profiles table
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  role_value text;
BEGIN
  -- Query profiles table for the user's role
  SELECT user_role::text INTO role_value
  FROM profiles
  WHERE user_id = auth.uid()::text
  LIMIT 1;
  
  -- Default to sales_rep if not found
  RETURN COALESCE(role_value, 'sales_rep');
END;
$$;

-- ============================================================
-- RECREATE: Get user company_id from profiles table
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  company_value text;
BEGIN
  -- Query profiles table for the user's company_id
  SELECT company_id INTO company_value
  FROM profiles
  WHERE user_id = auth.uid()::text
  LIMIT 1;
  
  RETURN company_value;
END;
$$;

-- ============================================================
-- RECREATE RLS POLICIES ON LEADS TABLE
-- ============================================================

-- SELECT POLICY: Admins see all, Managers see company, Reps see own
CREATE POLICY "Role-based lead select access"
ON leads
FOR SELECT
TO authenticated
USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()
    ELSE user_id = auth.uid()::text
  END
);

-- INSERT POLICY: All authenticated users can create leads
CREATE POLICY "Role-based lead insert access"
ON leads
FOR INSERT
TO authenticated
WITH CHECK (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()
    ELSE user_id = auth.uid()::text AND company_id = get_user_company_id()
  END
);

-- UPDATE POLICY: Admins update all, Managers update company, Reps update own
CREATE POLICY "Role-based lead update access"
ON leads
FOR UPDATE
TO authenticated
USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()
    ELSE user_id = auth.uid()::text
  END
)
WITH CHECK (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()
    ELSE user_id = auth.uid()::text
  END
);

-- DELETE POLICY: Admins delete all, Managers delete company, Reps delete own
CREATE POLICY "Role-based lead delete access"
ON leads
FOR DELETE
TO authenticated
USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()
    ELSE user_id = auth.uid()::text
  END
);
