/*
  # Fix Leads RLS Policies for Sales Reps

  1. Changes
    - Update SELECT policy to allow sales reps to view leads assigned to them
    - Update UPDATE policy to allow sales reps to update their assigned leads
    - Update DELETE policy to allow sales reps to delete their assigned leads
    - Keep manager/admin access to view all company leads
    - Ensure sales reps can only see their own assigned leads

  2. Security
    - Sales reps can only view/update/delete leads where assigned_rep_id = their profile_id
    - Managers can view/update/delete all leads in their company
    - All policies check authentication
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all authenticated users to view leads" ON leads;
DROP POLICY IF EXISTS "Allow all authenticated users to update leads" ON leads;
DROP POLICY IF EXISTS "Allow all authenticated users to delete leads" ON leads;
DROP POLICY IF EXISTS "Allow all authenticated users to create leads" ON leads;

-- Create new SELECT policy that allows:
-- 1. Sales reps to see leads assigned to them
-- 2. Managers to see all leads in their company
CREATE POLICY "Users can view leads assigned to them or in their company"
  ON leads FOR SELECT
  TO authenticated
  USING (
    -- Sales reps can see leads assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can see all leads in their company
    company_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_role IN ('manager', 'admin')
    )
  );

-- Create new INSERT policy
CREATE POLICY "Users can create leads for their company or assignment"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sales reps can create leads assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can create leads in their company
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create new UPDATE policy
CREATE POLICY "Users can update leads assigned to them or in their company"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    -- Sales reps can update leads assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can update all leads in their company
    company_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    -- Sales reps can update leads assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can update all leads in their company
    company_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_role IN ('manager', 'admin')
    )
  );

-- Create new DELETE policy
CREATE POLICY "Users can delete leads assigned to them or in their company"
  ON leads FOR DELETE
  TO authenticated
  USING (
    -- Sales reps can delete leads assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can delete all leads in their company
    company_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_role IN ('manager', 'admin')
    )
  );
