/*
  # Disable Automatic Signup Trigger

  1. Problem
    - The handle_new_user() trigger is causing "Database error saving new user"
    - RLS policies are blocking the trigger from creating profiles and team_members
    - SECURITY DEFINER doesn't bypass RLS as expected in this context
    - The trigger creates complexity with nested policy checks

  2. Solution
    - Disable the automatic trigger for new user signups
    - Use ONLY the Edge Function (create-sales-rep-account) for account creation
    - Managers will create accounts through the UI which calls the Edge Function
    - This provides better control, logging, and error handling

  3. Benefits
    - Single path for account creation (Edge Function)
    - Better error handling and visibility
    - Proper authorization checks in the Edge Function
    - Activity logging for audit trail
    - Temporary passwords generated securely

  4. Important Notes
    - After this migration, direct signups through auth.signup() will NOT work
    - All account creation must go through the create-sales-rep-account Edge Function
    - This is intentional - we want controlled account creation by managers only
*/

-- Drop the trigger that automatically creates profiles on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function for now (in case we need to re-enable later)
-- But it won't be called automatically

COMMENT ON FUNCTION public.handle_new_user() IS 
  'DISABLED: Previously auto-created profiles on signup. Now using Edge Function (create-sales-rep-account) for controlled account creation by managers only.';
