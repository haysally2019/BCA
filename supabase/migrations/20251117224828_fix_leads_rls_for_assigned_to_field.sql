/*
  # Fix leads RLS policies to support assigned_to field
  
  1. Changes
    - Update SELECT policy to allow sales reps to see leads where they are the creator OR assigned_to
    - Update UPDATE policy to allow sales reps to update leads where they are the creator OR assigned_to
    - Keep admin and manager access unchanged
    
  2. Security
    - Sales reps can only see/update leads they created or are assigned to
    - Managers can see/update all leads in their company
    - Admins can see/update all leads
*/

-- ============================================================
-- DROP EXISTING POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Role-based lead select access" ON leads;
DROP POLICY IF EXISTS "Role-based lead update access" ON leads;

-- ============================================================
-- RECREATE SELECT POLICY with assigned_to support
-- ============================================================
CREATE POLICY "Role-based lead select access"
ON leads
FOR SELECT
TO authenticated
USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()
    ELSE (
      user_id = auth.uid()::text 
      OR assigned_to = auth.uid()::text
    )
  END
);

-- ============================================================
-- RECREATE UPDATE POLICY with assigned_to support
-- ============================================================
CREATE POLICY "Role-based lead update access"
ON leads
FOR UPDATE
TO authenticated
USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()
    ELSE (
      user_id = auth.uid()::text 
      OR assigned_to = auth.uid()::text
    )
  END
)
WITH CHECK (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()
    ELSE (
      user_id = auth.uid()::text 
      OR assigned_to = auth.uid()::text
    )
  END
);
