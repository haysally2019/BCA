/*
  # Fix Proposals RLS Policies

  1. Changes
    - Drop existing restrictive policies
    - Create simpler, more permissive policies
    - Allow users to view and create proposals for leads they have access to
    - Allow managers/admins to view all proposals in their company

  2. Security
    - Users can view proposals they created
    - Users can view proposals for leads in their company
    - Managers/admins can view all company proposals
    - Users can create proposals for any lead they can see
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Managers can view company proposals" ON proposals;
DROP POLICY IF EXISTS "Users can create proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON proposals;

-- Policy: Users can view proposals they created
CREATE POLICY "Users can view own proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Policy: Users can view proposals in their company
CREATE POLICY "Users can view company proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      WHERE p1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.user_id = proposals.created_by
        AND (
          p2.company_id = p1.company_id
          OR p1.user_role IN ('admin', 'manager')
        )
      )
    )
  );

-- Policy: Users can create proposals
CREATE POLICY "Users can create proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own proposals
CREATE POLICY "Users can update own proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own proposals
CREATE POLICY "Users can delete own proposals"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());