/*
  # Force Create All Missing Affiliate Accounts NOW
  
  This migration creates a simplified function that directly invokes the Edge Function
  for each missing rep without the queue complexity.
*/

-- Create a function that directly processes without time delays
CREATE OR REPLACE FUNCTION force_create_all_missing_affiliates_now()
RETURNS jsonb AS $$
DECLARE
    missing_rep RECORD;
    request_id bigint;
    supabase_url text;
    service_role_key text;
    edge_function_url text;
    request_body jsonb;
    created_count integer := 0;
    error_count integer := 0;
    results jsonb := '[]'::jsonb;
BEGIN
    -- Get configuration
    SELECT value INTO supabase_url FROM app_settings WHERE key = 'supabase_url';
    SELECT value INTO service_role_key FROM app_settings WHERE key = 'supabase_service_role_key';
    
    IF supabase_url IS NULL THEN
        supabase_url := 'https://gpupamrhpmrgslqnzzpb.supabase.co';
    END IF;
    
    edge_function_url := supabase_url || '/functions/v1/create-affiliatewp-account';
    
    -- Loop through all reps without affiliate IDs
    FOR missing_rep IN
        SELECT 
            p.id,
            p.user_id,
            p.full_name,
            p.personal_phone,
            au.email
        FROM profiles p
        INNER JOIN auth.users au ON au.id = p.user_id
        WHERE p.user_type = 'sales_rep'
        AND (p.affiliatewp_id IS NULL OR p.affiliatewp_id = 0)
        AND p.full_name IS NOT NULL
        ORDER BY p.created_at ASC
        LIMIT 50
    LOOP
        BEGIN
            -- Build request payload
            request_body := jsonb_build_object(
                'profile_id', missing_rep.id,
                'user_id', missing_rep.user_id,
                'email', missing_rep.email,
                'name', missing_rep.full_name,
                'phone', missing_rep.personal_phone
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
                timeout_milliseconds := 30000
            ) INTO request_id;
            
            created_count := created_count + 1;
            
            results := results || jsonb_build_object(
                'profile_id', missing_rep.id,
                'name', missing_rep.full_name,
                'email', missing_rep.email,
                'request_id', request_id,
                'status', 'invoked'
            );
            
            RAISE NOTICE 'Invoked creation for: % (%) - Request ID: %', missing_rep.full_name, missing_rep.email, request_id;
            
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
                
                RAISE NOTICE 'Error creating for: % (%) - %', missing_rep.full_name, missing_rep.email, SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoked', created_count,
        'errors', error_count,
        'message', format('Directly invoked %s affiliate creations via pg_net', created_count),
        'note', 'Edge Functions are processing these asynchronously',
        'records', results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner to postgres
ALTER FUNCTION force_create_all_missing_affiliates_now() OWNER TO postgres;

-- Execute it now!
DO $$
DECLARE
    result jsonb;
BEGIN
    SELECT force_create_all_missing_affiliates_now() INTO result;
    RAISE NOTICE 'FORCED BATCH CREATION RESULT: %', result;
END $$;
