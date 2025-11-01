/*
  # Allow All Users to Edit Leads

  ## Changes
  1. Drop all existing restrictive policies on leads table
  2. Create maximally permissive policies for all operations (SELECT, INSERT, UPDATE, DELETE)
  3. Allow all authenticated users to perform any operation on any lead
  
  ## Security Note
  All authenticated users will have full access to all leads.
  This provides maximum flexibility for the sales team.
*/

-- Drop all existing policies on leads table
DROP POLICY IF EXISTS "Users can view company leads" ON leads;
DROP POLICY IF EXISTS "Users can create company leads" ON leads;
DROP POLICY IF EXISTS "Users can update company leads" ON leads;
DROP POLICY IF EXISTS "Users can delete company leads" ON leads;
DROP POLICY IF EXISTS "Allow all authenticated users to update leads" ON leads;
DROP POLICY IF EXISTS "Allow lead updates" ON leads;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON leads;

-- Create maximally permissive policies for all operations
CREATE POLICY "Allow all authenticated users to view leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (true);

-- Add helpful comments
COMMENT ON POLICY "Allow all authenticated users to view leads" ON leads IS 'All authenticated users can view all leads';
COMMENT ON POLICY "Allow all authenticated users to create leads" ON leads IS 'All authenticated users can create leads';
COMMENT ON POLICY "Allow all authenticated users to update leads" ON leads IS 'All authenticated users can update all leads';
COMMENT ON POLICY "Allow all authenticated users to delete leads" ON leads IS 'All authenticated users can delete leads';
