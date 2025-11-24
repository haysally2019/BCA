/*
  # Fix queue_affiliatewp_account_creation Trigger to Match Actual Schema

  1. Problem
    - queue_affiliatewp_account_creation() references columns that don't exist
    - References: company_email, personal_phone, company_phone
    - Actual columns: email, phone_number
    - Causing BEFORE INSERT trigger to fail

  2. Solution
    - Update function to use correct column names
    - Use 'email' instead of 'company_email'
    - Use 'phone_number' instead of 'company_phone' or 'personal_phone'

  3. Changes
    - Rewrite queue function to match actual schema
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
        operation,
        sync_direction,
        status,
        request_payload,
        retry_count,
        metadata
      ) VALUES (
        NEW.user_id,  -- Using user_id since there's no separate id column
        NULL,
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
        jsonb_build_object('created_at', NOW())
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

-- Set owner to postgres to bypass RLS
ALTER FUNCTION public.queue_affiliatewp_account_creation() OWNER TO postgres;

COMMENT ON FUNCTION public.queue_affiliatewp_account_creation() IS
  'Queues AffiliateWP account creation for new sales rep profiles. Updated to use actual schema column names: email, phone_number, user_id.';

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_queue_affiliatewp_creation ON public.profiles;

CREATE TRIGGER trigger_queue_affiliatewp_creation
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION queue_affiliatewp_account_creation();

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Fixed queue_affiliatewp_account_creation trigger';
  RAISE NOTICE 'Now uses correct column names: email, phone_number, user_id';
  RAISE NOTICE 'Signup should now work correctly';
  RAISE NOTICE '=================================================================';
END $$;
