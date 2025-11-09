/*
  # Create AffiliateWP-Centric Tables and Align Schema

  1. New Tables
    - `affiliate_metrics_daily` - Daily metrics for fast dashboard queries
      - `id` (bigserial, primary key)
      - `affiliate_id` (int, not null) - matches existing affiliates.affiliate_id
      - `date` (date, not null)
      - `visits` (int, default 0)
      - `referrals` (int, default 0)
      - `earnings` (numeric(12,2), default 0)
      - `unpaid_earnings` (numeric(12,2), default 0)
      - Unique constraint on (affiliate_id, date)

    - `affiliate_referrals` - Raw referrals for drilldowns
      - `id` (bigserial, primary key)
      - `affiliate_id` (int, not null) - matches existing affiliates.affiliate_id
      - `referral_id` (text, not null)
      - `status` (text) - unpaid|paid|rejected
      - `amount` (numeric(12,2), default 0)
      - `description` (text)
      - `origin_url` (text)
      - `order_id` (text)
      - `created_at` (timestamptz)

  2. Schema Changes
    - Add `affiliatewp_id` column to existing affiliates table as text
    - Add unique constraint on affiliatewp_id
    - Drop foreign key constraint on commission_entries.affiliate_id
    - Alter commission_entries.affiliate_id to type text
    - Recreate foreign key to affiliates(affiliatewp_id)

  3. Indexes
    - Performance indexes for affiliate queries
    - Index on metrics by affiliate_id and date
    - Index on referrals by affiliate_id and created_at

  4. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to read their data

  5. Important Notes
    - Existing affiliates table already exists with affiliate_id as integer
    - We add affiliatewp_id as text to map to AffiliateWP string IDs
    - commission_entries.affiliate_id becomes text to reference affiliatewp_id
*/

-- ============================================================================
-- Add affiliatewp_id column to existing affiliates table
-- ============================================================================

DO $$
BEGIN
  -- Add affiliatewp_id as text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliates' AND column_name = 'affiliatewp_id'
  ) THEN
    ALTER TABLE public.affiliates ADD COLUMN affiliatewp_id text;
  END IF;

  -- Populate affiliatewp_id from affiliate_id (convert int to text)
  UPDATE public.affiliates 
  SET affiliatewp_id = affiliate_id::text 
  WHERE affiliatewp_id IS NULL;

  -- Add unique constraint on affiliatewp_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'affiliates_affiliatewp_id_key'
  ) THEN
    ALTER TABLE public.affiliates 
      ADD CONSTRAINT affiliates_affiliatewp_id_key UNIQUE (affiliatewp_id);
  END IF;

  -- Make affiliatewp_id not null after populating
  ALTER TABLE public.affiliates 
    ALTER COLUMN affiliatewp_id SET NOT NULL;
END $$;

-- ============================================================================
-- Add additional columns to affiliates if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliates' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.affiliates ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliates' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.affiliates ADD COLUMN company_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliates' AND column_name = 'user_role'
  ) THEN
    ALTER TABLE public.affiliates ADD COLUMN user_role text;
  END IF;
END $$;

-- ============================================================================
-- Create affiliate_metrics_daily table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_metrics_daily (
  id bigserial PRIMARY KEY,
  affiliate_id int NOT NULL,
  date date NOT NULL,
  visits int DEFAULT 0,
  referrals int DEFAULT 0,
  earnings numeric(12,2) DEFAULT 0,
  unpaid_earnings numeric(12,2) DEFAULT 0,
  UNIQUE (affiliate_id, date)
);

-- ============================================================================
-- Create affiliate_referrals table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id bigserial PRIMARY KEY,
  affiliate_id int NOT NULL,
  referral_id text NOT NULL,
  status text,
  amount numeric(12,2) DEFAULT 0,
  description text,
  origin_url text,
  order_id text,
  created_at timestamptz
);

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_affiliates_affiliatewp_id
  ON public.affiliates (affiliatewp_id);

CREATE INDEX IF NOT EXISTS idx_metrics_aff_date
  ON public.affiliate_metrics_daily (affiliate_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_aff_created
  ON public.affiliate_referrals (affiliate_id, created_at DESC);

-- ============================================================================
-- Alter commission_entries.affiliate_id to text type
-- ============================================================================

DO $$
BEGIN
  -- Drop existing foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'commission_entries' 
    AND constraint_name = 'commission_entries_affiliate_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.commission_entries
      DROP CONSTRAINT commission_entries_affiliate_id_fkey;
  END IF;

  -- Change column type to text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_entries' AND column_name = 'affiliate_id'
  ) THEN
    ALTER TABLE public.commission_entries
      ALTER COLUMN affiliate_id TYPE text USING affiliate_id::text;
  END IF;

  -- Add foreign key to affiliates table via affiliatewp_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'commission_entries' 
    AND constraint_name = 'commission_entries_affiliate_id_fkey_text'
  ) THEN
    ALTER TABLE public.commission_entries
      ADD CONSTRAINT commission_entries_affiliate_id_fkey_text
      FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(affiliatewp_id);
  END IF;
END $$;

-- ============================================================================
-- Enable RLS on new tables
-- ============================================================================

ALTER TABLE public.affiliate_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create RLS policies for new tables
-- ============================================================================

-- Affiliate metrics daily policies
CREATE POLICY "Authenticated users can view metrics"
  ON public.affiliate_metrics_daily FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert metrics"
  ON public.affiliate_metrics_daily FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update metrics"
  ON public.affiliate_metrics_daily FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Affiliate referrals policies
CREATE POLICY "Authenticated users can view referrals"
  ON public.affiliate_referrals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert referrals"
  ON public.affiliate_referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update referrals"
  ON public.affiliate_referrals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);