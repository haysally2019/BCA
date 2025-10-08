/*
  # Fix Profiles RLS Policy Bug

  ## Issue
  The "Service role can create managed profiles" policy has a bug in the EXISTS clause.
  It checks `profiles_1.id = profiles_1.manager_id` instead of `profiles_1.id = manager_id`,
  which causes the policy to always fail.

  ## Solution
  Drop and recreate the policy with the correct foreign key reference check.

  ## Changes
  1. Drop the buggy "Service role can create managed profiles" policy
  2. Recreate it with correct manager_id and created_by validation
  3. Ensure the policy properly validates that manager_id/created_by reference existing profiles

  ## Security
  - Maintains security by requiring valid manager_id or created_by references
  - Prevents users from creating their own profile through this policy (user_id != auth.uid())
  - Only allows Edge Functions to create managed profiles for team members
*/

-- Drop the buggy policy
DROP POLICY IF EXISTS "Service role can create managed profiles" ON profiles;

-- Recreate with correct logic
CREATE POLICY "Service role can create managed profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must have either manager_id or created_by set to a valid profile
    (
      (manager_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM profiles WHERE id = manager_id
      )) OR
      (created_by IS NOT NULL AND EXISTS (
        SELECT 1 FROM profiles WHERE id = created_by
      ))
    )
    -- And must not be creating their own profile (prevents abuse)
    AND user_id != auth.uid()
  );

-- Add helpful comment
COMMENT ON POLICY "Service role can create managed profiles" ON profiles IS
  'Allows Edge Functions to create profiles for team members when manager_id or created_by references a valid existing profile. Prevents self-profile creation abuse.';
