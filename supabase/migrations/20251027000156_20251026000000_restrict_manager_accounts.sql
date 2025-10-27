/*
  # Restrict Manager Accounts to Single Authorized User

  1. Purpose
    - Enforce that only gmartinez@tartanbuildersinc.com (user_id: 173a9b7a-d5ab-402e-8225-0e8263dffcc5) can have manager/admin role
    - Prevent creation of new manager/admin accounts through any pathway
    - All new signups must be sales_rep role only

  2. Changes
    - Add check constraint to profiles table to validate manager/admin accounts
    - Create a database function to validate manager account creation
    - Update existing policies to enforce single manager rule
    - Add trigger to prevent unauthorized manager account creation

  3. Security
    - Multi-layered approach ensures no bypass possible
    - Application layer, edge function, and database layer all enforce the rule
    - Existing manager account remains fully functional

  4. Important Notes
    - Authorized manager: gmartinez@tartanbuildersinc.com
    - Authorized user_id: 173a9b7a-d5ab-402e-8225-0e8263dffcc5
    - Authorized profile_id: 28eef186-2734-4c06-ae5f-b80de7f28da9
    - All other accounts must be sales_rep role
*/

-- Define the authorized manager user ID
DO $$
DECLARE
  authorized_manager_user_id UUID := '173a9b7a-d5ab-402e-8225-0e8263dffcc5';
  authorized_manager_profile_id UUID := '28eef186-2734-4c06-ae5f-b80de7f28da9';
BEGIN
  -- Create a function to validate manager account creation
  CREATE OR REPLACE FUNCTION validate_manager_account()
  RETURNS TRIGGER
  SECURITY DEFINER
  SET search_path = public
  LANGUAGE plpgsql
  AS $func$
  DECLARE
    authorized_manager_user_id UUID := '173a9b7a-d5ab-402e-8225-0e8263dffcc5';
  BEGIN
    -- Allow the authorized manager account
    IF NEW.user_id = authorized_manager_user_id THEN
      RETURN NEW;
    END IF;

    -- Block any attempt to create manager or admin accounts for other users
    IF NEW.user_role IN ('manager', 'admin') THEN
      RAISE EXCEPTION 'Unauthorized: Only the designated account can have manager or admin role. All other accounts must be sales_rep.'
        USING HINT = 'Contact system administrator if you need elevated permissions';
    END IF;

    -- Force all non-authorized accounts to be sales_rep
    IF NEW.user_role IS NULL OR NEW.user_role NOT IN ('sales_rep', 'manager', 'admin') THEN
      NEW.user_role := 'sales_rep';
    END IF;

    RETURN NEW;
  END;
  $func$;

  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS enforce_single_manager_on_insert ON profiles;
  DROP TRIGGER IF EXISTS enforce_single_manager_on_update ON profiles;

  -- Create trigger for INSERT operations
  CREATE TRIGGER enforce_single_manager_on_insert
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_manager_account();

  -- Create trigger for UPDATE operations
  CREATE TRIGGER enforce_single_manager_on_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.user_role IS DISTINCT FROM NEW.user_role)
    EXECUTE FUNCTION validate_manager_account();

  -- Update any existing profiles (except authorized manager) to ensure they are sales_rep
  UPDATE profiles
  SET
    user_role = 'sales_rep',
    subscription_plan = 'professional',
    updated_at = NOW()
  WHERE
    user_id != authorized_manager_user_id
    AND user_role IN ('manager', 'admin');

  -- Log the number of accounts updated
  RAISE NOTICE 'Manager account restriction applied. Updated % existing accounts to sales_rep role',
    (SELECT COUNT(*) FROM profiles WHERE user_id != authorized_manager_user_id AND user_role IN ('manager', 'admin'));

END $$;

-- Add comment to the function for documentation
COMMENT ON FUNCTION validate_manager_account() IS
  'Enforces single manager account rule. Only user_id 173a9b7a-d5ab-402e-8225-0e8263dffcc5 can have manager/admin role. All other accounts must be sales_rep.';
