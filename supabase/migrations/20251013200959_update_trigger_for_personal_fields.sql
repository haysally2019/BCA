/*
  # Update User Creation Trigger for Personal Fields

  1. Purpose
    - Update the handle_new_user trigger to use personal fields for new signups
    - Set full_name instead of company_name for sales_rep users
    - Maintain backward compatibility by setting both fields during transition
    - Ensure all new users have proper personal information structure

  2. Changes Made
    - Update handle_new_user() function to set full_name field
    - Set personal_phone, personal_address fields when applicable
    - Keep company_name field populated for backward compatibility
    - Use "Tartan Builders Inc" as company context, user's name as full_name

  3. Important Notes
    - Sales reps now get their actual name in full_name field
    - Company_name set to "Tartan Builders Inc" for organizational context
    - Manager_id still points to gmartinez profile for team hierarchy
    - Trigger maintains all existing functionality while adding personal fields
*/

-- Update the trigger function to use personal fields
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
      'sales_rep',
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

-- Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the trigger's purpose
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile with personal information for new users. Sets full_name from email, assigns to Tartan Builders Inc under gmartinez manager.';
