/*
  # Configuration Instructions for AffiliateWP Auto-Creation
  
  ## IMPORTANT: Service Role Key Configuration
  
  The automatic AffiliateWP account creation system requires the Supabase
  service role key to be stored in the app_settings table for pg_net to
  authenticate Edge Function requests.
  
  ### How to Configure
  
  Run this SQL command in the Supabase SQL Editor, replacing YOUR_KEY_HERE
  with your actual Supabase service role key:
  
  ```sql
  INSERT INTO app_settings (key, value, description)
  VALUES (
    'supabase_service_role_key',
    'YOUR_KEY_HERE',
    'Service role key for Edge Function authentication from database triggers'
  )
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();
  ```
  
  ### Where to Find Your Service Role Key
  
  1. Go to your Supabase project dashboard
  2. Navigate to Settings > API
  3. Copy the "service_role" key (NOT the anon key)
  4. This key has elevated permissions - keep it secure
  
  ### System Status Check
  
  After configuration, verify the system is working:
  
  ```sql
  -- Check if service role key is configured
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM app_settings WHERE key = 'supabase_service_role_key')
      THEN 'Service role key: CONFIGURED'
      ELSE 'Service role key: MISSING - System will not work!'
    END as service_role_status,
    CASE
      WHEN EXISTS (SELECT 1 FROM app_settings WHERE key = 'affiliatewp_site_url')
      THEN 'AffiliateWP credentials: CONFIGURED'
      ELSE 'AffiliateWP credentials: MISSING'
    END as affiliatewp_status;
  
  -- View current configuration (credentials will be masked)
  SELECT
    key,
    CASE
      WHEN key LIKE '%password%' OR key LIKE '%key%' THEN '[REDACTED]'
      ELSE value
    END as value,
    description
  FROM app_settings
  ORDER BY key;
  
  -- Test the automatic creation system
  SELECT * FROM affiliatewp_sync_dashboard;
  
  -- View pending/failed creations
  SELECT * FROM profiles_pending_affiliatewp LIMIT 10;
  ```
  
  ### System Overview
  
  The automatic creation system works as follows:
  
  1. New rep signs up → Profile created
  2. BEFORE INSERT trigger queues the creation
  3. AFTER INSERT trigger immediately invokes Edge Function via pg_net
  4. Edge Function creates AffiliateWP account in WordPress
  5. Edge Function updates profile with AffiliateWP ID
  6. Backup: pg_cron runs every 3 minutes to catch any failures
  7. After 5 failed retries, entries move to dead letter queue
  
  ### Monitoring Commands
  
  ```sql
  -- View real-time statistics
  SELECT * FROM affiliatewp_sync_dashboard;
  
  -- Get detailed stats
  SELECT get_affiliatewp_sync_stats();
  
  -- View recent failures
  SELECT * FROM affiliatewp_recent_failures LIMIT 10;
  
  -- Check scheduled jobs
  SELECT * FROM cron.job WHERE jobname LIKE '%affiliatewp%';
  
  -- View job execution history
  SELECT *
  FROM cron.job_run_details
  WHERE jobname LIKE '%affiliatewp%'
  ORDER BY start_time DESC
  LIMIT 10;
  
  -- Manually trigger batch processor
  SELECT process_pending_affiliatewp_batch();
  
  -- Retry a specific failed sync
  SELECT retry_failed_affiliatewp_sync('log-id-here');
  ```
  
  ### Troubleshooting
  
  If signups aren't creating AffiliateWP accounts:
  
  1. Check service role key is configured
  2. Check AffiliateWP credentials are correct
  3. Check Edge Function logs in Supabase dashboard
  4. View recent failures: SELECT * FROM affiliatewp_recent_failures;
  5. Manually trigger batch: SELECT process_pending_affiliatewp_batch();
  6. Check pg_cron is running: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
*/

-- Create a helper function to check system configuration status
CREATE OR REPLACE FUNCTION check_affiliatewp_system_status()
RETURNS jsonb AS $$
DECLARE
    status jsonb;
    service_role_configured boolean;
    affiliatewp_configured boolean;
    pg_net_enabled boolean;
    pg_cron_enabled boolean;
    cron_job_exists boolean;
BEGIN
    -- Check if service role key is configured
    SELECT EXISTS (SELECT 1 FROM app_settings WHERE key = 'supabase_service_role_key')
    INTO service_role_configured;
    
    -- Check if AffiliateWP credentials are configured
    SELECT EXISTS (
        SELECT 1 FROM app_settings
        WHERE key IN ('affiliatewp_site_url', 'affiliatewp_api_username', 'affiliatewp_api_password')
        GROUP BY 1
        HAVING COUNT(*) = 3
    ) INTO affiliatewp_configured;
    
    -- Check if pg_net extension is enabled
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
    ) INTO pg_net_enabled;
    
    -- Check if pg_cron extension is enabled
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) INTO pg_cron_enabled;
    
    -- Check if cron job is scheduled
    SELECT EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'process-pending-affiliatewp-batch'
    ) INTO cron_job_exists;
    
    status := jsonb_build_object(
        'system_ready', service_role_configured AND affiliatewp_configured AND pg_net_enabled AND pg_cron_enabled AND cron_job_exists,
        'components', jsonb_build_object(
            'service_role_key', CASE WHEN service_role_configured THEN 'configured' ELSE 'MISSING - REQUIRED!' END,
            'affiliatewp_credentials', CASE WHEN affiliatewp_configured THEN 'configured' ELSE 'missing' END,
            'pg_net_extension', CASE WHEN pg_net_enabled THEN 'enabled' ELSE 'disabled' END,
            'pg_cron_extension', CASE WHEN pg_cron_enabled THEN 'enabled' ELSE 'disabled' END,
            'cron_job_scheduled', CASE WHEN cron_job_exists THEN 'yes' ELSE 'no' END
        ),
        'next_steps', CASE
            WHEN NOT service_role_configured THEN jsonb_build_array('Configure service role key in app_settings table')
            WHEN NOT affiliatewp_configured THEN jsonb_build_array('Configure AffiliateWP credentials in app_settings table')
            ELSE jsonb_build_array('System ready - test by creating a new sales rep')
        END,
        'timestamp', now()
    );
    
    RETURN status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_affiliatewp_system_status() TO authenticated, service_role;

-- Log instructions
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AffiliateWP Auto-Creation System Installed';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Configuration Required!';
    RAISE NOTICE '';
    RAISE NOTICE 'Run this command to check system status:';
    RAISE NOTICE '  SELECT check_affiliatewp_system_status();';
    RAISE NOTICE '';
    RAISE NOTICE 'If service_role_key is missing, configure it:';
    RAISE NOTICE '  INSERT INTO app_settings (key, value, description)';
    RAISE NOTICE '  VALUES (''supabase_service_role_key'', ''YOUR_KEY'', ''Service role key'')';
    RAISE NOTICE '  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;';
    RAISE NOTICE '';
    RAISE NOTICE 'Find your service role key:';
    RAISE NOTICE '  Supabase Dashboard > Settings > API > service_role key';
    RAISE NOTICE '';
    RAISE NOTICE 'Once configured, new signups will automatically create AffiliateWP accounts!';
    RAISE NOTICE '========================================';
END $$;
