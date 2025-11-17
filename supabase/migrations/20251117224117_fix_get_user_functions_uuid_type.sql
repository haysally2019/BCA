/*
  # Fix get_user_role and get_user_company_id functions for UUID type
  
  1. Changes
    - Fix get_user_company_id to properly handle UUID type in profiles table
    - Fix get_user_role to properly handle UUID type in profiles table
    - profiles.user_id is UUID type, not text
    
  2. Security
    - Functions are SECURITY DEFINER to bypass RLS when needed
    - Functions are STABLE (results don't change within query)
*/

-- ============================================================
-- RECREATE: Get user role from profiles table (with correct type)
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
  -- profiles.user_id is UUID type
  SELECT user_role::text INTO role_value
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Default to sales_rep if not found
  RETURN COALESCE(role_value, 'sales_rep');
END;
$$;

-- ============================================================
-- RECREATE: Get user company_id from profiles table (with correct type)
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
  -- profiles.user_id is UUID type
  SELECT company_id INTO company_value
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN company_value;
END;
$$;
