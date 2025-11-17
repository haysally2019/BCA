/*
  # Restore Profiles Table Structure
  
  1. Changes
    - Add missing columns to profiles table:
      - user_role (enum: sales_rep, manager, admin)
      - company_id (for multi-tenancy)
      - company_name, phone_number, address
      - affiliatewp_id, affiliatewp_status
      - must_change_password
      - unpaid_earnings, paid_lifetime_earnings, referral_url
    
  2. Data Migration
    - Set gmartinez@tartanbuildersinc.com as admin role
    - Set all other users as sales_rep role
    - Set default company_id for gmartinez as 'tartan-builders'
  
  3. Security
    - Maintain existing RLS policies
*/

-- Add user_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('sales_rep', 'manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_role user_role DEFAULT 'sales_rep',
ADD COLUMN IF NOT EXISTS company_id text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS affiliatewp_id integer,
ADD COLUMN IF NOT EXISTS affiliatewp_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS unpaid_earnings numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_lifetime_earnings numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_url text;

-- Set gmartinez@tartanbuildersinc.com as admin
UPDATE profiles
SET 
  user_role = 'admin',
  company_id = 'tartan-builders',
  company_name = 'Tartan Builders Inc'
WHERE user_id = '173a9b7a-d5ab-402e-8225-0e8263dffcc5';

-- Set all other users as sales_rep and assign to tartan-builders company
UPDATE profiles
SET 
  user_role = 'sales_rep',
  company_id = 'tartan-builders',
  company_name = 'Tartan Builders Inc'
WHERE user_id != '173a9b7a-d5ab-402e-8225-0e8263dffcc5'
  AND user_role IS NULL;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);