/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current RLS policies on profiles table are causing infinite recursion
    - Policies are calling functions that query the profiles table itself
    - This creates a circular dependency when accessing profiles

  2. Solution
    - Simplify profiles RLS policies to avoid circular references
    - Use direct user ID comparisons instead of helper functions
    - Remove policies that reference other profiles or company relationships
    - Keep only essential policies for user access control

  3. Changes
    - Drop all existing problematic policies on profiles table
    - Create new simplified policies that don't cause recursion
    - Ensure users can only access their own profile data
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Managers can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new simplified policies that avoid recursion
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());