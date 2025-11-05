/*
  # Fix Prospects RLS Policies for Sales Reps

  1. Changes
    - Update SELECT policy to allow sales reps to view prospects assigned to them
    - Update UPDATE policy to allow sales reps to update their assigned prospects
    - Keep manager/admin access to view all company prospects
    - Ensure sales reps can only see their own assigned prospects

  2. Security
    - Sales reps can only view/update prospects where assigned_rep_id = their profile_id
    - Managers can view all prospects in their company
    - All policies check authentication
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their company prospects" ON prospects;

-- Create new SELECT policy that allows:
-- 1. Sales reps to see prospects assigned to them
-- 2. Managers to see all prospects in their company
CREATE POLICY "Users can view prospects assigned to them or in their company"
  ON prospects FOR SELECT
  TO authenticated
  USING (
    -- Sales reps can see prospects assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can see all prospects in their company
    company_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_role IN ('manager', 'admin')
    )
  );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their company prospects" ON prospects;

-- Create new UPDATE policy
CREATE POLICY "Users can update prospects assigned to them or in their company"
  ON prospects FOR UPDATE
  TO authenticated
  USING (
    -- Sales reps can update prospects assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can update all prospects in their company
    company_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    -- Sales reps can update prospects assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can update all prospects in their company
    company_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_role IN ('manager', 'admin')
    )
  );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete their company prospects" ON prospects;

-- Create new DELETE policy
CREATE POLICY "Users can delete prospects assigned to them or in their company"
  ON prospects FOR DELETE
  TO authenticated
  USING (
    -- Sales reps can delete prospects assigned to them
    assigned_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Managers can delete all prospects in their company
    company_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      AND user_role IN ('manager', 'admin')
    )
  );
