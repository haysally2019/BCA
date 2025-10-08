/*
  # Add must_change_password flag to profiles table

  1. Changes
    - Add `must_change_password` boolean column to profiles table
    - Default value is false
    - This provides a database-backed fallback for the user_metadata flag

  2. Purpose
    - Ensures password change requirement persists even if user metadata is not updated
    - Provides reliable tracking of password change status
    - Acts as a fallback when user_metadata checks fail
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE profiles ADD COLUMN must_change_password boolean DEFAULT false;
  END IF;
END $$;