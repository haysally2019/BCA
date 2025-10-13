/*
  # Fix gmartinez Manager Portal Structure
  
  1. Purpose
    - Convert gmartinez account from sales rep portal to proper manager portal
    - Fix manager_id assignments for all Tartan Builders sales reps
    - Ensure proper company hierarchy and team structure
    - Update triggers to correctly assign new reps to gmartinez as manager
  
  2. Changes Made
    - Update existing sales reps to have correct manager_id (gmartinez profile_id)
    - Create missing team_members records for existing sales reps
    - Fix handle_new_user trigger to properly distinguish between company_id and manager_id
    - Update RLS policies to grant managers access to their team's data
  
  3. Structure Clarification
    - Company Profile: gmartinez profile (28eef186-2734-4c06-ae5f-b80de7f28da9)
    - Manager User: gmartinez user (173a9b7a-d5ab-402e-8225-0e8263dffcc5)
    - Sales Reps: All have manager_id = gmartinez profile_id for reporting
    - Sales Reps: All have company_id = gmartinez profile_id for company association
  
  4. Important Notes
    - Manager can now see all team member data
    - New sales reps automatically assigned under gmartinez
    - Proper separation between company ownership and manager reporting
*/

-- Step 1: Update existing sales reps to have correct manager_id
UPDATE profiles
SET manager_id = '28eef186-2734-4c06-ae5f-b80de7f28da9'
WHERE user_role = 'sales_rep'
  AND company_name = 'Tartan Builders Inc'
  AND (manager_id IS NULL OR manager_id != '28eef186-2734-4c06-ae5f-b80de7f28da9');

-- Step 2: Create team_members records for existing sales reps that don't have one
INSERT INTO team_members (
  profile_id,
  user_id,
  company_id,
  manager_id,
  position,
  department,
  employment_status,
  hire_date
)
SELECT 
  p.id,
  p.user_id,
  '28eef186-2734-4c06-ae5f-b80de7f28da9'::uuid,
  '28eef186-2734-4c06-ae5f-b80de7f28da9'::uuid,
  'Sales Representative',
  'Sales',
  'active',
  CURRENT_DATE
FROM profiles p
WHERE p.user_role = 'sales_rep'
  AND p.manager_id = '28eef186-2734-4c06-ae5f-b80de7f28da9'
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.profile_id = p.id
  );

-- Step 3: Update existing trigger to properly handle manager vs company distinction
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
      tartan_company_profile_id,  -- manager_id points to the manager's profile
      tartan_manager_user_id,     -- created_by points to the manager's user_id
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
      tartan_company_profile_id,  -- company_id = the company profile
      tartan_company_profile_id,  -- manager_id = the manager's profile (same as company owner)
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

-- Step 4: Update RLS policies to grant managers access to team data

-- Drop existing restrictive policies on leads
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

-- Create new policies that allow managers to see team data
CREATE POLICY "Users can view leads they own or manage"
  ON leads FOR SELECT
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert leads for their company"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = auth.uid() OR
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update leads they own or manage"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leads they own or manage"
  ON leads FOR DELETE
  TO authenticated
  USING (
    company_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Update deals policies similarly
DROP POLICY IF EXISTS "Users can view own deals" ON deals;
DROP POLICY IF EXISTS "Users can insert own deals" ON deals;
DROP POLICY IF EXISTS "Users can update own deals" ON deals;
DROP POLICY IF EXISTS "Users can delete own deals" ON deals;

CREATE POLICY "Users can view deals they own or manage"
  ON deals FOR SELECT
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deals for their company"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = auth.uid() OR
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deals they own or manage"
  ON deals FOR UPDATE
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete deals they own or manage"
  ON deals FOR DELETE
  TO authenticated
  USING (
    company_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Update appointments policies
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON appointments;

CREATE POLICY "Users can view appointments they own or manage"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert appointments for their company"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = auth.uid() OR
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update appointments they own or manage"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = auth.uid() OR 
    assigned_rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete appointments they own or manage"
  ON appointments FOR DELETE
  TO authenticated
  USING (
    company_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Update commissions policies
DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can insert own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can update own commissions" ON commissions;

CREATE POLICY "Users can view commissions they own or manage"
  ON commissions FOR SELECT
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    rep_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert commissions for their company"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = auth.uid() OR
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update commissions they own or manage"
  ON commissions FOR UPDATE
  TO authenticated
  USING (
    company_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = auth.uid() OR
    company_id IN (
      SELECT manager_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Update team_members policies to allow managers to view their reports
DROP POLICY IF EXISTS "Users can view team members in their company" ON team_members;

CREATE POLICY "Managers can view their team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    profile_id = auth.uid() OR
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );
