/*
  # Simplify Proposals RLS Policies

  1. Changes
    - Drop all existing complex policies
    - Create simple, permissive policies for authenticated users
    - Allow all authenticated users to read proposals
    - Allow users to manage their own proposals

  2. Security
    - All authenticated users can view all proposals
    - Users can only create/update/delete their own proposals
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can view company proposals" ON proposals;
DROP POLICY IF EXISTS "Users can create proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON proposals;

-- Simple SELECT policy: all authenticated users can view all proposals
CREATE POLICY "Authenticated users can view proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (true);

-- Simple INSERT policy: users can create proposals as themselves
CREATE POLICY "Users can create own proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Simple UPDATE policy: users can update their own proposals
CREATE POLICY "Users can update own proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Simple DELETE policy: users can delete their own proposals
CREATE POLICY "Users can delete own proposals"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
