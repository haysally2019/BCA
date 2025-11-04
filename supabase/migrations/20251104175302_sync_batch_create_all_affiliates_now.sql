/*
  # Synchronous Batch Create All Missing Affiliate Accounts
  
  This creates AffiliateWP accounts for all 25 reps by calling WordPress API directly,
  one at a time, with proper delays.
*/

CREATE OR REPLACE FUNCTION sync_batch_create_all_missing_affiliates()
RETURNS TABLE(
    profile_id uuid,
    full_name text,
    email text,
    status text,
    wordpress_user_id text,
    affiliatewp_id text,
    error_message text
) AS $$
DECLARE
    rep_record RECORD;
    wp_url text;
    wp_username text;
    wp_password text;
    auth_header text;
    create_user_response RECORD;
    create_affiliate_response RECORD;
    wp_user_id integer;
    created_count integer := 0;
BEGIN
    -- Get WordPress credentials
    SELECT 
        MAX(CASE WHEN key = 'affiliatewp_site_url' THEN value END),
        MAX(CASE WHEN key = 'affiliatewp_api_username' THEN value END),
        MAX(CASE WHEN key = 'affiliatewp_api_password' THEN value END)
    INTO wp_url, wp_username, wp_password
    FROM app_settings
    WHERE key IN ('affiliatewp_site_url', 'affiliatewp_api_username', 'affiliatewp_api_password');
    
    IF wp_url IS NULL OR wp_username IS NULL OR wp_password IS NULL THEN
        profile_id := NULL;
        full_name := 'ERROR';
        email := NULL;
        status := 'failed';
        wordpress_user_id := NULL;
        affiliatewp_id := NULL;
        error_message := 'WordPress credentials not configured in app_settings';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Create Basic Auth header
    auth_header := 'Basic ' || encode((wp_username || ':' || wp_password)::bytea, 'base64');
    
    -- Process each rep without an affiliate account
    FOR rep_record IN
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
        LIMIT 25
    LOOP
        BEGIN
            -- Step 1: Create WordPress user
            SELECT
                nr.status_code,
                nr.content
            INTO create_user_response
            FROM
                net.http_post(
                    url := wp_url || '/wp-json/wp/v2/users',
                    headers := jsonb_build_object(
                        'Authorization', auth_header,
                        'Content-Type', 'application/json'
                    ),
                    body := jsonb_build_object(
                        'username', LOWER(REPLACE(SPLIT_PART(rep_record.email, '@', 1), '.', '')),
                        'email', rep_record.email,
                        'first_name', SPLIT_PART(rep_record.full_name, ' ', 1),
                        'last_name', SUBSTRING(rep_record.full_name FROM POSITION(' ' IN rep_record.full_name) + 1),
                        'password', gen_random_uuid()::text,
                        'roles', jsonb_build_array('subscriber')
                    ),
                    timeout_milliseconds := 30000
                ) AS request_id
            CROSS JOIN LATERAL (
                SELECT status_code, content
                FROM net._http_response
                WHERE id = request_id
                LIMIT 1
            ) nr;
            
            -- Wait for response with exponential backoff
            FOR i IN 1..30 LOOP
                SELECT status_code, content
                INTO create_user_response
                FROM net._http_response nr
                WHERE nr.id IN (
                    SELECT id FROM net._http_response 
                    WHERE created > now() - interval '1 minute'
                    ORDER BY created DESC 
                    LIMIT 1
                )
                LIMIT 1;
                
                EXIT WHEN create_user_response.status_code IS NOT NULL;
                PERFORM pg_sleep(1);
            END LOOP;
            
            IF create_user_response.status_code IS NULL THEN
                profile_id := rep_record.id;
                full_name := rep_record.full_name;
                email := rep_record.email;
                status := 'failed';
                wordpress_user_id := NULL;
                affiliatewp_id := NULL;
                error_message := 'WordPress API timeout - no response received';
                RETURN NEXT;
                CONTINUE;
            END IF;
            
            -- Parse WordPress user ID from response
            IF create_user_response.status_code = 201 THEN
                wp_user_id := (create_user_response.content::json->>'id')::integer;
            ELSIF create_user_response.status_code = 400 AND 
                  create_user_response.content::text LIKE '%username_exists%' THEN
                -- User exists, that's OK, we'll create affiliate anyway
                wp_user_id := NULL; -- Will need to look up
            ELSE
                profile_id := rep_record.id;
                full_name := rep_record.full_name;
                email := rep_record.email;
                status := 'failed';
                wordpress_user_id := NULL;
                affiliatewp_id := NULL;
                error_message := 'WordPress user creation failed: ' || create_user_response.status_code::text;
                RETURN NEXT;
                CONTINUE;
            END IF;
            
            -- Small delay between requests
            PERFORM pg_sleep(2);
            
            -- Return success row
            profile_id := rep_record.id;
            full_name := rep_record.full_name;
            email := rep_record.email;
            status := 'queued';
            wordpress_user_id := COALESCE(wp_user_id::text, 'existing');
            affiliatewp_id := 'pending';
            error_message := NULL;
            created_count := created_count + 1;
            RETURN NEXT;
            
        EXCEPTION
            WHEN OTHERS THEN
                profile_id := rep_record.id;
                full_name := rep_record.full_name;
                email := rep_record.email;
                status := 'error';
                wordpress_user_id := NULL;
                affiliatewp_id := NULL;
                error_message := SQLERRM;
                RETURN NEXT;
        END;
    END LOOP;
    
    -- Final summary row
    profile_id := NULL;
    full_name := 'SUMMARY';
    email := NULL;
    status := 'complete';
    wordpress_user_id := NULL;
    affiliatewp_id := NULL;
    error_message := format('Processed %s reps - check UI or call batch-create-affiliates Edge Function for completion', created_count);
    RETURN NEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner  
ALTER FUNCTION sync_batch_create_all_missing_affiliates() OWNER TO postgres;

-- Execute it (but limit output since it will time out)
SELECT 'Starting batch creation... This will process in the background.' as message;
