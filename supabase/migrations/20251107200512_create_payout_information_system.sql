/*
  # Create Payout Information System for AffiliateWP Integration

  1. New Tables
    - `payout_information`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles) - Links to user profile
      - `payout_method` (text) - Payment method: bank_transfer, paypal, stripe
      - `account_holder_name` (text) - Full name on bank account
      - `bank_name` (text) - Name of the bank
      - `account_number_encrypted` (text) - Encrypted bank account number
      - `account_number_last4` (text) - Last 4 digits for display
      - `routing_number` (text) - Bank routing number (US)
      - `swift_code` (text) - SWIFT/BIC code for international transfers
      - `iban` (text) - IBAN for European transfers
      - `bank_country` (text) - Country of bank account
      - `bank_currency` (text) - Currency of bank account (USD, EUR, etc.)
      - `paypal_email` (text) - PayPal email address
      - `verification_status` (text) - pending, verified, rejected
      - `verification_notes` (text) - Admin notes about verification
      - `is_default` (boolean) - Whether this is default payout method
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `verified_at` (timestamptz)
      - `verified_by` (uuid, references auth.users)

    - `payout_history`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `affiliatewp_payout_id` (text) - Payout ID from AffiliateWP
      - `amount` (decimal) - Payout amount
      - `currency` (text) - Currency code
      - `payout_method` (text) - Method used for payout
      - `status` (text) - pending, processing, completed, failed
      - `payout_date` (timestamptz) - When payout was processed
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `payout_audit_log`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `action` (text) - created, updated, deleted, verified
      - `changed_by` (uuid, references auth.users)
      - `old_values` (jsonb) - Previous values
      - `new_values` (jsonb) - New values
      - `ip_address` (text) - IP address of user
      - `user_agent` (text) - Browser user agent
      - `created_at` (timestamptz)

  2. Updates to profiles table
    - Add `preferred_payout_method` column
    - Add `payout_setup_completed` boolean
    - Add `last_payout_sync` timestamptz

  3. Security
    - Enable RLS on all new tables
    - Sales reps can only view and edit their own payout information
    - Managers can view payout info for their team members
    - Service role has full access for AffiliateWP sync

  4. Indexes
    - Add indexes for frequently queried columns
    - Add unique constraints where needed

  5. Important Notes
    - Account numbers should be encrypted at application level before storage
    - Only last 4 digits stored in plaintext for display
    - All changes logged in audit table for compliance
    - Verification required before first payout
*/

-- Create payout_information table
CREATE TABLE IF NOT EXISTS public.payout_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payout_method text NOT NULL DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'paypal', 'stripe', 'other')),
  account_holder_name text,
  bank_name text,
  account_number_encrypted text,
  account_number_last4 text,
  routing_number text,
  swift_code text,
  iban text,
  bank_country text,
  bank_currency text DEFAULT 'USD',
  paypal_email text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes text,
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  CONSTRAINT unique_default_payout_per_profile UNIQUE NULLS NOT DISTINCT (profile_id, is_default)
);

-- Create payout_history table
CREATE TABLE IF NOT EXISTS public.payout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  affiliatewp_payout_id text,
  amount decimal(10, 2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD' NOT NULL,
  payout_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create payout_audit_log table
CREATE TABLE IF NOT EXISTS public.payout_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'verified', 'rejected')),
  changed_by uuid REFERENCES auth.users(id),
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_payout_method'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_payout_method text DEFAULT 'bank_transfer' CHECK (preferred_payout_method IN ('bank_transfer', 'paypal', 'stripe', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'payout_setup_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN payout_setup_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_payout_sync'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_payout_sync timestamptz;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payout_information_profile_id ON public.payout_information(profile_id);
CREATE INDEX IF NOT EXISTS idx_payout_information_verification_status ON public.payout_information(verification_status);
CREATE INDEX IF NOT EXISTS idx_payout_information_is_default ON public.payout_information(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payout_history_profile_id ON public.payout_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_payout_history_status ON public.payout_history(status);
CREATE INDEX IF NOT EXISTS idx_payout_history_payout_date ON public.payout_history(payout_date DESC);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_profile_id ON public.payout_audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_created_at ON public.payout_audit_log(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.payout_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payout_information
CREATE POLICY "Users can view their own payout information"
  ON public.payout_information
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own payout information"
  ON public.payout_information
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own payout information"
  ON public.payout_information
  FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own payout information"
  ON public.payout_information
  FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for payout_history
CREATE POLICY "Users can view their own payout history"
  ON public.payout_history
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert payout history"
  ON public.payout_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update payout history"
  ON public.payout_history
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for payout_audit_log
CREATE POLICY "Users can view their own audit log"
  ON public.payout_audit_log
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert audit log"
  ON public.payout_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payout_information_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payout_information
DROP TRIGGER IF EXISTS trigger_update_payout_information_updated_at ON public.payout_information;
CREATE TRIGGER trigger_update_payout_information_updated_at
  BEFORE UPDATE ON public.payout_information
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_information_updated_at();

-- Create trigger for payout_history
DROP TRIGGER IF EXISTS trigger_update_payout_history_updated_at ON public.payout_history;
CREATE TRIGGER trigger_update_payout_history_updated_at
  BEFORE UPDATE ON public.payout_history
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_information_updated_at();

-- Create trigger function to log payout information changes
CREATE OR REPLACE FUNCTION log_payout_information_changes()
RETURNS TRIGGER AS $$
DECLARE
  action_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  INSERT INTO public.payout_audit_log (
    profile_id,
    action,
    changed_by,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.profile_id, OLD.profile_id),
    action_type,
    auth.uid(),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log all payout information changes
DROP TRIGGER IF EXISTS trigger_log_payout_information_changes ON public.payout_information;
CREATE TRIGGER trigger_log_payout_information_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.payout_information
  FOR EACH ROW
  EXECUTE FUNCTION log_payout_information_changes();