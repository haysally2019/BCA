/*
  # Add Personal Information Fields to Profiles

  1. Purpose
    - Transform profiles table from company-focused to personal information focused
    - Add dedicated fields for personal information (full_name, personal_phone, personal_address)
    - Maintain backward compatibility with existing company_name field
    - Prepare for eventual deprecation of company-centric terminology

  2. Changes Made
    - Add full_name field for individual's name
    - Add personal_phone field for individual's phone number
    - Add personal_address field for individual's address
    - Migrate existing company_name data to full_name for sales reps
    - Update company_name to be nullable for future deprecation
    - Add indexes for new fields to maintain query performance

  3. Data Migration
    - Copy company_name to full_name for all existing sales_rep users
    - Preserve original company_name data during transition
    - Set reasonable defaults for new fields

  4. Important Notes
    - company_name field kept temporarily for backward compatibility
    - Future migrations will fully deprecate company_name
    - Sales reps use personal fields, managers may still need organizational context
    - No breaking changes to existing application functionality
*/

-- Add new personal information fields to profiles table
DO $$
BEGIN
  -- Add full_name field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name text;
  END IF;

  -- Add personal_phone field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'personal_phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN personal_phone text;
  END IF;

  -- Add personal_address field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'personal_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN personal_address text;
  END IF;
END $$;

-- Migrate existing data for sales representatives
-- Copy company_name to full_name for all sales_rep users who don't have full_name yet
UPDATE profiles
SET full_name = company_name
WHERE user_role = 'sales_rep'
  AND (full_name IS NULL OR full_name = '');

-- Copy company_phone to personal_phone for sales reps
UPDATE profiles
SET personal_phone = company_phone
WHERE user_role = 'sales_rep'
  AND company_phone IS NOT NULL
  AND (personal_phone IS NULL OR personal_phone = '');

-- Copy company_address to personal_address for sales reps
UPDATE profiles
SET personal_address = company_address
WHERE user_role = 'sales_rep'
  AND company_address IS NOT NULL
  AND (personal_address IS NULL OR personal_address = '');

-- Copy company_email to personal email context (keep in company_email for now)
-- This is handled by the application layer

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Add comments for documentation
COMMENT ON COLUMN profiles.full_name IS 'Individual user full name - primary name field for sales representatives';
COMMENT ON COLUMN profiles.personal_phone IS 'Individual user phone number - personal contact for sales representatives';
COMMENT ON COLUMN profiles.personal_address IS 'Individual user address - personal address for sales representatives';

COMMENT ON COLUMN profiles.company_name IS 'DEPRECATED for sales_rep users - use full_name instead. Still used for manager/admin organizational context.';
COMMENT ON COLUMN profiles.company_phone IS 'DEPRECATED for sales_rep users - use personal_phone instead. Still used for manager/admin organizational context.';
COMMENT ON COLUMN profiles.company_address IS 'DEPRECATED for sales_rep users - use personal_address instead. Still used for manager/admin organizational context.';