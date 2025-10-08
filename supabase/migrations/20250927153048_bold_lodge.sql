/*
  # Add user_type column to profiles table

  1. Changes
    - Add `user_type` column to `profiles` table
    - Set default value to 'sales_rep'
    - Add check constraint for valid values
    - Update existing records to have default value

  2. Security
    - No changes to RLS policies needed
*/

-- Add user_type column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'sales_rep' 
CHECK (user_type IN ('management', 'sales_rep'));

-- Update any existing records to have the default value
UPDATE profiles 
SET user_type = 'sales_rep' 
WHERE user_type IS NULL;