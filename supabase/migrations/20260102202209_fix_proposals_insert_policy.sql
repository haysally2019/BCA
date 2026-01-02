/*
  # Fix Proposals Insert Policy

  1. Changes
    - Update the insert policy to allow any authenticated user to create proposals for any lead
    - This gives sales reps more flexibility to send proposals
  
  2. Security
    - Users can still only view and update their own proposals
    - Managers can view all proposals within their company
*/

-- Drop and recreate the insert policy with more flexible permissions
DROP POLICY IF EXISTS "Users can create proposals" ON proposals;

CREATE POLICY "Users can create proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());
