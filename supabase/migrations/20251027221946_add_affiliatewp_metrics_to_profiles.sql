/*
  # Add AffiliateWP Metrics to Profiles

  1. Changes
    - Add `affiliatewp_earnings` column to track total earnings from AffiliateWP
    - Add `affiliatewp_unpaid_earnings` column to track unpaid earnings
    - Add `affiliatewp_referrals` column to track total referrals count
    - Add `affiliatewp_visits` column to track total visits count
    - Add `last_metrics_sync` column to track when metrics were last synced
    
  2. Purpose
    - Enable real-time display of AffiliateWP metrics (Paid, Unpaid, Rate, Visits) for all sales reps
    - Sync data from AffiliateWP API to local database for faster access
*/

-- Add metrics columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliatewp_earnings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN affiliatewp_earnings DECIMAL(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliatewp_unpaid_earnings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN affiliatewp_unpaid_earnings DECIMAL(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliatewp_referrals'
  ) THEN
    ALTER TABLE profiles ADD COLUMN affiliatewp_referrals INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliatewp_visits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN affiliatewp_visits INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_metrics_sync'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_metrics_sync TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_affiliatewp_id ON profiles(affiliatewp_id) WHERE affiliatewp_id IS NOT NULL;
