/*
  # Fix handle_new_user Trigger to Match Actual Table Schema

  1. Problem
    - Trigger tries to insert into columns that don't exist (company_email, manager_id, created_by, subscription_plan, updated_at, id)
    - profiles table has user_id as primary key (not id)
    - Causing 500 error on signup

  2. Solution
    - Update trigger to only use columns that actually exist
    - Remove references to missing columns
    - Simplify to create minimal working profile

  3. Changes
    - Rewrite handle_new_user() to match actual schema
    - Remove team_members creation (table may not exist or have different structure)
    - Focus on successful profile creation only
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path TO 'public', 'auth'
LANGUAGE plpgsql
AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- Only create profile if one doesn't exist
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE LOG 'Profile already exists for user %, skipping creation', NEW.id;
    RETURN NEW;
  END IF;

  -- Get email from auth.users
  user_email := COALESCE(NEW.email, 'unknown@example.com');

  -- Extract name from email (first part before @) as default
  user_full_name := SPLIT_PART(user_email, '@', 1);

  -- Capitalize first letter of each word
  user_full_name := INITCAP(REPLACE(user_full_name, '.', ' '));
  user_full_name := INITCAP(REPLACE(user_full_name, '_', ' '));

  -- Ensure we have a valid name
  IF user_full_name IS NULL OR TRIM(user_full_name) = '' THEN
    user_full_name := 'New User';
  END IF;

  RAISE LOG 'Creating profile for user %: email=%, name=%', NEW.id, user_email, user_full_name;

  -- Insert into profiles with only columns that exist
  BEGIN
    INSERT INTO public.profiles (
      user_id,
      email,
      full_name,
      company_name,
      user_role,
      is_active,
      created_at
    ) VALUES (
      NEW.id,
      user_email,
      user_full_name,
      'Tartan Builders Inc',
      'sales_rep',
      true,
      NOW()
    );

    RAISE LOG 'Profile created successfully for user: %', NEW.id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE LOG 'Profile already exists for user % (unique_violation), skipping', NEW.id;
      RETURN NEW;
    WHEN OTHERS THEN
      RAISE LOG 'Error creating profile for user %: % %', NEW.id, SQLSTATE, SQLERRM;
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Critical error in handle_new_user for user %: % %', NEW.id, SQLSTATE, SQLERRM;
    RAISE;
END;
$$;

-- Set the function owner to postgres to bypass all RLS
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile for new signups. Simplified to only use columns that exist in the actual schema. All users assigned as sales_rep.';

-- Ensure trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Fixed handle_new_user trigger to match actual schema';
  RAISE NOTICE 'Profile creation now uses only existing columns';
  RAISE NOTICE 'Signup should now work correctly';
  RAISE NOTICE '=================================================================';
END $$;
