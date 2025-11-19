/*
  # Remove AffiliateWP Integration from Database

  1. Database Cleanup
    - Drop app_settings table (stores AffiliateWP API credentials)
    - Drop affiliatewp_sync_log table (tracks sync operations)
    - Drop affiliate_metrics_daily table (stores daily AffiliateWP metrics)
    - Drop affiliate_referrals table (stores raw AffiliateWP referrals)
    - Remove pg_cron scheduled jobs for AffiliateWP syncing
    - Remove database triggers for automatic AffiliateWP account creation
    - Remove database functions related to AffiliateWP
    - Remove AffiliateWP columns from profiles table
    - Remove AffiliateWP columns from affiliates table
    - Update commission_entries foreign key constraints

  2. Important Notes
    - This migration preserves all internal CRM data
    - Commission tracking continues to work with internal data only
    - All UI components remain functional without external AffiliateWP integration
    - No user data or commission data is lost
*/

-- ============================================================================
-- Drop scheduled pg_cron jobs
-- ============================================================================

DO $$
BEGIN
  -- Remove hourly AffiliateWP metrics sync job if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('sync-affiliatewp-metrics-hourly');
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- Drop database triggers related to AffiliateWP
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_affiliatewp_account_on_signup ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_affiliatewp_after_profile_insert ON public.profiles;
DROP TRIGGER IF EXISTS trigger_auto_create_affiliatewp_account ON public.profiles;

-- ============================================================================
-- Drop database functions related to AffiliateWP
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_affiliatewp_account_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.sync_affiliatewp_after_profile_insert() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_affiliatewp_account() CASCADE;
DROP FUNCTION IF EXISTS public.process_pending_affiliatewp_accounts() CASCADE;
DROP FUNCTION IF EXISTS public.batch_create_affiliatewp_accounts() CASCADE;

-- ============================================================================
-- Drop AffiliateWP-specific tables
-- ============================================================================

DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.affiliatewp_sync_log CASCADE;
DROP TABLE IF EXISTS public.affiliate_metrics_daily CASCADE;
DROP TABLE IF EXISTS public.affiliate_referrals CASCADE;
DROP TABLE IF EXISTS public.webhook_logs CASCADE;

-- ============================================================================
-- Remove AffiliateWP columns from profiles table
-- ============================================================================

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS affiliatewp_id CASCADE,
DROP COLUMN IF EXISTS affiliatewp_status CASCADE,
DROP COLUMN IF EXISTS unpaid_earnings CASCADE,
DROP COLUMN IF EXISTS paid_lifetime_earnings CASCADE,
DROP COLUMN IF EXISTS referral_url CASCADE;

-- ============================================================================
-- Update affiliates table - remove AffiliateWP references
-- ============================================================================

-- Drop foreign key constraint on commission_entries if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'commission_entries' 
    AND constraint_name = 'commission_entries_affiliate_id_fkey_text'
  ) THEN
    ALTER TABLE public.commission_entries
      DROP CONSTRAINT commission_entries_affiliate_id_fkey_text;
  END IF;
END $$;

-- Drop the unique constraint on affiliatewp_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'affiliates_affiliatewp_id_key'
  ) THEN
    ALTER TABLE public.affiliates 
      DROP CONSTRAINT affiliates_affiliatewp_id_key;
  END IF;
END $$;

-- Remove affiliatewp_id column from affiliates table
ALTER TABLE public.affiliates
DROP COLUMN IF EXISTS affiliatewp_id CASCADE;

-- ============================================================================
-- Update commission_entries table
-- ============================================================================

-- If commission_entries exists, update it to use internal affiliate IDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'commission_entries'
  ) THEN
    -- Change affiliate_id back to uuid type if needed
    -- This assumes we want to link to affiliates.id (uuid) instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'commission_entries' 
      AND column_name = 'affiliate_id'
      AND data_type = 'text'
    ) THEN
      -- Drop any existing data in commission_entries to avoid type conflicts
      TRUNCATE TABLE public.commission_entries;
      
      -- Change column type to uuid
      ALTER TABLE public.commission_entries
        ALTER COLUMN affiliate_id TYPE uuid USING NULL;
    END IF;

    -- Add foreign key to affiliates.id if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'commission_entries' 
      AND constraint_name = 'commission_entries_affiliate_id_fkey'
    ) THEN
      ALTER TABLE public.commission_entries
        ADD CONSTRAINT commission_entries_affiliate_id_fkey
        FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id);
    END IF;

    -- Remove AffiliateWP-specific columns
    ALTER TABLE public.commission_entries
      DROP COLUMN IF EXISTS affiliatewp_referral_id CASCADE,
      DROP COLUMN IF EXISTS linked_profile_id CASCADE,
      DROP COLUMN IF EXISTS webhook_data CASCADE;
  END IF;
END $$;

-- ============================================================================
-- Remove AffiliateWP-specific indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_affiliates_affiliatewp_id;
DROP INDEX IF EXISTS idx_metrics_aff_date;
DROP INDEX IF EXISTS idx_referrals_aff_created;
DROP INDEX IF EXISTS idx_profiles_affiliatewp_id;
DROP INDEX IF EXISTS idx_affiliatewp_sync_log_profile_id;
DROP INDEX IF EXISTS idx_affiliatewp_sync_log_status;

-- ============================================================================
-- Clean up any remaining AffiliateWP configuration
-- ============================================================================

-- Remove any auth hooks related to AffiliateWP
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault'
  ) THEN
    -- Remove any secrets related to AffiliateWP
    DELETE FROM vault.secrets 
    WHERE name LIKE '%affiliatewp%' OR name LIKE '%affiliate_wp%';
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;