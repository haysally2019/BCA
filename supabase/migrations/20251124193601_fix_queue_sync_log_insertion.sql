/*
  # Fix AffiliateWP Sync Log Insertion

  1. Problem
    - sync_type is required (NOT NULL) but not being set
    - Causing queue function to fail silently

  2. Solution
    - Add sync_type to the INSERT statement
    - Set it to 'affiliate_creation' for account creation operations

  3. Changes
    - Update queue function to include sync_type
*/

CREATE OR REPLACE FUNCTION public.queue_affiliatewp_account_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is a sales_rep and doesn't already have an affiliate ID
  IF NEW.user_role = 'sales_rep' AND (NEW.affiliatewp_id IS NULL OR NEW.affiliatewp_id = 0) THEN
    BEGIN
      -- Create a sync log entry to track this operation
      INSERT INTO public.affiliatewp_sync_log (
        profile_id,
        affiliatewp_id,
        sync_type,
        operation,
        sync_direction,
        status,
        request_payload,
        retry_count,
        metadata,
        started_at
      ) VALUES (
        NEW.user_id,
        NULL,
        'affiliate_creation',
        'create',
        'portal_to_affiliatewp',
        'pending',
        jsonb_build_object(
          'profile_id', NEW.user_id,
          'user_id', NEW.user_id,
          'email', COALESCE(NEW.email, 'unknown@example.com'),
          'name', COALESCE(NEW.full_name, NEW.company_name, 'New User'),
          'phone', NEW.phone_number,
          'trigger', 'auto_signup'
        ),
        0,
        jsonb_build_object('created_at', NOW()),
        NOW()
      );

      -- Update profile sync status
      NEW.affiliatewp_sync_status := 'pending';
      NEW.affiliatewp_account_status := 'pending';

      RAISE LOG 'Queued AffiliateWP account creation for profile: %, email: %', NEW.user_id, COALESCE(NEW.email, 'unknown');
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the profile creation
        RAISE LOG 'Failed to queue AffiliateWP creation for profile %: % %. Profile creation will continue.', NEW.user_id, SQLSTATE, SQLERRM;
        -- Set sync status to failed so we can retry later
        NEW.affiliatewp_sync_status := 'failed';
        NEW.affiliatewp_account_status := 'pending';
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.queue_affiliatewp_account_creation() OWNER TO postgres;

COMMENT ON FUNCTION public.queue_affiliatewp_account_creation() IS
  'Queues AffiliateWP account creation for new sales rep profiles. Includes sync_type field for proper logging.';

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Fixed queue function to include sync_type field';
  RAISE NOTICE 'AffiliateWP account creation queueing should now work';
  RAISE NOTICE '=================================================================';
END $$;
