/*
  # Update Leads RLS for Admin and Manager Access
  
  1. Changes
    - Drop existing restrictive RLS policies on leads table
    - Create new policies that allow:
      - Admins: Full access to all leads (SELECT, INSERT, UPDATE, DELETE)
      - Managers: Full access to leads in their company (SELECT, INSERT, UPDATE, DELETE)
      - Sales Reps: Access only to their own leads (SELECT, INSERT, UPDATE, DELETE)
    
  2. Security
    - Maintain RLS enabled on leads table
    - Reuse existing get_user_company_id() helper function (returns uuid)
    - Cast types appropriately for comparison
    - Ensure proper isolation between companies
*/

-- ============================================================
-- DROP EXISTING POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can select own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

-- ============================================================
-- CREATE HELPER FUNCTION FOR USER ROLE (if not exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_user_role'
  ) THEN
    CREATE FUNCTION get_user_role()
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    AS $func$
    DECLARE
      role_value text;
    BEGIN
      -- Try to get role from JWT claims first
      role_value := auth.jwt() -> 'user_metadata' ->> 'user_role';
      
      -- If not in JWT, query profiles table
      IF role_value IS NULL THEN
        SELECT user_role::text INTO role_value
        FROM profiles
        WHERE user_id = auth.uid()::text
        LIMIT 1;
      END IF;
      
      RETURN COALESCE(role_value, 'sales_rep');
    END;
    $func$;
  END IF;
END $$;

-- ============================================================
-- SELECT POLICY: Admins see all, Managers see company, Reps see own
-- ============================================================
CREATE POLICY "Role-based lead select access"
ON leads
FOR SELECT
TO authenticated
USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()::text
    ELSE user_id = auth.uid()::text
  END
);

-- ============================================================
-- INSERT POLICY: All authenticated users can create leads
-- ============================================================
CREATE POLICY "Role-based lead insert access"
ON leads
FOR INSERT
TO authenticated
WITH CHECK (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()::text
    ELSE user_id = auth.uid()::text AND company_id = get_user_company_id()::text
  END
);

-- ============================================================
-- UPDATE POLICY: Admins update all, Managers update company, Reps update own
-- ============================================================
CREATE POLICY "Role-based lead update access"
ON leads
FOR UPDATE
TO authenticated
USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()::text
    ELSE user_id = auth.uid()::text
  END
)
WITH CHECK (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()::text
    ELSE user_id = auth.uid()::text
  END
);

-- ============================================================
-- DELETE POLICY: Admins delete all, Managers delete company, Reps delete own
-- ============================================================
CREATE POLICY "Role-based lead delete access"
ON leads
FOR DELETE
TO authenticated
USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN company_id = get_user_company_id()::text
    ELSE user_id = auth.uid()::text
  END
);

-- ============================================================
-- ADD ASSIGNED_TO COLUMN FOR LEAD ASSIGNMENT
-- ============================================================
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS assigned_to text;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- ============================================================
-- COMMENT ON POLICIES
-- ============================================================
COMMENT ON POLICY "Role-based lead select access" ON leads IS 
'Admins see all leads, managers see leads in their company, sales reps see only their own leads';

COMMENT ON POLICY "Role-based lead insert access" ON leads IS 
'All authenticated users can create leads within their access scope';

COMMENT ON POLICY "Role-based lead update access" ON leads IS 
'Admins update all leads, managers update company leads, sales reps update their own leads';

COMMENT ON POLICY "Role-based lead delete access" ON leads IS 
'Admins delete all leads, managers delete company leads, sales reps delete their own leads';
