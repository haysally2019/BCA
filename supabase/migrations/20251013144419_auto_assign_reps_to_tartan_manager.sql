/*
  # Auto-assign New Sales Reps to Tartan Builders Inc Manager

  1. Purpose
    - Automatically assigns all new sales rep signups to gmartinez@tartanbuildersinc.com
    - Sets the company_id to Tartan Builders Inc company
    - Sets manager_id to the Tartan Builders manager
    - Ensures all new reps are properly linked to the Tartan organization

  2. Changes
    - Updates the handle_new_user() trigger function
    - Adds automatic manager_id and company_id assignment
    - Sets user_type to 'sales_rep' for new signups
    - New users are automatically linked to Tartan Builders Inc

  3. Important Notes
    - Manager: gmartinez@tartanbuildersinc.com (user_id: 173a9b7a-d5ab-402e-8225-0e8263dffcc5)
    - Company: Tartan Builders Inc (profile_id: 28eef186-2734-4c06-ae5f-b80de7f28da9)
    - All new signups are automatically assigned to this manager
*/

-- Update the trigger function to auto-assign to Tartan Builders manager
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  tartan_manager_user_id UUID := '173a9b7a-d5ab-402e-8225-0e8263dffcc5';
  tartan_company_id UUID := '28eef186-2734-4c06-ae5f-b80de7f28da9';
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
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists from previous migration, no need to recreate
