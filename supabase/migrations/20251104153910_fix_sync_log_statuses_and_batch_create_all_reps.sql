/*
  # Fix Sync Log Statuses and Create All Missing Affiliate Accounts
  
  ## Problem
  The affiliatewp_sync_log table has a check constraint that doesn't include all needed statuses
  like 'processing' and 'dead_letter_queue'.
  
  ## Solution
  1. Update the check constraint to include all statuses
  2. Create a simple function to batch create all missing affiliate accounts
  3. Execute it immediately
*/

-- Drop the old constraint and add a new one with all needed statuses
ALTER TABLE affiliatewp_sync_log 
DROP CONSTRAINT IF EXISTS affiliatewp_sync_log_status_check;

ALTER TABLE affiliatewp_sync_log
ADD CONSTRAINT affiliatewp_sync_log_status_check 
CHECK (status IN ('pending', 'processing', 'success', 'failed', 'retrying', 'dead_letter_queue'));

-- Create a simplified batch creation function
CREATE OR REPLACE FUNCTION create_all_missing_affiliates()
RETURNS jsonb AS $$
DECLARE
    missing_rep RECORD;
    created_count integer := 0;
    error_count integer := 0;
    skipped_count integer := 0;
    results jsonb := '[]'::jsonb;
BEGIN
    -- Loop through all sales reps without affiliate IDs
    FOR missing_rep IN
        SELECT 
            p.id,
            p.user_id,
            p.full_name,
            au.email
        FROM profiles p
        INNER JOIN auth.users au ON au.id = p.user_id
        WHERE p.user_type = 'sales_rep'
        AND (p.affiliatewp_id IS NULL OR p.affiliatewp_id = 0)
        AND p.full_name IS NOT NULL
        ORDER BY p.created_at ASC
    LOOP
        BEGIN
            -- Queue it for creation
            INSERT INTO affiliatewp_sync_log (
                profile_id,
                operation,
                sync_direction,
                status,
                request_payload,
                retry_count
            ) VALUES (
                missing_rep.id,
                'create',
                'portal_to_affiliatewp',
                'pending',
                jsonb_build_object(
                    'profile_id', missing_rep.id,
                    'user_id', missing_rep.user_id,
                    'email', missing_rep.email,
                    'name', missing_rep.full_name,
                    'trigger', 'manual_batch_fix'
                ),
                0
            )
            ON CONFLICT DO NOTHING;
            
            created_count := created_count + 1;
            
            results := results || jsonb_build_object(
                'profile_id', missing_rep.id,
                'name', missing_rep.full_name,
                'email', missing_rep.email,
                'status', 'queued'
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                
                results := results || jsonb_build_object(
                    'profile_id', missing_rep.id,
                    'name', missing_rep.full_name,
                    'email', missing_rep.email,
                    'status', 'error',
                    'error', SQLERRM
                );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'queued', created_count,
        'errors', error_count,
        'message', format('Queued %s affiliate accounts for creation', created_count),
        'note', 'pg_cron will process these within 3 minutes, or you can call process_pending_affiliatewp_batch() manually',
        'records', results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner to postgres
ALTER FUNCTION create_all_missing_affiliates() OWNER TO postgres;

-- Fix the batch processor to use correct status
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
            p.personal_phone,
            au.email as auth_email
        FROM affiliatewp_sync_log sl
        INNER JOIN profiles p ON p.id = sl.profile_id
        LEFT JOIN auth.users au ON au.id = p.user_id
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
                'email', COALESCE(pending_record.auth_email, pending_record.company_email, 'unknown@example.com'),
                'name', COALESCE(pending_record.full_name, 'New User'),
                'phone', COALESCE(pending_record.company_phone, pending_record.personal_phone)
            );
            
            -- Make async HTTP POST request via pg_net
            SELECT net.http_post(
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
                'email', pending_record.auth_email,
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
    
    -- Move entries that hit max retries to failed (not dead_letter_queue since constraint doesn't allow it yet)
    UPDATE affiliatewp_sync_log
    SET 
        status = 'failed',
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
        'max_retries_exceeded', skipped_count,
        'timestamp', now(),
        'records', results,
        'message', format('Batch processed: %s invoked, %s errors, %s exceeded max retries', processed_count, error_count, skipped_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner to postgres
ALTER FUNCTION process_pending_affiliatewp_batch() OWNER TO postgres;

-- Now queue all missing affiliates and process them
DO $$
DECLARE
    queue_result jsonb;
    process_result jsonb;
BEGIN
    SELECT create_all_missing_affiliates() INTO queue_result;
    RAISE NOTICE 'Batch queuing result: %', queue_result;
    
    SELECT process_pending_affiliatewp_batch() INTO process_result;
    RAISE NOTICE 'Batch processing result: %', process_result;
    
    RAISE NOTICE 'All missing affiliate accounts queued and processing started!';
END $$;
