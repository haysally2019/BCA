/*
  # Add Lead Attribution Tracking for AffiliateWP

  1. Schema Changes
    - Add `referred_by_affiliate_id` column to leads table
    - Add `referral_source` column to track where the lead came from
    - Add `referral_url` column to store the original affiliate URL

  2. Indexes
    - Add index on referred_by_affiliate_id for efficient queries

  3. Security
    - No RLS changes needed, uses existing policies

  4. Purpose
    - Enable attribution of leads to specific affiliates
    - Track conversion rates from affiliate referrals to closed deals
    - Provide analytics on which affiliates generate the best leads
*/

-- Add attribution columns to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'referred_by_affiliate_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN referred_by_affiliate_id int;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN referral_source text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'referral_url'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN referral_url text;
  END IF;
END $$;

-- Add index for efficient queries on referred_by_affiliate_id
CREATE INDEX IF NOT EXISTS idx_leads_referred_by_affiliate
  ON public.leads (referred_by_affiliate_id);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.referred_by_affiliate_id IS 'AffiliateWP affiliate ID that referred this lead';
COMMENT ON COLUMN public.leads.referral_source IS 'Source of the referral (e.g., affiliate_link, direct, organic)';
COMMENT ON COLUMN public.leads.referral_url IS 'Original URL with affiliate tracking parameters';
