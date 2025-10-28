/*
  # Fix Leads Table RLS Policies for Updates

  ## Problem
  Users are unable to update lead statuses due to overly restrictive RLS policies.

  ## Changes
  1. Drop the existing restrictive update policy
  2. Create a new, more permissive update policy that allows:
     - Company owners (where company_id matches their profile.id)
     - Assigned reps (where assigned_rep_id matches their auth.uid())
     - Team members under the same manager
     - Managers who manage the company

  ## Security
  - Still maintains proper access control
  - Only allows authenticated users
  - Checks ownership through multiple valid relationships
  - Prevents unauthorized cross-company access
*/

-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "Users can update company leads" ON leads;

-- Create a new, more permissive update policy
CREATE POLICY "Users can update company leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (
    -- User owns the company (their profile.id matches the lead's company_id)
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- User is assigned to this lead
    assigned_rep_id = auth.uid()
    OR
    -- User is a team member of this company
    company_id IN (
      SELECT tm.company_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid()
    )
    OR
    -- User is a manager of the company
    company_id IN (
      SELECT p.id 
      FROM profiles p 
      WHERE p.manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Same checks for the updated data
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    assigned_rep_id = auth.uid()
    OR
    company_id IN (
      SELECT tm.company_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT p.id 
      FROM profiles p 
      WHERE p.manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );
