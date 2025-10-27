/*
  # Enhance AffiliateWP Auto-Creation and Sync System

  ## Overview
  Enhances the existing AffiliateWP integration with auto-creation capabilities
  and improved sync tracking for automatic affiliate account creation during rep signup.

  ## 1. Schema Enhancements
    - Add sync tracking fields to profiles table
    - Add new columns to existing affiliatewp_sync_log table
    - Create commission rate templates table

  ## 2. New Features
    - Automatic affiliate creation during signup
    - Retry logic for failed operations
    - Sync status tracking per profile
    - Helper functions for sync management

  ## 3. Security
    - RLS policies for all new tables
    - Service role access for sync operations
*/

-- Add sync tracking fields to profiles table
DO $$
BEGIN
  -- Add affiliatewp_sync_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliatewp_sync_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN affiliatewp_sync_status text DEFAULT 'pending' 
      CHECK (affiliatewp_sync_status IN ('pending', 'syncing', 'synced', 'failed', 'manual'));
  END IF;

  -- Add last_affiliatewp_sync column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_affiliatewp_sync'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_affiliatewp_sync timestamp with time zone;
  END IF;

  -- Add affiliatewp_sync_error column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliatewp_sync_error'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN affiliatewp_sync_error text;
  END IF;

  -- Add affiliatewp_account_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'affiliatewp_account_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN affiliatewp_account_status text DEFAULT 'inactive'
      CHECK (affiliatewp_account_status IN ('active', 'inactive', 'pending', 'rejected'));
  END IF;
END $$;

-- Enhance affiliatewp_sync_log table with missing columns
DO $$
BEGIN
  -- Add sync_direction column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliatewp_sync_log' AND column_name = 'sync_direction'
  ) THEN
    ALTER TABLE public.affiliatewp_sync_log ADD COLUMN sync_direction text DEFAULT 'portal_to_affiliatewp'
      CHECK (sync_direction IN ('portal_to_affiliatewp', 'affiliatewp_to_portal', 'bidirectional'));
  END IF;

  -- Add next_retry_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliatewp_sync_log' AND column_name = 'next_retry_at'
  ) THEN
    ALTER TABLE public.affiliatewp_sync_log ADD COLUMN next_retry_at timestamp with time zone;
  END IF;

  -- Add processed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliatewp_sync_log' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.affiliatewp_sync_log ADD COLUMN processed_at timestamp with time zone;
  END IF;
END $$;

-- Create commission rate templates table
CREATE TABLE IF NOT EXISTS public.commission_rate_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    tier_level text NOT NULL DEFAULT 'standard' CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum', 'standard')),
    upfront_rate numeric(5,2) NOT NULL DEFAULT 10.00 CHECK (upfront_rate >= 0 AND upfront_rate <= 100),
    residual_rate numeric(5,2) NOT NULL DEFAULT 5.00 CHECK (residual_rate >= 0 AND residual_rate <= 100),
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on commission_rate_templates
ALTER TABLE public.commission_rate_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for commission_rate_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'commission_rate_templates' AND policyname = 'Authenticated users can view active templates'
    ) THEN
        CREATE POLICY "Authenticated users can view active templates" 
        ON public.commission_rate_templates 
        FOR SELECT 
        TO authenticated
        USING (is_active = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'commission_rate_templates' AND policyname = 'Service role has full access to templates'
    ) THEN
        CREATE POLICY "Service role has full access to templates" 
        ON public.commission_rate_templates 
        FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Insert default commission rate templates
INSERT INTO public.commission_rate_templates (name, description, tier_level, upfront_rate, residual_rate, is_default)
VALUES 
  ('Standard Affiliate', 'Default rates for new affiliates', 'standard', 10.00, 5.00, true),
  ('Bronze Tier', 'Entry level affiliate rates', 'bronze', 12.00, 6.00, false),
  ('Silver Tier', 'Mid-level affiliate rates', 'silver', 15.00, 7.50, false),
  ('Gold Tier', 'Advanced affiliate rates', 'gold', 18.00, 9.00, false),
  ('Platinum Tier', 'Premium affiliate rates', 'platinum', 20.00, 10.00, false)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_affiliatewp_sync_status ON public.profiles(affiliatewp_sync_status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_affiliatewp_sync ON public.profiles(last_affiliatewp_sync DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_affiliatewp_account_status ON public.profiles(affiliatewp_account_status);

CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_log_sync_direction ON public.affiliatewp_sync_log(sync_direction);
CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_log_processed_at ON public.affiliatewp_sync_log(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_log_next_retry ON public.affiliatewp_sync_log(next_retry_at) WHERE status = 'failed' AND retry_count < 5;

CREATE INDEX IF NOT EXISTS idx_commission_rate_templates_active ON public.commission_rate_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_commission_rate_templates_tier ON public.commission_rate_templates(tier_level);

-- Create trigger function to update profiles sync timestamp
CREATE OR REPLACE FUNCTION update_profile_affiliatewp_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile when sync log entry is successful
    IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') THEN
        UPDATE public.profiles
        SET 
            last_affiliatewp_sync = COALESCE(NEW.processed_at, NEW.updated_at, now()),
            affiliatewp_sync_status = 'synced',
            affiliatewp_sync_error = NULL,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.profile_id;
    END IF;

    -- Update profile when sync fails
    IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
        UPDATE public.profiles
        SET 
            affiliatewp_sync_status = 'failed',
            affiliatewp_sync_error = NEW.error_message,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.profile_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update profile sync status
DROP TRIGGER IF EXISTS trigger_update_profile_sync_status ON public.affiliatewp_sync_log;
CREATE TRIGGER trigger_update_profile_sync_status
    AFTER INSERT OR UPDATE ON public.affiliatewp_sync_log
    FOR EACH ROW
    WHEN (NEW.status IN ('success', 'failed'))
    EXECUTE FUNCTION update_profile_affiliatewp_sync_timestamp();

-- Create function to get pending sync operations
CREATE OR REPLACE FUNCTION get_pending_affiliatewp_syncs()
RETURNS TABLE (
    log_id uuid,
    profile_id uuid,
    user_email text,
    full_name text,
    affiliatewp_id integer,
    operation text,
    retry_count integer,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.id as log_id,
        sl.profile_id,
        p.company_email as user_email,
        p.full_name,
        sl.affiliatewp_id,
        sl.operation,
        sl.retry_count,
        sl.created_at
    FROM public.affiliatewp_sync_log sl
    INNER JOIN public.profiles p ON p.id = sl.profile_id
    WHERE sl.status IN ('pending', 'failed')
      AND (sl.next_retry_at IS NULL OR sl.next_retry_at <= now())
      AND sl.retry_count < 5
    ORDER BY sl.created_at ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retry failed syncs
CREATE OR REPLACE FUNCTION retry_failed_affiliatewp_sync(log_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    updated_count integer;
    result jsonb;
BEGIN
    UPDATE public.affiliatewp_sync_log
    SET 
        status = 'pending',
        retry_count = retry_count + 1,
        next_retry_at = now() + (retry_count + 1) * interval '5 minutes',
        error_message = NULL,
        updated_at = now()
    WHERE id = log_id_param
      AND status = 'failed'
      AND retry_count < 5;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Sync operation queued for retry',
            'log_id', log_id_param
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Sync operation not found or already retried too many times',
            'log_id', log_id_param
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get sync statistics
CREATE OR REPLACE FUNCTION get_affiliatewp_sync_stats()
RETURNS jsonb AS $$
DECLARE
    stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_profiles', COUNT(*),
        'synced', COUNT(*) FILTER (WHERE affiliatewp_sync_status = 'synced'),
        'pending', COUNT(*) FILTER (WHERE affiliatewp_sync_status = 'pending'),
        'failed', COUNT(*) FILTER (WHERE affiliatewp_sync_status = 'failed'),
        'with_affiliatewp_id', COUNT(*) FILTER (WHERE affiliatewp_id IS NOT NULL),
        'active_accounts', COUNT(*) FILTER (WHERE affiliatewp_account_status = 'active'),
        'last_sync', MAX(last_affiliatewp_sync)
    ) INTO stats
    FROM public.profiles
    WHERE user_role = 'sales_rep';
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles to have proper sync status
UPDATE public.profiles
SET 
    affiliatewp_sync_status = CASE 
        WHEN affiliatewp_id IS NOT NULL THEN 'synced'
        ELSE 'pending'
    END,
    affiliatewp_account_status = CASE 
        WHEN affiliatewp_id IS NOT NULL THEN 'active'
        ELSE 'pending'
    END
WHERE affiliatewp_sync_status IS NULL;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_pending_affiliatewp_syncs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION retry_failed_affiliatewp_sync(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_affiliatewp_sync_stats() TO authenticated, service_role;
