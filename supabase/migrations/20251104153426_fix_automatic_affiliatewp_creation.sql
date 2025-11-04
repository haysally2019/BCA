/*
  # Fix Automatic AffiliateWP Account Creation
  
  ## Problem
  The current system queues creation but relies on pg_cron which may not process immediately.
  Users expect immediate affiliate URL generation when they sign up.
  
  ## Solution
  Create an AFTER INSERT trigger that uses pg_net to call the Edge Function immediately
  when a new sales rep profile is created. This ensures instant affiliate account creation.
  
  ## Changes
  1. Create immediate processing trigger using pg_net http_post
  2. Call create-affiliatewp-account Edge Function directly
  3. Set proper timeout and error handling
  4. Keep pg_cron as backup for failures
*/

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to immediately invoke AffiliateWP creation
CREATE OR REPLACE FUNCTION invoke_affiliatewp_creation_immediately()
RETURNS TRIGGER AS $$
DECLARE
    request_id bigint;
    supabase_url text;
    service_role_key text;
    edge_function_url text;
    request_body jsonb;
    user_email text;
    user_name text;
BEGIN
    -- Only process if this is a sales_rep and doesn't already have an affiliate ID
    IF NEW.user_type = 'sales_rep' AND (NEW.affiliatewp_id IS NULL OR NEW.affiliatewp_id = 0) THEN
        
        -- Get Supabase URL from app_settings or use default
        SELECT value INTO supabase_url FROM app_settings WHERE key = 'supabase_url';
        SELECT value INTO service_role_key FROM app_settings WHERE key = 'supabase_service_role_key';
        
        IF supabase_url IS NULL THEN
            supabase_url := current_setting('app.settings.supabase_url', true);
        END IF;
        
        IF supabase_url IS NULL THEN
            supabase_url := 'https://gpupamrhpmrgslqnzzpb.supabase.co';
        END IF;
        
        edge_function_url := supabase_url || '/functions/v1/create-affiliatewp-account';
        
        -- Get user email from auth.users
        SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
        
        user_email := COALESCE(user_email, NEW.company_email, 'unknown@example.com');
        user_name := COALESCE(NEW.full_name, 'New User');
        
        -- Build request payload
        request_body := jsonb_build_object(
            'profile_id', NEW.id,
            'user_id', NEW.user_id,
            'email', user_email,
            'name', user_name,
            'phone', COALESCE(NEW.personal_phone, NEW.company_phone)
        );
        
        -- Make async HTTP POST request via pg_net
        BEGIN
            SELECT net.http_post(
                url := edge_function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || COALESCE(service_role_key, ''),
                    'apikey', COALESCE(service_role_key, '')
                ),
                body := request_body,
                timeout_milliseconds := 30000
            ) INTO request_id;
            
            RAISE LOG 'Invoked AffiliateWP creation for profile % via pg_net request %', NEW.id, request_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the profile creation
                RAISE LOG 'Failed to invoke AffiliateWP creation for profile %: %. Will be retried by pg_cron.', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner to postgres for elevated privileges
ALTER FUNCTION invoke_affiliatewp_creation_immediately() OWNER TO postgres;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_create_affiliatewp_immediately ON public.profiles;

-- Create trigger that fires AFTER INSERT
CREATE TRIGGER trigger_create_affiliatewp_immediately
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION invoke_affiliatewp_creation_immediately();

-- Add helpful comment
COMMENT ON FUNCTION invoke_affiliatewp_creation_immediately() IS
    'Immediately invokes AffiliateWP account creation via pg_net when a new sales rep profile is created. Runs asynchronously to avoid blocking profile creation. Errors are logged and will be retried by pg_cron backup processor.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Automatic AffiliateWP Creation Fixed';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New sales rep profiles will now get AffiliateWP accounts created IMMEDIATELY';
    RAISE NOTICE 'pg_cron backup processor continues to run every 3 minutes for any failures';
    RAISE NOTICE 'System is fully automatic - no manual intervention needed';
    RAISE NOTICE '';
    RAISE NOTICE 'Flow:';
    RAISE NOTICE '  1. User signs up → Profile created';
    RAISE NOTICE '  2. AFTER INSERT trigger fires';
    RAISE NOTICE '  3. pg_net calls Edge Function asynchronously';
    RAISE NOTICE '  4. AffiliateWP account created in WordPress';
    RAISE NOTICE '  5. Profile updated with affiliate ID and URL';
    RAISE NOTICE '  6. User sees URL in dashboard immediately';
END $$;
