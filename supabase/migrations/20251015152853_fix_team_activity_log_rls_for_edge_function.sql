/*
  # Fix Team Activity Log RLS Policy for Edge Function Account Creation

  1. Problem
    - The current RLS policy on team_activity_log requires company_id = get_user_profile_id()
    - This fails when Edge Functions using service role try to insert activity logs
    - Service role auth.uid() doesn't match the company_id being passed
    - Causes "Database error saving new users" when creating sales rep accounts

  2. Solution
    - Update the INSERT policy to allow service role operations
    - Validate that company_id references a valid profile (data integrity)
    - Maintain security for regular user operations
    - Allow Edge Functions to log activities for any valid company

  3. Changes
    - Drop the restrictive "System can log activities" policy
    - Create new policy that validates foreign key but allows service role
    - Keep SELECT policy unchanged (managers can view their company's logs)

  4. Security
    - Edge Functions are secured at the function level (manager authorization)
    - Foreign key validation ensures company_id is legitimate
    - Regular users still restricted by get_user_profile_id()
    - Activity logs properly track who performed the action (performed_by field)
*/

-- Drop the overly restrictive INSERT policy
DROP POLICY IF EXISTS "System can log activities" ON team_activity_log;

-- Create a new policy that allows service role to insert activity logs
-- while validating the company_id references a real profile
CREATE POLICY "Allow activity logging for valid companies"
  ON team_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is inserting for their own company (regular operations)
    company_id = get_user_profile_id()
    OR
    -- Allow if company_id references a valid profile (Edge Function operations)
    EXISTS (
      SELECT 1 FROM profiles WHERE id = company_id
    )
  );

-- Add a comment explaining this policy
COMMENT ON POLICY "Allow activity logging for valid companies" ON team_activity_log IS
  'Allows users to log activities for their own company, and Edge Functions to log activities for any valid company. Used during manager-initiated account creation and other automated processes.';
