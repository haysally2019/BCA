/*
  # Fix leads table RLS policies

  1. Security Changes
    - Simplify RLS policies to work with direct user authentication
    - Remove dependency on complex helper functions for basic operations
    - Allow authenticated users to create and manage their own leads
    - Ensure leads are properly scoped to the company_id field

  2. Changes Made
    - Drop existing complex policies
    - Create simpler policies that work with the current profile structure
    - Allow authenticated users to create leads for their company
    - Allow users to view/update leads for their company

  3. Important Notes  
    - Policies are now based on the company_id matching the user's profile id
    - This ensures data isolation between different companies
    - Authenticated users can perform all operations on their company's leads
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Sales reps can view own leads" ON leads;
DROP POLICY IF EXISTS "Sales reps can create company leads" ON leads;
DROP POLICY IF EXISTS "Sales reps can update own leads" ON leads;
DROP POLICY IF EXISTS "Managers can delete company leads" ON leads;
DROP POLICY IF EXISTS "Users can access their company's leads" ON leads;

-- Create simplified policies that work with the current structure
CREATE POLICY "Users can view their company leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create leads for their company"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );