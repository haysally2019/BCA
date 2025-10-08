/*
  # Add AffiliateWP ID to profiles table

  1. Schema Changes
    - Add `affiliatewp_id` column to `profiles` table
    - Column is nullable (not all users are affiliates)
    - Add unique constraint to prevent duplicate AffiliateWP IDs
    - Add index for performance

  2. Security
    - No RLS changes needed (inherits existing policies)
    - Unique constraint ensures data integrity

  3. Notes
    - This enables linking sales reps to their AffiliateWP accounts
    - Allows for proper commission tracking and separation
*/

-- Add affiliatewp_id column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliatewp_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN affiliatewp_id integer;
  END IF;
END $$;

-- Add unique constraint to prevent duplicate AffiliateWP IDs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_affiliatewp_id_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_affiliatewp_id_key UNIQUE (affiliatewp_id);
  END IF;
END $$;

-- Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_profiles_affiliatewp_id'
  ) THEN
    CREATE INDEX idx_profiles_affiliatewp_id ON profiles (affiliatewp_id);
  END IF;
END $$;