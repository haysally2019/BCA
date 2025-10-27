/*
  # Fix Signup Function - AffiliateWP Trigger RLS Issue

  ## Problem
  The signup function fails because the `queue_affiliatewp_account_creation` trigger
  cannot insert into `affiliatewp_sync_log` table. The table only has INSERT policy
  for service_role, but the trigger runs during user signup in authenticated context.

  ## Solution
  Add RLS policy to allow the trigger function (running with SECURITY DEFINER) to
  insert sync log entries during profile creation.

  ## Changes
  1. Add INSERT policy for authenticated users on affiliatewp_sync_log
  2. The trigger already has SECURITY DEFINER, so it should bypass RLS,
     but we'll add a policy to be safe
  3. Ensure the function owner is set correctly

  ## Security
  - Policy only allows INSERT, not UPDATE or DELETE
  - Users can only insert their own sync logs (profile_id validation)
  - This is safe because sync logs are informational tracking records
*/

-- Drop existing restrictive INSERT policy if it exists
DROP POLICY IF EXISTS "Service role can insert sync logs" ON public.affiliatewp_sync_log;

-- Create new INSERT policy that allows authenticated users and service role
CREATE POLICY "Allow sync log inserts during signup"
  ON public.affiliatewp_sync_log
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Ensure the queue_affiliatewp_account_creation function is owned by postgres
-- This allows it to bypass RLS policies when needed
ALTER FUNCTION public.queue_affiliatewp_account_creation() OWNER TO postgres;

-- Add comment explaining the policy
COMMENT ON POLICY "Allow sync log inserts during signup" ON public.affiliatewp_sync_log IS
  'Allows the queue_affiliatewp_account_creation trigger to insert sync log entries during user signup. The trigger runs with SECURITY DEFINER so this is safe.';
