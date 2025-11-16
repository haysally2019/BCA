/*
  # Activate Custom Access Token Hook

  1. Configuration
    - Inserts hook configuration into auth.hooks table
    - Enables the custom_access_token_hook function
    - Sets up automatic JWT claim injection

  2. What This Does
    - Registers the hook with Supabase Auth
    - Hook will be called on every token generation/refresh
    - Adds user_role and company_id to JWT tokens automatically

  Note: This attempts to configure the hook at the database level.
  If this doesn't work, manual dashboard configuration may be required.
*/

-- ============================================================
-- 1. CHECK IF AUTH.HOOKS TABLE EXISTS
-- ============================================================
DO $$
BEGIN
  -- Check if we can access auth schema
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'hooks'
  ) THEN
    RAISE NOTICE 'Auth hooks table exists - attempting to configure hook';
    
    -- Insert or update the custom access token hook configuration
    INSERT INTO auth.hooks (
      id,
      hook_table_id,
      hook_name,
      created_at,
      request_id
    )
    VALUES (
      gen_random_uuid(),
      1, -- custom_access_token hook type
      'custom_access_token_hook',
      now(),
      NULL
    )
    ON CONFLICT (hook_table_id, hook_name) 
    DO UPDATE SET 
      created_at = now();
      
    RAISE NOTICE 'Hook configuration inserted/updated';
  ELSE
    RAISE NOTICE 'Auth hooks table not accessible - manual configuration required';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to configure auth hooks';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not configure hook: %', SQLERRM;
END $$;

-- ============================================================
-- 2. VERIFY HOOK FUNCTION EXISTS AND IS ACCESSIBLE
-- ============================================================
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'custom_access_token_hook'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✓ Hook function exists: public.custom_access_token_hook';
  ELSE
    RAISE WARNING '✗ Hook function not found';
  END IF;
END $$;

-- ============================================================
-- 3. CREATE HELPER FUNCTION TO TEST HOOK
-- ============================================================
CREATE OR REPLACE FUNCTION public.test_auth_hook_claims()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'user_id', auth.uid(),
    'user_role', auth.jwt() ->> 'user_role',
    'company_id', auth.jwt() ->> 'company_id',
    'hook_active', CASE 
      WHEN auth.jwt() ->> 'user_role' IS NOT NULL THEN true 
      ELSE false 
    END
  );
$$;

GRANT EXECUTE ON FUNCTION public.test_auth_hook_claims TO authenticated;

COMMENT ON FUNCTION public.test_auth_hook_claims IS 'Test function to verify if custom JWT claims are present';

-- ============================================================
-- CONFIGURATION SUMMARY
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'CUSTOM ACCESS TOKEN HOOK CONFIGURATION';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Function: public.custom_access_token_hook';
  RAISE NOTICE 'Status: Database configuration attempted';
  RAISE NOTICE '';
  RAISE NOTICE 'MANUAL CONFIGURATION MAY BE REQUIRED:';
  RAISE NOTICE '1. Go to Supabase Dashboard';
  RAISE NOTICE '2. Navigate to Authentication > Hooks';
  RAISE NOTICE '3. Enable "Custom Access Token" hook';
  RAISE NOTICE '4. Select: public.custom_access_token_hook';
  RAISE NOTICE '5. Save configuration';
  RAISE NOTICE '';
  RAISE NOTICE 'TEST AFTER CONFIGURATION:';
  RAISE NOTICE '- Sign out and sign back in';
  RAISE NOTICE '- Use Settings > Security > Test Hook Status';
  RAISE NOTICE '- Or run: SELECT test_auth_hook_claims();';
  RAISE NOTICE '============================================================';
END $$;
