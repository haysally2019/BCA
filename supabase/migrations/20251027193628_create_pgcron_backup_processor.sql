/*
  # Create pg_cron Backup Processor for AffiliateWP Creation
  
  1. Overview
    - Scheduled job runs every 3 minutes to process pending/failed AffiliateWP creations
    - Acts as safety net for the immediate pg_net trigger
    - Catches network failures, Edge Function errors, and retry scenarios
    - Processes up to 50 pending entries per run for scalability
  
  2. Enhanced Function: process_pending_affiliatewp_batch()
    - Improved version of existing process_pending_affiliatewp_creations()
    - Uses pg_net to invoke Edge Function for each pending entry
    - Implements rate limiting (max 50 per run to prevent overwhelming)
    - Respects retry count limits (max 5 retries)
    - Updates sync status and tracks request IDs
  
  3. Cron Schedule
    - Runs every 3 minutes using cron expression
    - Processing window ensures fast retry without overwhelming system
    - Can be adjusted based on volume and WordPress API capacity
  
  4. Error Handling
    - Failed requests increment retry_count
    - After 5 failures, entries move to dead letter queue status
    - All errors logged with timestamps for debugging
    - Alerts can be configured when failure rate is high
  
  5. Performance Considerations
    - Batch size limited to prevent long-running transactions
    - Async pg_net requests prevent blocking
    - Processing prioritizes oldest pending entries first
    - Skips entries already being processed
*/

-- Create enhanced batch processing function
CREATE OR REPLACE FUNCTION process_pending_affiliatewp_batch()
RETURNS jsonb AS $$
DECLARE
    pending_record RECORD;
    request_id bigint;
    supabase_url text;
    service_role_key text;
    edge_function_url text;
    request_body jsonb;
    processed_count integer := 0;
    error_count integer := 0;
    skipped_count integer := 0;
    results jsonb := '[]'::jsonb;
BEGIN
    -- Get configuration
    SELECT value INTO supabase_url FROM app_settings WHERE key = 'supabase_url';
    SELECT value INTO service_role_key FROM app_settings WHERE key = 'supabase_service_role_key';
    
    IF supabase_url IS NULL THEN
        supabase_url := 'https://gpupamrhpmrgslqnzzpb.supabase.co';
    END IF;
    
    edge_function_url := supabase_url || '/functions/v1/create-affiliatewp-account';
    
    -- Process pending and failed entries (up to 50 per run)
    FOR pending_record IN
        SELECT 
            sl.id as log_id,
            sl.profile_id,
            sl.retry_count,
            sl.request_payload,
            p.company_email,
            p.full_name,
            p.user_id,
            p.company_phone,
            p.personal_phone
        FROM affiliatewp_sync_log sl
        INNER JOIN profiles p ON p.id = sl.profile_id
        WHERE sl.status IN ('pending', 'failed')
          AND sl.operation = 'create'
          AND sl.retry_count < 5
          AND p.affiliatewp_id IS NULL
          AND (sl.updated_at IS NULL OR sl.updated_at < now() - interval '2 minutes')
        ORDER BY sl.created_at ASC
        LIMIT 50
    LOOP
        BEGIN
            -- Build request payload
            request_body := jsonb_build_object(
                'profile_id', pending_record.profile_id,
                'user_id', pending_record.user_id,
                'email', COALESCE(pending_record.company_email, 'unknown@example.com'),
                'name', COALESCE(pending_record.full_name, 'New User'),
                'phone', COALESCE(pending_record.company_phone, pending_record.personal_phone)
            );
            
            -- Make async HTTP POST request via pg_net
            SELECT extensions.http_post(
                url := edge_function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || COALESCE(service_role_key, ''),
                    'apikey', COALESCE(service_role_key, '')
                ),
                body := request_body,
                timeout_milliseconds := 60000
            ) INTO request_id;
            
            -- Update sync log with processing status
            UPDATE affiliatewp_sync_log
            SET 
                status = 'processing',
                retry_count = pending_record.retry_count + 1,
                request_payload = request_payload || jsonb_build_object(
                    'pg_net_request_id', request_id,
                    'processed_by', 'pg_cron_batch',
                    'batch_time', now()
                ),
                updated_at = now()
            WHERE id = pending_record.log_id;
            
            processed_count := processed_count + 1;
            
            results := results || jsonb_build_object(
                'log_id', pending_record.log_id,
                'profile_id', pending_record.profile_id,
                'email', pending_record.company_email,
                'request_id', request_id,
                'retry_count', pending_record.retry_count + 1,
                'status', 'invoked'
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                
                -- Update sync log with error
                UPDATE affiliatewp_sync_log
                SET 
                    status = 'failed',
                    retry_count = pending_record.retry_count + 1,
                    error_message = SQLERRM,
                    updated_at = now()
                WHERE id = pending_record.log_id;
                
                results := results || jsonb_build_object(
                    'log_id', pending_record.log_id,
                    'profile_id', pending_record.profile_id,
                    'error', SQLERRM,
                    'retry_count', pending_record.retry_count + 1,
                    'status', 'error'
                );
        END;
    END LOOP;
    
    -- Move entries that hit max retries to dead letter queue status
    UPDATE affiliatewp_sync_log
    SET 
        status = 'dead_letter_queue',
        error_message = COALESCE(error_message, '') || ' [Max retries exceeded]',
        updated_at = now()
    WHERE status IN ('pending', 'failed')
        AND retry_count >= 5
        AND operation = 'create';
    
    GET DIAGNOSTICS skipped_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'processed', processed_count,
        'errors', error_count,
        'dead_letter_queue', skipped_count,
        'timestamp', now(),
        'records', results,
        'message', format('Batch processed: %s invoked, %s errors, %s moved to DLQ', processed_count, error_count, skipped_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner to postgres
ALTER FUNCTION process_pending_affiliatewp_batch() OWNER TO postgres;

-- Grant execute to service_role for manual invocation
GRANT EXECUTE ON FUNCTION process_pending_affiliatewp_batch() TO service_role;

-- Schedule the batch processor to run every 3 minutes
SELECT cron.schedule(
    'process-pending-affiliatewp-batch',
    '*/3 * * * *',
    $$SELECT process_pending_affiliatewp_batch()$$
);

-- Add helpful comment
COMMENT ON FUNCTION process_pending_affiliatewp_batch() IS
    'Batch processor for pending AffiliateWP account creations. Runs every 3 minutes via pg_cron to catch failures from immediate trigger. Processes up to 50 entries per run with retry logic and dead letter queue for permanent failures.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'pg_cron Backup Processor Installed';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Scheduled job: process-pending-affiliatewp-batch';
    RAISE NOTICE 'Schedule: Every 3 minutes';
    RAISE NOTICE 'Batch size: Up to 50 entries per run';
    RAISE NOTICE 'Max retries: 5 attempts before dead letter queue';
    RAISE NOTICE '';
    RAISE NOTICE 'To manually trigger: SELECT process_pending_affiliatewp_batch();';
    RAISE NOTICE 'To view scheduled jobs: SELECT * FROM cron.job;';
    RAISE NOTICE 'To view job history: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;';
END $$;
