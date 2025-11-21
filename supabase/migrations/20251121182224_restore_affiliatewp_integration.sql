/*
  # Restore AffiliateWP Integration

  1. New Tables
    - `app_settings` - Stores AffiliateWP API credentials and configuration
    - `affiliate_referrals` - Stores referrals synced from AffiliateWP
    - `affiliate_metrics_daily` - Stores daily aggregated metrics from AffiliateWP
    - `affiliatewp_sync_log` - Tracks sync operations and errors

  2. Updates
    - Add AffiliateWP columns back to profiles table

  3. Security
    - Enable RLS on all tables
    - Add policies for appropriate access control
*/

-- ============================================================================
-- App Settings Table (for storing API credentials)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  encrypted_value text,
  description text,
  is_sensitive boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage app settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- Affiliate Referrals Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliatewp_referral_id bigint UNIQUE NOT NULL,
  affiliate_id integer NOT NULL,
  profile_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  reference text,
  context text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'unpaid', 'paid', 'rejected')),
  custom jsonb DEFAULT '{}'::jsonb,
  date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all referrals"
  ON public.affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- Affiliate Metrics Daily Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id integer NOT NULL,
  profile_id uuid REFERENCES auth.users(id),
  date date NOT NULL,
  visits integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  conversions integer DEFAULT 0,
  referrals integer DEFAULT 0,
  earnings numeric DEFAULT 0,
  paid_earnings numeric DEFAULT 0,
  unpaid_earnings numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(affiliate_id, date)
);

ALTER TABLE public.affiliate_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
  ON public.affiliate_metrics_daily
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all metrics"
  ON public.affiliate_metrics_daily
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- AffiliateWP Sync Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliatewp_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id),
  sync_type text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  records_processed integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.affiliatewp_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON public.affiliatewp_sync_log
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR profile_id IS NULL);

CREATE POLICY "Admins can view all sync logs"
  ON public.affiliatewp_sync_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- Add AffiliateWP columns to profiles
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS affiliatewp_id integer,
ADD COLUMN IF NOT EXISTS unpaid_earnings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_lifetime_earnings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_affiliatewp_sync timestamptz;

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_profile_id ON public.affiliate_referrals(profile_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_metrics_affiliate_date ON public.affiliate_metrics_daily(affiliate_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_profile_id ON public.affiliate_metrics_daily(profile_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_profile_id ON public.affiliatewp_sync_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON public.affiliatewp_sync_log(status);
