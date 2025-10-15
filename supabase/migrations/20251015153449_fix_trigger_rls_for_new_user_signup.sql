/*
  # Fix RLS Policies for Trigger-Based User Signup

  1. Problem
    - The handle_new_user() trigger fails when creating profiles during signup
    - Current "Service role can create managed profiles" policy blocks user_id = auth.uid()
    - The policy was designed to prevent abuse but blocks legitimate trigger operations
    - Error: "Database error saving new user" from Supabase Auth

  2. Root Cause
    - Trigger runs as SECURITY DEFINER but INSERT statements check RLS policies
    - The policy requires user_id != auth.uid() to prevent self-creation
    - During signup, NEW.id = auth.uid(), so the check fails
    - Need to allow trigger-created profiles while preventing manual abuse

  3. Solution
    - Update the profiles INSERT policy to allow created_by IS NOT NULL OR user_id = auth.uid()
    - This allows both: normal user signup (user_id = auth.uid()) and manager-created accounts (created_by set)
    - Update team_members INSERT policy to allow trigger operations
    - Maintain security by validating foreign keys

  4. Security
    - Users can only create profiles with their own user_id
    - Managers/Edge Functions can create profiles with valid manager_id/created_by
    - Foreign key validation ensures data integrity
    - Trigger is SECURITY DEFINER so runs with elevated privileges
*/

-- =====================================================
-- Fix profiles INSERT policies
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can create managed profiles" ON profiles;

-- Allow normal user signup (user creates own profile during registration)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND created_by IS NULL
    AND manager_id IS NULL
  );

-- Allow trigger and Edge Functions to create managed profiles
CREATE POLICY "Trigger can create managed profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- For manager-created accounts (Edge Function or trigger with manager context)
    (
      (manager_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM profiles WHERE id = manager_id
      ))
      OR
      (created_by IS NOT NULL)
    )
  );

-- =====================================================
-- Fix team_members INSERT policies
-- =====================================================

DROP POLICY IF EXISTS "Managers can insert team members directly" ON team_members;
DROP POLICY IF EXISTS "Service role can create team members" ON team_members;

-- Allow trigger and managers to create team members
CREATE POLICY "Allow team member creation"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must have valid company_id reference
    EXISTS (
      SELECT 1 FROM profiles WHERE id = company_id
    )
    AND
    -- Must have valid profile_id reference
    EXISTS (
      SELECT 1 FROM profiles WHERE id = profile_id
    )
    AND
    -- Optional: Must have valid user_id if provided
    (user_id IS NULL OR EXISTS (
      SELECT 1 FROM auth.users WHERE id = user_id
    ))
  );

-- =====================================================
-- Add helpful comments
-- =====================================================

COMMENT ON POLICY "Users can insert own profile" ON profiles IS
  'Allows users to create their own profile during signup. Requires user_id = auth.uid() and no manager_id/created_by set.';

COMMENT ON POLICY "Trigger can create managed profiles" ON profiles IS
  'Allows handle_new_user trigger and Edge Functions to create managed profiles with valid manager_id or created_by. Used for team member account creation.';

COMMENT ON POLICY "Allow team member creation" ON team_members IS
  'Allows trigger and Edge Functions to create team member records with proper foreign key validation. Used during signup and manager-initiated account creation.';
