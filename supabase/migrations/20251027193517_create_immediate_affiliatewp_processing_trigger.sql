/*
  # Create Immediate AffiliateWP Processing with pg_net
  
  1. Overview
    - Replaces the queue-only approach with immediate Edge Function invocation
    - Uses pg_net to make async HTTP POST to create-affiliatewp-account Edge Function
    - Non-blocking: Signup completes immediately, AffiliateWP creation happens in background
    - Scales to 100+ concurrent signups without delays
  
  2. New Function: invoke_affiliatewp_creation_immediately()
    - Called by AFTER INSERT trigger on profiles table
    - Makes async HTTP request to Edge Function via pg_net
    - Runs in background, doesn't block signup transaction
    - Updates sync log with request ID for tracking
  
  3. Architecture
    - Profile inserted → Trigger fires → pg_net queues HTTP request → Returns immediately
    - Edge Function processes request asynchronously
    - pg_cron backup processor catches any network failures
  
  4. Error Handling
    - All errors are logged to affiliatewp_sync_log
    - Failed requests will be retried by pg_cron backup processor
    - Signup always succeeds regardless of AffiliateWP status
  
  5. Performance
    - pg_net uses connection pooling for efficiency
    - Async execution means zero impact on signup speed
    - Can handle hundreds of concurrent requests
*/

-- Create function to immediately invoke Edge Function via pg_net
CREATE OR REPLACE FUNCTION invoke_affiliatewp_creation_immediately()
RETURNS TRIGGER AS $$
DECLARE
    request_id bigint;
    supabase_url text;
    service_role_key text;
    edge_function_url text;
    request_body jsonb;
    sync_log_id uuid;
BEGIN
    -- Only process if this is a sales_rep and doesn't already have an affiliate ID
    IF NEW.user_role = 'sales_rep' AND (NEW.affiliatewp_id IS NULL OR NEW.affiliatewp_id = 0) THEN
        
        -- Get Supabase URL from app_settings
        SELECT value INTO supabase_url 
        FROM app_settings 
        WHERE key = 'supabase_url';
        
        IF supabase_url IS NULL THEN
            supabase_url := 'https://gpupamrhpmrgslqnzzpb.supabase.co';
        END IF;
        
        -- Get service role key from app_settings
        SELECT value INTO service_role_key 
        FROM app_settings 
        WHERE key = 'supabase_service_role_key';
        
        -- Build Edge Function URL
        edge_function_url := supabase_url || '/functions/v1/create-affiliatewp-account';
        
        -- Build request payload
        request_body := jsonb_build_object(
            'profile_id', NEW.id,
            'user_id', NEW.user_id,
            'email', COALESCE(NEW.company_email, NEW.email, 'unknown@example.com'),
            'name', COALESCE(NEW.full_name, NEW.company_name, 'New User'),
            'phone', COALESCE(NEW.company_phone, NEW.personal_phone)
        );
        
        -- Make async HTTP POST request via pg_net
        BEGIN
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
            
            -- Get the sync log ID for this profile
            SELECT id INTO sync_log_id
            FROM affiliatewp_sync_log
            WHERE profile_id = NEW.id 
                AND status = 'pending'
                AND operation = 'create'
            ORDER BY created_at DESC
            LIMIT 1;
            
            -- Update the existing sync log entry with the pg_net request ID
            IF sync_log_id IS NOT NULL THEN
                UPDATE affiliatewp_sync_log
                SET 
                    status = 'processing',
                    request_payload = request_payload || jsonb_build_object('pg_net_request_id', request_id),
                    updated_at = now()
                WHERE id = sync_log_id;
            END IF;
            
            RAISE LOG 'Invoked AffiliateWP Edge Function for profile %: pg_net request_id=%', NEW.id, request_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the profile creation
                RAISE LOG 'Failed to invoke AffiliateWP Edge Function for profile %: % %', NEW.id, SQLSTATE, SQLERRM;
                
                -- Get the sync log ID
                SELECT id INTO sync_log_id
                FROM affiliatewp_sync_log
                WHERE profile_id = NEW.id 
                    AND status = 'pending'
                    AND operation = 'create'
                ORDER BY created_at DESC
                LIMIT 1;
                
                -- Update sync log with error
                IF sync_log_id IS NOT NULL THEN
                    UPDATE affiliatewp_sync_log
                    SET 
                        status = 'failed',
                        error_message = SQLERRM,
                        updated_at = now()
                    WHERE id = sync_log_id;
                END IF;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner to postgres for elevated permissions
ALTER FUNCTION invoke_affiliatewp_creation_immediately() OWNER TO postgres;

-- Create trigger on profiles table (AFTER INSERT to ensure profile exists)
DROP TRIGGER IF EXISTS trigger_invoke_affiliatewp_immediately ON public.profiles;
CREATE TRIGGER trigger_invoke_affiliatewp_immediately
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION invoke_affiliatewp_creation_immediately();

-- Add helpful comment
COMMENT ON FUNCTION invoke_affiliatewp_creation_immediately() IS
    'Immediately invokes the create-affiliatewp-account Edge Function via pg_net after profile creation. Non-blocking async HTTP request ensures fast signup times even under heavy load.';

-- Store Supabase URL in app_settings for database access
INSERT INTO app_settings (key, value, description)
VALUES ('supabase_url', 'https://gpupamrhpmrgslqnzzpb.supabase.co', 'Supabase project URL for Edge Function invocation')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Immediate AffiliateWP Processing Enabled';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New signups will trigger immediate Edge Function invocation via pg_net';
    RAISE NOTICE 'Async HTTP requests ensure fast signup regardless of AffiliateWP status';
    RAISE NOTICE 'IMPORTANT: Add service role key to app_settings for authentication:';
    RAISE NOTICE '  INSERT INTO app_settings (key, value) VALUES (''supabase_service_role_key'', ''your-key-here'');';
END $$;
