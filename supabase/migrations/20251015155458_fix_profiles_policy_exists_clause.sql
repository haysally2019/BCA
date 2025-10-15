/*
  # Fix Profiles Policy EXISTS Clause Bug

  1. Problem
    - The "Trigger can create managed profiles" policy has a bug in the EXISTS clause
    - It checks: profiles_1.id = profiles_1.manager_id (comparing same table columns)
    - Should check: profiles_1.id = profiles.manager_id (outer table's manager_id)
    - This causes the policy to always fail validation

  2. Solution
    - Drop and recreate the policy with correct reference to outer table
    - Use explicit table reference to avoid ambiguity
    - Properly validate that manager_id points to an existing profile

  3. Changes
    - Fix the EXISTS clause to properly reference the outer table's manager_id
    - Maintain same security logic but with correct SQL
*/

DROP POLICY IF EXISTS "Trigger can create managed profiles" ON profiles;

CREATE POLICY "Trigger can create managed profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- For manager-created accounts (Edge Function or trigger with manager context)
    -- Check that manager_id references an existing profile
    (
      manager_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM profiles p 
        WHERE p.id = profiles.manager_id
      )
    )
    OR
    -- Or created_by is set (for Edge Function context)
    (created_by IS NOT NULL)
  );

COMMENT ON POLICY "Trigger can create managed profiles" ON profiles IS
  'Allows handle_new_user trigger and Edge Functions to create managed profiles with valid manager_id or created_by. Manager_id must reference an existing profile.';
