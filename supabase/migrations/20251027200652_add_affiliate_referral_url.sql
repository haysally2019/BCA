/*
  # Add Affiliate Referral URL Field

  1. Changes
    - Add `affiliate_referral_url` column to profiles table
    - Store the unique affiliate referral URL for each sales rep

  2. Purpose
    - Allow sales reps to view and share their unique affiliate tracking URL
    - URL format: https://bluecollaracademy.info/?ref={affiliate_id}
*/

-- Add affiliate_referral_url column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliate_referral_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN affiliate_referral_url text;
  END IF;
END $$;