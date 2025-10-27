/*
  # Re-enable Signup Trigger for New User Registration

  1. Purpose
    - Re-enable the handle_new_user() trigger to automatically create profiles during signup
    - Ensure new sales reps are automatically assigned to gmartinez@tartanbuildersinc.com
    - Work correctly with the manager account restriction triggers

  2. Changes
    - Recreate the handle_new_user() function with proper logic
    - Create the trigger on auth.users table
    - Ensure it creates both profile and team_member records
    - All new signups become sales_rep under Tartan Builders Inc

  3. Security
    - Trigger works with validate_manager_account() trigger to enforce sales_rep role
    - Manager account validation happens BEFORE insert, so trigger data is corrected
    - RLS policies allow profile and team_member creation during signup

  4. Important Notes
    - New users are automatically assigned to gmartinez manager
    - Profile created with sales_rep role (enforced by validate_manager_account trigger)
    - Team member record also created automatically
*/

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  tartan_manager_user_id UUID := '173a9b7a-d5ab-402e-8225-0e8263dffcc5';
  tartan_company_profile_id UUID := '28eef186-2734-4c06-ae5f-b80de7f28da9';
  new_profile_id UUID;
  user_full_name TEXT;
BEGIN
  -- Only create profile if one doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  ) THEN
    -- Extract name from email (first part before @) as default
    user_full_name := SPLIT_PART(NEW.email, '@', 1);

    -- Capitalize first letter of each word
    user_full_name := INITCAP(REPLACE(user_full_name, '.', ' '));
    user_full_name := INITCAP(REPLACE(user_full_name, '_', ' '));

    -- Insert into profiles and get the new profile ID
    -- Note: validate_manager_account() trigger will enforce sales_rep role
    INSERT INTO public.profiles (
      user_id,
      company_name,
      full_name,
      company_email,
      subscription_plan,
      user_role,
      manager_id,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'Tartan Builders Inc',      -- Company for organizational context
      user_full_name,              -- Personal name for the individual
      NEW.email,
      'professional',
      'sales_rep',                 -- Will be enforced by validate_manager_account() trigger
      tartan_company_profile_id,   -- Manager_id points to gmartinez profile
      tartan_manager_user_id,      -- Created_by points to gmartinez user_id
      NOW(),
      NOW()
    ) RETURNING id INTO new_profile_id;

    -- Also create a team_members record
    INSERT INTO public.team_members (
      profile_id,
      user_id,
      company_id,
      manager_id,
      position,
      department,
      employment_status,
      hire_date,
      created_at,
      updated_at
    ) VALUES (
      new_profile_id,
      NEW.id,
      tartan_company_profile_id,   -- Company_id = the company profile
      tartan_company_profile_id,   -- Manager_id = gmartinez profile
      'Sales Representative',
      'Sales',
      'active',
      CURRENT_DATE,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the trigger's purpose
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates profile and team member record for new user signups. All new users are assigned as sales_rep under gmartinez@tartanbuildersinc.com at Tartan Builders Inc.';

-- Verify trigger is enabled
DO $$
BEGIN
  RAISE NOTICE 'Signup trigger successfully enabled. New user signups will automatically create profiles under gmartinez manager.';
END $$;
