/*
  # Auto-create Team Member Record for New Sales Reps

  1. Purpose
    - Automatically creates a team_members record for new sales rep signups
    - Links the rep to Tartan Builders Inc in the team_members table
    - Ensures proper team structure and reporting hierarchy

  2. Changes
    - Updates handle_new_user() trigger to also insert into team_members table
    - Sets company_id to Tartan Builders Inc
    - Sets manager_id to gmartinez@tartanbuildersinc.com
    - Creates a proper team member profile with default values

  3. Important Notes
    - This ensures new reps appear in the Team Management section
    - All new reps are automatically under the Tartan Builders manager
    - Default position: "Sales Representative"
    - Default department: "Sales"
*/

-- Update the trigger function to also create team_members record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  tartan_manager_user_id UUID := '173a9b7a-d5ab-402e-8225-0e8263dffcc5';
  tartan_company_id UUID := '28eef186-2734-4c06-ae5f-b80de7f28da9';
  new_profile_id UUID;
BEGIN
  -- Only create profile if one doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  ) THEN
    -- Insert into profiles and get the new profile ID
    INSERT INTO public.profiles (
      user_id,
      company_name,
      company_email,
      subscription_plan,
      user_role,
      user_type,
      manager_id,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'Tartan Builders Inc',
      NEW.email,
      'professional',
      'sales_rep',
      'sales_rep',
      tartan_company_id,
      tartan_manager_user_id,
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
      tartan_company_id,
      tartan_company_id,
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

-- Trigger already exists from previous migration, no need to recreate
