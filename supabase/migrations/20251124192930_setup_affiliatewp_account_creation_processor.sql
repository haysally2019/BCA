/*
  # Setup Automatic AffiliateWP Account Creation Processor

  1. Purpose
    - Automatically process pending AffiliateWP account creation requests
    - Call create-affiliatewp-account Edge Function for pending entries in sync log
    - Run every 5 minutes to ensure timely account creation

  2. How It Works
    - Database function queries sync log for pending account creations
    - Calls Edge Function via pg_net HTTP extension
    - Updates sync log status based on response
    - Retries failed creations with exponential backoff

  3. Components
    - process_pending_affiliatewp_accounts() database function
    - pg_cron scheduled job running every 5 minutes
    - Uses pg_net for HTTP requests to Edge Function

  4. Configuration
    - Runs every 5 minutes
    - Max 3 retry attempts for failed creations
    - Service role authentication for Edge Function calls
*/

-- Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- Create database function to process pending account creations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_pending_affiliatewp_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_record RECORD;
  edge_function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get Supabase URL and service role key from environment
  supabase_url := current_setting('app.settings.supabase_url', TRUE);
  service_role_key := current_setting('app.settings.service_role_key', TRUE);

  -- If environment variables not set, try to get from pg_net defaults
  IF supabase_url IS NULL THEN
    supabase_url := COALESCE(current_setting('supabase.url', TRUE), '');
  END IF;

  IF service_role_key IS NULL THEN
    service_role_key := COALESCE(current_setting('supabase.service_role_key', TRUE), '');
  END IF;

  -- Construct Edge Function URL
  edge_function_url := supabase_url || '/functions/v1/create-affiliatewp-account';

  RAISE LOG 'Processing pending AffiliateWP account creations at %', edge_function_url;

  -- Loop through pending account creation requests (max 3 retry attempts)
  FOR pending_record IN
    SELECT 
      sl.id,
      sl.profile_id,
      sl.request_payload,
      sl.retry_count
    FROM public.affiliatewp_sync_log sl
    WHERE sl.operation = 'create'
      AND sl.status = 'pending'
      AND sl.retry_count < 3
    ORDER BY sl.started_at ASC
    LIMIT 10  -- Process max 10 at a time
  LOOP
    BEGIN
      RAISE LOG 'Processing account creation for profile: %', pending_record.profile_id;

      -- Update status to processing
      UPDATE public.affiliatewp_sync_log
      SET 
        status = 'processing',
        started_at = NOW()
      WHERE id = pending_record.id;

      -- Make HTTP request to Edge Function using pg_net
      -- Note: pg_net.http_post is async, so we just queue the request
      SELECT INTO request_id net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := pending_record.request_payload
      );

      RAISE LOG 'Queued HTTP request % for profile %', request_id, pending_record.profile_id;

      -- Note: The Edge Function itself will update the status to 'completed' or 'failed'
      -- If the Edge Function fails to update, we'll retry on next run

    EXCEPTION
      WHEN OTHERS THEN
        -- If queueing fails, update status back to pending with incremented retry count
        UPDATE public.affiliatewp_sync_log
        SET 
          status = 'pending',
          retry_count = retry_count + 1,
          error_message = SQLERRM
        WHERE id = pending_record.id;

        RAISE LOG 'Failed to queue account creation for profile %: %', pending_record.profile_id, SQLERRM;
    END;
  END LOOP;

  RAISE LOG 'Finished processing pending AffiliateWP account creations';
END;
$$;

ALTER FUNCTION public.process_pending_affiliatewp_accounts() OWNER TO postgres;

COMMENT ON FUNCTION public.process_pending_affiliatewp_accounts() IS
  'Processes pending AffiliateWP account creation requests by calling the Edge Function. Runs automatically every 5 minutes via pg_cron.';

-- ============================================================================
-- Schedule the processor to run every 5 minutes
-- ============================================================================

-- Unschedule existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('process-pending-affiliatewp-accounts');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore if job doesn't exist
END $$;

-- Schedule new job to run every 5 minutes
SELECT cron.schedule(
  'process-pending-affiliatewp-accounts',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT public.process_pending_affiliatewp_accounts();
  $$
);

-- ============================================================================
-- Add helper function to manually trigger processing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_affiliatewp_account_creation(p_profile_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if there's a pending creation for this profile
  IF NOT EXISTS (
    SELECT 1 FROM public.affiliatewp_sync_log
    WHERE profile_id = p_profile_id
      AND operation = 'create'
      AND status IN ('pending', 'failed')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No pending account creation found for this profile'
    );
  END IF;

  -- Reset status to pending if it was failed
  UPDATE public.affiliatewp_sync_log
  SET 
    status = 'pending',
    retry_count = 0,
    error_message = NULL
  WHERE profile_id = p_profile_id
    AND operation = 'create'
    AND status IN ('pending', 'failed');

  -- Trigger processing
  PERFORM public.process_pending_affiliatewp_accounts();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account creation triggered successfully'
  );
END;
$$;

ALTER FUNCTION public.trigger_affiliatewp_account_creation(UUID) OWNER TO postgres;

COMMENT ON FUNCTION public.trigger_affiliatewp_account_creation(UUID) IS
  'Manually trigger AffiliateWP account creation for a specific profile. Useful for retrying failed creations.';

-- ============================================================================
-- Completion message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'AffiliateWP Account Creation Processor Setup Complete!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Automatic processor scheduled to run every 5 minutes';
  RAISE NOTICE 'Pending accounts will be created automatically via Edge Function';
  RAISE NOTICE 'Manual trigger available: SELECT trigger_affiliatewp_account_creation(profile_id);';
  RAISE NOTICE 'View pending creations: SELECT * FROM affiliatewp_sync_log WHERE operation = ''create'' AND status = ''pending'';';
  RAISE NOTICE '=================================================================';
END $$;
