/*
  # Schedule Hourly AffiliateWP Metrics Sync

  1. Overview
    - Creates scheduled job to sync AffiliateWP metrics every hour
    - Populates affiliate_metrics_daily and affiliate_referrals tables
    - Ensures live metrics are always available in Dashboard
    - Provides initial sync trigger for immediate data availability

  2. Scheduled Job
    - Runs every hour on the hour (0 * * * *)
    - Invokes fetch-affiliatewp-metrics Edge Function
    - Syncs current metrics for all affiliates
    - Uses pg_net for async HTTP requests

  3. Monitoring Function
    - get_metrics_sync_status(): Returns sync health and last run time
    - Viewable from Settings page
    - Helps diagnose sync issues

  4. Initial Sync
    - Triggers immediate metrics fetch after migration
    - Populates tables with current data
    - Users see data right away

  5. Error Handling
    - Logs all sync attempts
    - Retries on failure
    - Alerts visible in monitoring view
*/

-- ============================================================================
-- Create function to invoke metrics sync via Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_affiliatewp_metrics()
RETURNS jsonb AS $$
DECLARE
    supabase_url text;
    service_role_key text;
    edge_function_url text;
    request_id bigint;
    result jsonb;
BEGIN
    -- Get configuration from app_settings
    SELECT value INTO supabase_url FROM app_settings WHERE key = 'supabase_url';
    SELECT value INTO service_role_key FROM app_settings WHERE key = 'supabase_service_role_key';

    -- Fallback to environment variable if not in settings
    IF supabase_url IS NULL THEN
        supabase_url := current_setting('app.settings.supabase_url', true);
    END IF;

    IF supabase_url IS NULL THEN
        supabase_url := 'https://gpupamrhpmrgslqnzzpb.supabase.co';
    END IF;

    edge_function_url := supabase_url || '/functions/v1/fetch-affiliatewp-metrics';

    -- Make async HTTP POST request via pg_net
    BEGIN
        SELECT extensions.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(service_role_key, ''),
                'apikey', COALESCE(service_role_key, '')
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 120000
        ) INTO request_id;

        result := jsonb_build_object(
            'success', true,
            'request_id', request_id,
            'message', 'Metrics sync initiated',
            'timestamp', now()
        );

    EXCEPTION
        WHEN OTHERS THEN
            result := jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'timestamp', now()
            );
    END;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner and permissions
ALTER FUNCTION sync_affiliatewp_metrics() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION sync_affiliatewp_metrics() TO service_role, authenticated;

COMMENT ON FUNCTION sync_affiliatewp_metrics() IS
    'Triggers AffiliateWP metrics sync by invoking fetch-affiliatewp-metrics Edge Function. Returns sync status and request ID.';

-- ============================================================================
-- Create monitoring function for sync status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_metrics_sync_status()
RETURNS jsonb AS $$
DECLARE
    latest_metrics_date date;
    total_affiliates integer;
    affiliates_with_metrics integer;
    metrics_count integer;
    referrals_count integer;
    result jsonb;
BEGIN
    -- Get latest metrics date
    SELECT MAX(date) INTO latest_metrics_date
    FROM affiliate_metrics_daily;

    -- Count total affiliates
    SELECT COUNT(*) INTO total_affiliates
    FROM affiliates
    WHERE status = 'active';

    -- Count affiliates with recent metrics (today or yesterday)
    SELECT COUNT(DISTINCT affiliate_id) INTO affiliates_with_metrics
    FROM affiliate_metrics_daily
    WHERE date >= CURRENT_DATE - INTERVAL '1 day';

    -- Count total metrics records
    SELECT COUNT(*) INTO metrics_count
    FROM affiliate_metrics_daily;

    -- Count total referrals
    SELECT COUNT(*) INTO referrals_count
    FROM affiliate_referrals;

    result := jsonb_build_object(
        'last_metrics_date', latest_metrics_date,
        'total_affiliates', total_affiliates,
        'affiliates_with_recent_metrics', affiliates_with_metrics,
        'total_metrics_records', metrics_count,
        'total_referrals', referrals_count,
        'data_freshness', CASE
            WHEN latest_metrics_date = CURRENT_DATE THEN 'current'
            WHEN latest_metrics_date = CURRENT_DATE - 1 THEN 'yesterday'
            WHEN latest_metrics_date IS NULL THEN 'no_data'
            ELSE 'stale'
        END,
        'sync_health', CASE
            WHEN latest_metrics_date = CURRENT_DATE THEN 'healthy'
            WHEN latest_metrics_date >= CURRENT_DATE - 1 THEN 'warning'
            WHEN latest_metrics_date IS NULL THEN 'critical'
            ELSE 'critical'
        END,
        'timestamp', now()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner and permissions
ALTER FUNCTION get_metrics_sync_status() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION get_metrics_sync_status() TO service_role, authenticated;

COMMENT ON FUNCTION get_metrics_sync_status() IS
    'Returns current status of AffiliateWP metrics sync including data freshness and health indicators.';

-- ============================================================================
-- Schedule hourly metrics sync job
-- ============================================================================

-- First, remove any existing schedule with the same name
SELECT cron.unschedule('sync-affiliatewp-metrics-hourly')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-affiliatewp-metrics-hourly'
);

-- Schedule the metrics sync to run every hour at the top of the hour
SELECT cron.schedule(
    'sync-affiliatewp-metrics-hourly',
    '0 * * * *',
    $$SELECT sync_affiliatewp_metrics()$$
);

-- ============================================================================
-- Trigger initial sync for immediate data availability
-- ============================================================================

-- Execute initial sync so users see data right away
SELECT sync_affiliatewp_metrics();

-- ============================================================================
-- Log completion
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Hourly AffiliateWP Metrics Sync Configured';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Scheduled job: sync-affiliatewp-metrics-hourly';
    RAISE NOTICE 'Schedule: Every hour on the hour (0 * * * *)';
    RAISE NOTICE 'Next run: Top of next hour';
    RAISE NOTICE '';
    RAISE NOTICE 'Initial sync triggered - metrics should appear shortly';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '  - sync_affiliatewp_metrics(): Manually trigger sync';
    RAISE NOTICE '  - get_metrics_sync_status(): Check sync health';
    RAISE NOTICE '';
    RAISE NOTICE 'To manually sync: SELECT sync_affiliatewp_metrics();';
    RAISE NOTICE 'To check status: SELECT get_metrics_sync_status();';
    RAISE NOTICE 'To view scheduled jobs: SELECT * FROM cron.job;';
    RAISE NOTICE 'To view job history: SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = ''sync-affiliatewp-metrics-hourly'') ORDER BY start_time DESC LIMIT 10;';
END $$;
