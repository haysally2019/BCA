/*
  # Direct WordPress API Integration to Create Missing Affiliates
  
  This function directly calls the WordPress REST API to create affiliate accounts,
  bypassing the Edge Function authentication issues.
*/

CREATE OR REPLACE FUNCTION direct_create_missing_affiliates()
RETURNS jsonb AS $$
DECLARE
    missing_rep RECORD;
    credentials RECORD;
    wp_url text;
    wp_username text;
    wp_password text;
    auth_header text;
    affiliatewp_api_url text;
    request_id bigint;
    created_count integer := 0;
    error_count integer := 0;
    results jsonb := '[]'::jsonb;
BEGIN
    -- Get WordPress credentials
    SELECT 
        MAX(CASE WHEN key = 'affiliatewp_site_url' THEN value END) as site_url,
        MAX(CASE WHEN key = 'affiliatewp_api_username' THEN value END) as username,
        MAX(CASE WHEN key = 'affiliatewp_api_password' THEN value END) as password
    INTO credentials
    FROM app_settings
    WHERE key IN ('affiliatewp_site_url', 'affiliatewp_api_username', 'affiliatewp_api_password');
    
    wp_url := credentials.site_url;
    wp_username := credentials.username;
    wp_password := credentials.password;
    
    IF wp_url IS NULL OR wp_username IS NULL OR wp_password IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'WordPress credentials not configured'
        );
    END IF;
    
    -- Create Basic Auth header  
    auth_header := 'Basic ' || encode((wp_username || ':' || wp_password)::bytea, 'base64');
    affiliatewp_api_url := wp_url || '/wp-json/affwp/v2/affiliates';
    
    -- Loop through all reps without affiliate IDs
    FOR missing_rep IN
        SELECT 
            p.id,
            p.full_name,
            au.email,
            p.personal_phone
        FROM profiles p
        INNER JOIN auth.users au ON au.id = p.user_id
        WHERE p.user_type = 'sales_rep'
        AND (p.affiliatewp_id IS NULL OR p.affiliatewp_id = 0)
        AND p.full_name IS NOT NULL
        ORDER BY p.created_at ASC
        LIMIT 50
    LOOP
        BEGIN
            -- Make HTTP POST request to WordPress API
            SELECT net.http_post(
                url := affiliatewp_api_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', auth_header
                ),
                body := jsonb_build_object(
                    'payment_email', missing_rep.email,
                    'user_name', missing_rep.full_name,
                    'rate', 5.0,
                    'rate_type', 'percentage',
                    'status', 'active'
                ),
                timeout_milliseconds := 30000
            ) INTO request_id;
            
            created_count := created_count + 1;
            
            results := results || jsonb_build_object(
                'profile_id', missing_rep.id,
                'name', missing_rep.full_name,
                'email', missing_rep.email,
                'request_id', request_id,
                'status', 'requested'
            );
            
            RAISE NOTICE 'Created affiliate request for: % (%) - Request ID: %', 
                missing_rep.full_name, missing_rep.email, request_id;
            
            -- Small delay to avoid overwhelming the API
            PERFORM pg_sleep(0.5);
            
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
                
                RAISE NOTICE 'Error creating affiliate for: % (%) - %', 
                    missing_rep.full_name, missing_rep.email, SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'created', created_count,
        'errors', error_count,
        'message', format('Sent %s affiliate creation requests to WordPress', created_count),
        'note', 'Check WordPress responses in net._http_response table',
        'records', results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner to postgres
ALTER FUNCTION direct_create_missing_affiliates() OWNER TO postgres;

-- Execute it now!
SELECT direct_create_missing_affiliates();
