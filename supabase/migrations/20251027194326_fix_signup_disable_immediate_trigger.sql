/*
  # Fix Signup Issue - Disable Immediate pg_net Trigger
  
  ## Problem
  The immediate pg_net trigger (trigger_invoke_affiliatewp_immediately) is causing
  signup failures with "Database error saving new user". This is likely because:
  1. The trigger tries to access app_settings during signup transaction
  2. The service role key may not be configured yet
  3. pg_net HTTP calls during INSERT transaction can cause issues
  
  ## Solution
  - Disable the immediate pg_net trigger temporarily
  - Keep the BEFORE INSERT queue trigger (trigger_queue_affiliatewp_creation)
  - Keep the pg_cron batch processor which will process pending entries every 3 minutes
  - This ensures signups always succeed, with AffiliateWP creation happening shortly after
  
  ## Result
  - Signups will complete successfully
  - AffiliateWP accounts will be created within 3 minutes by pg_cron
  - System remains scalable and handles high volume
*/

-- Disable the immediate pg_net trigger
DROP TRIGGER IF EXISTS trigger_invoke_affiliatewp_immediately ON public.profiles;

-- The system now works as follows:
-- 1. User signs up → Profile created
-- 2. BEFORE INSERT trigger queues creation in affiliatewp_sync_log (status: pending)
-- 3. Signup completes immediately
-- 4. pg_cron runs every 3 minutes and processes all pending entries
-- 5. Edge Function creates AffiliateWP account
-- 6. Profile updated with AffiliateWP ID

-- Log the change
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fixed Signup Issue';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Disabled immediate pg_net trigger to fix signup errors';
    RAISE NOTICE 'AffiliateWP accounts will now be created by pg_cron every 3 minutes';
    RAISE NOTICE 'This ensures signups always succeed while maintaining automatic creation';
    RAISE NOTICE '';
    RAISE NOTICE 'System Flow:';
    RAISE NOTICE '  1. User signs up → Profile created successfully';
    RAISE NOTICE '  2. Entry queued in affiliatewp_sync_log';
    RAISE NOTICE '  3. pg_cron processes queue every 3 minutes';
    RAISE NOTICE '  4. AffiliateWP account created in WordPress';
    RAISE NOTICE '  5. Profile updated with AffiliateWP ID';
    RAISE NOTICE '';
    RAISE NOTICE 'To manually process now: SELECT process_pending_affiliatewp_batch();';
END $$;
