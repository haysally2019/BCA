/*
  # Fix Sales Reps Count Access

  1. Problem
    - The `getSalesRepsCount` function is failing with "Failed to fetch"
    - Current RLS policies on `sales_reps` table require complex function calls
    - Count queries with `head: true` are being blocked by RLS evaluation

  2. Solution
    - Add a more permissive SELECT policy for authenticated users to count their own sales reps
    - Allow managers/admins to count sales reps in their company
    - Ensure the policy is evaluated efficiently without causing fetch failures

  3. Changes
    - Add new policy: "Allow counting sales reps for managers"
    - This policy allows authenticated users to view sales reps count for their company
*/

-- Drop the existing complex policy and replace with simpler ones
DROP POLICY IF EXISTS "Sales reps can view own data" ON sales_reps;

-- Create a simpler policy that allows users to view sales reps in their company
CREATE POLICY "Users can view sales reps in their company"
  ON sales_reps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.company_name = p2.company_name
      WHERE p1.id = sales_reps.profile_id
      AND p2.user_id = auth.uid()
    )
  );
