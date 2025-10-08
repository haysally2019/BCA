/*
  # Fix profiles UPDATE policy
  
  1. Changes
    - Drop the existing "Users can update own profile" policy
    - Create a new correct policy that only checks user_id = auth.uid()
  
  2. Issue
    - The current policy has `(id = auth.uid()) OR (user_id = auth.uid())`
    - The `id` column is the profile's primary key, NOT the auth user ID
    - This causes the policy to fail and prevents users from updating their own profiles
    - Only `user_id` should be checked against auth.uid()
  
  3. Fix
    - Remove the incorrect `id = auth.uid()` check
    - Keep only `user_id = auth.uid()` which correctly identifies the user's profile
*/

-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create the correct policy
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
