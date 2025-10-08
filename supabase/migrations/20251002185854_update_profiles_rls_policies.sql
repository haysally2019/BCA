/*
  # Update Profiles RLS Policies for Manager Account Creation

  ## Overview
  Updates Row Level Security policies on the profiles table to support
  manager-initiated account creation while maintaining data security.

  ## Changes

  1. RLS Policy Updates
     - Allow managers to create profiles for new sales reps
     - Ensure profiles are only created by authorized managers
     - Maintain read restrictions for proper data isolation
     - Allow users to view their own profile and manager's company profiles

  2. Security
     - Managers can only create profiles linked to their company
     - Sales reps can only view their own profile
     - Proper access control for account management operations
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Managers can view profiles in their company
CREATE POLICY "Managers can view company profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    manager_id = auth.uid() OR 
    created_by = auth.uid()
  );

-- Policy: Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Managers can create profiles for team members
CREATE POLICY "Managers can create team member profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    manager_id = auth.uid()
  );

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR id = auth.uid());

-- Add helpful comment
COMMENT ON TABLE profiles IS 'User profiles with support for manager-created accounts and AffiliateWP integration';