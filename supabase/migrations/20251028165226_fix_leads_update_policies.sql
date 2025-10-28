/*
  # Fix Leads Table RLS Policies for Updates

  1. Problem
    - Multiple conflicting RLS policies on leads table
    - Incorrect logic checking company_id = auth.uid() instead of checking profiles
    - Users unable to update lead status

  2. Solution
    - Drop all existing conflicting policies
    - Create clean, simple policies based on correct profile structure
    - Allow users to update leads where company_id matches their profile.id

  3. Security
    - Users can only view/update/delete leads for their company
    - Policies check that company_id matches the user's profile id
    - Managers can access leads for reps they manage
*/

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Authenticated users can view all leads" ON leads;
DROP POLICY IF EXISTS "Users can view leads they own or manage" ON leads;
DROP POLICY IF EXISTS "Users can view their company leads" ON leads;
DROP POLICY IF EXISTS "Users can insert leads for their company" ON leads;
DROP POLICY IF EXISTS "Users can create leads for their company" ON leads;
DROP POLICY IF EXISTS "Users can update leads they own or manage" ON leads;
DROP POLICY IF EXISTS "Users can update their company leads" ON leads;
DROP POLICY IF EXISTS "Users can delete leads they own or manage" ON leads;
DROP POLICY IF EXISTS "Users can delete their company leads" ON leads;

-- Create clean policies based on profile structure
-- SELECT: Users can view leads where company_id matches their profile or they are assigned
CREATE POLICY "Users can view company leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR assigned_rep_id = auth.uid()
    OR company_id IN (
      SELECT p.id FROM profiles p 
      WHERE p.manager_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- INSERT: Users can create leads for their company
CREATE POLICY "Users can create company leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Users can update leads for their company
CREATE POLICY "Users can update company leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR assigned_rep_id = auth.uid()
    OR company_id IN (
      SELECT p.id FROM profiles p 
      WHERE p.manager_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR assigned_rep_id = auth.uid()
    OR company_id IN (
      SELECT p.id FROM profiles p 
      WHERE p.manager_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- DELETE: Users can delete leads for their company
CREATE POLICY "Users can delete company leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT p.id FROM profiles p 
      WHERE p.manager_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
