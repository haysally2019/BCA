/*
  # Fix Profiles RLS Policy - Correct Table Reference

  ## Issue
  The policy needs to reference the outer table's manager_id/created_by columns,
  not the subquery's table columns. We need to use a different alias to make
  the reference clear.

  ## Solution
  Use explicit table references in the EXISTS subquery to avoid ambiguity.

  ## Changes
  1. Drop and recreate the policy with explicit table references
  2. Use clear aliases to distinguish between the profiles being inserted
     and the profiles being checked for existence
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Service role can create managed profiles" ON profiles;

-- Recreate with explicit outer table reference
CREATE POLICY "Service role can create managed profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if manager_id references an existing profile
    (
      manager_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM profiles existing_profile 
        WHERE existing_profile.id = profiles.manager_id
      )
    )
    OR
    -- Check if created_by references an existing profile  
    (
      created_by IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM profiles existing_profile 
        WHERE existing_profile.id = profiles.created_by
      )
    )
    -- And ensure user is not creating their own profile
    AND user_id != auth.uid()
  );

COMMENT ON POLICY "Service role can create managed profiles" ON profiles IS
  'Allows Edge Functions to create team member profiles when manager_id or created_by references an existing profile. Prevents self-profile creation.';
