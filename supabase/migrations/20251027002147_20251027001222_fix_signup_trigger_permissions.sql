/*
  # Fix Signup Trigger - Bypass RLS for SECURITY DEFINER Function

  1. Problem
    - handle_new_user() trigger is failing during signup with "Database error saving new user"
    - SECURITY DEFINER function may still be subject to RLS policies in auth.users context
    - Need to ensure trigger can insert into profiles and team_members tables

  2. Solution
    - Alter the function to be owned by postgres (superuser)
    - Grant necessary permissions to the function
    - Ensure RLS is properly bypassed with SECURITY DEFINER

  3. Changes
    - Update function ownership
    - Add explicit schema qualification
    - Ensure proper exception handling
*/

-- Recreate the handle_new_user function with explicit ownership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path TO 'public', 'auth'
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
    BEGIN
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
        'Tartan Builders Inc',
        user_full_name,
        NEW.email,
        'professional',
        'sales_rep',
        tartan_company_profile_id,
        tartan_manager_user_id,
        NOW(),
        NOW()
      ) RETURNING id INTO new_profile_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error creating profile for user %: % %', NEW.id, SQLSTATE, SQLERRM;
        RAISE;
    END;

    -- Also create a team_members record
    BEGIN
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
        tartan_company_profile_id,
        tartan_company_profile_id,
        'Sales Representative',
        'Sales',
        'active',
        CURRENT_DATE,
        NOW(),
        NOW()
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error creating team_member for profile %: % %', new_profile_id, SQLSTATE, SQLERRM;
        RAISE;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE LOG 'Critical error in handle_new_user for user %: % %', NEW.id, SQLSTATE, SQLERRM;
    -- Re-raise to prevent user creation if profile/team_member fails
    RAISE;
END;
$$;

-- Set the function owner to postgres to bypass all RLS
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Ensure the trigger is recreated
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates profile and team member record for new user signups. All new users are assigned as sales_rep under gmartinez@tartanbuildersinc.com. Function runs as postgres to bypass RLS.';
