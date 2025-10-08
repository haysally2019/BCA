/*
  # Create Automatic Profile Creation Trigger

  1. Purpose
    - Ensures every new user in auth.users automatically gets a profile
    - Acts as a failsafe backup to application-level profile creation
    - Prevents situations where users exist without profiles

  2. Changes
    - Creates a trigger function that runs when new users are created
    - Automatically inserts a basic profile with default values
    - Only creates profile if one doesn't already exist
    - Uses SECURITY DEFINER to bypass RLS during automatic creation

  3. Security
    - Function uses SECURITY DEFINER to create profiles automatically
    - Only triggers on INSERT to auth.users (system-level operation)
    - Does not allow user manipulation of the trigger

  4. Default Values
    - company_name: Derived from email prefix
    - company_email: User's email
    - subscription_plan: 'professional' (default for new signups)
    - user_role: 'sales_rep' (default role)
    - Users can update these values after signup
*/

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create profile if one doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.profiles (
      user_id,
      company_name,
      company_email,
      subscription_plan,
      user_role,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(
        SPLIT_PART(NEW.email, '@', 1),
        'New User'
      ),
      NEW.email,
      'professional',
      'sales_rep',
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after a new user is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();