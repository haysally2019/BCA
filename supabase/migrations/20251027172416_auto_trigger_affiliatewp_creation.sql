/*
  # Auto-Trigger AffiliateWP Account Creation

  ## Overview
  Creates a trigger that automatically attempts to create an AffiliateWP account
  when a new sales rep profile is created during signup.

  ## Functionality
    - Triggers after profile insert for sales_rep users
    - Queues the affiliate creation as a background task
    - Creates sync log entry for tracking
    - Non-blocking - signup succeeds even if AffiliateWP creation fails

  ## Security
    - Uses SECURITY DEFINER for elevated permissions
    - Only triggers for sales_rep role
    - Logs all operations for audit trail
*/

-- Create function to queue AffiliateWP account creation
CREATE OR REPLACE FUNCTION queue_affiliatewp_account_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this is a sales_rep and doesn't already have an affiliate ID
    IF NEW.user_role = 'sales_rep' AND NEW.affiliatewp_id IS NULL THEN
        -- Create a sync log entry to track this operation
        INSERT INTO public.affiliatewp_sync_log (
            profile_id,
            affiliatewp_id,
            operation,
            sync_direction,
            status,
            request_payload,
            retry_count
        ) VALUES (
            NEW.id,
            NULL,
            'create',
            'portal_to_affiliatewp',
            'pending',
            jsonb_build_object(
                'profile_id', NEW.id,
                'user_id', NEW.user_id,
                'email', NEW.company_email,
                'name', NEW.full_name,
                'phone', COALESCE(NEW.company_phone, NEW.personal_phone),
                'trigger', 'auto_signup'
            ),
            0
        );

        -- Update profile sync status
        NEW.affiliatewp_sync_status := 'pending';
        NEW.affiliatewp_account_status := 'pending';
        
        -- Log that we queued the creation
        RAISE NOTICE 'Queued AffiliateWP account creation for profile: %, email: %', NEW.id, NEW.company_email;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_queue_affiliatewp_creation ON public.profiles;
CREATE TRIGGER trigger_queue_affiliatewp_creation
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION queue_affiliatewp_account_creation();

-- Create function to process pending AffiliateWP creations
-- This can be called by a cron job or manually to process the queue
CREATE OR REPLACE FUNCTION process_pending_affiliatewp_creations()
RETURNS jsonb AS $$
DECLARE
    pending_record RECORD;
    result_count integer := 0;
    error_count integer := 0;
    results jsonb := '[]'::jsonb;
BEGIN
    -- Get all pending sync operations
    FOR pending_record IN
        SELECT 
            sl.id as log_id,
            sl.profile_id,
            sl.request_payload,
            p.company_email,
            p.full_name
        FROM public.affiliatewp_sync_log sl
        INNER JOIN public.profiles p ON p.id = sl.profile_id
        WHERE sl.status = 'pending'
          AND sl.operation = 'create'
          AND sl.retry_count < 5
          AND p.affiliatewp_id IS NULL
        ORDER BY sl.created_at ASC
        LIMIT 10
    LOOP
        -- Mark as processing
        UPDATE public.affiliatewp_sync_log
        SET status = 'processing', updated_at = now()
        WHERE id = pending_record.log_id;

        -- Add to results
        results := results || jsonb_build_object(
            'log_id', pending_record.log_id,
            'profile_id', pending_record.profile_id,
            'email', pending_record.company_email,
            'status', 'queued_for_processing'
        );

        result_count := result_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed', result_count,
        'errors', error_count,
        'records', results,
        'message', format('Queued %s records for AffiliateWP creation', result_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to manually trigger affiliate creation for a specific profile
CREATE OR REPLACE FUNCTION manual_create_affiliatewp_account(profile_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    profile_record RECORD;
    log_id uuid;
BEGIN
    -- Get profile details
    SELECT 
        id,
        user_id,
        company_email,
        full_name,
        company_phone,
        personal_phone,
        affiliatewp_id
    INTO profile_record
    FROM public.profiles
    WHERE id = profile_id_param;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Profile not found'
        );
    END IF;

    IF profile_record.affiliatewp_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Profile already has an AffiliateWP account',
            'affiliatewp_id', profile_record.affiliatewp_id
        );
    END IF;

    -- Create sync log entry
    INSERT INTO public.affiliatewp_sync_log (
        profile_id,
        affiliatewp_id,
        operation,
        sync_direction,
        status,
        request_payload,
        retry_count
    ) VALUES (
        profile_record.id,
        NULL,
        'manual',
        'portal_to_affiliatewp',
        'pending',
        jsonb_build_object(
            'profile_id', profile_record.id,
            'user_id', profile_record.user_id,
            'email', profile_record.company_email,
            'name', profile_record.full_name,
            'phone', COALESCE(profile_record.company_phone, profile_record.personal_phone),
            'trigger', 'manual'
        ),
        0
    )
    RETURNING id INTO log_id;

    -- Update profile sync status
    UPDATE public.profiles
    SET 
        affiliatewp_sync_status = 'pending',
        affiliatewp_account_status = 'pending'
    WHERE id = profile_id_param;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'AffiliateWP account creation queued',
        'log_id', log_id,
        'profile_id', profile_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_pending_affiliatewp_creations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION manual_create_affiliatewp_account(uuid) TO authenticated, service_role;

-- Create an index to speed up pending operations query
CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_log_pending_operations 
ON public.affiliatewp_sync_log(created_at) 
WHERE status = 'pending' AND operation = 'create';

-- Log that auto-trigger is now enabled
DO $$
BEGIN
    RAISE NOTICE 'AffiliateWP auto-creation trigger installed successfully';
    RAISE NOTICE 'New sales rep signups will automatically queue affiliate account creation';
END $$;
