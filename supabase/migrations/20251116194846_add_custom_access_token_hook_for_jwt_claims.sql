/*
  # Add Custom JWT Claims via Access Token Hook

  1. New Functions
    - `custom_access_token_hook()` - Hook function called by Supabase Auth
      - Fetches user_role and company_id from profiles table
      - Adds claims to JWT token via app_metadata
      - Called automatically on token generation/refresh
    
  2. Integration
    - Uses Supabase's pg_net extension for custom claims
    - Claims accessible via auth.jwt() in RLS policies
    - Example: (auth.jwt()->>'user_role') = 'manager'
    
  3. Benefits
    - No need to query profiles table for every RLS check
    - Faster policy evaluation
    - Claims embedded directly in JWT token
    - Automatic updates on token refresh

  Note: This creates the function. You may need to configure the Auth hook
  in Supabase Dashboard under Authentication > Hooks if using Supabase Platform.
*/

-- ============================================================
-- 1. CREATE CUSTOM ACCESS TOKEN HOOK FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_data record;
  claims jsonb;
BEGIN
  -- Extract user_id from the event
  -- The event contains user_id, claims, and other auth data
  
  -- Fetch user_role and company_id from profiles
  SELECT user_role, company_id
  INTO user_data
  FROM public.profiles
  WHERE user_id = (event->>'user_id')::uuid;

  -- Get existing claims from event
  claims := event->'claims';

  -- Add custom claims
  IF user_data.user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_data.user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', to_jsonb('sales_rep'));
  END IF;

  IF user_data.company_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{company_id}', to_jsonb(user_data.company_id));
  ELSE
    claims := jsonb_set(claims, '{company_id}', to_jsonb((event->>'user_id')::text));
  END IF;

  -- Return the modified event with new claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- ============================================================
-- 2. GRANT EXECUTE PERMISSION TO SUPABASE AUTH
-- ============================================================
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- ============================================================
-- 3. REVOKE FROM PUBLIC FOR SECURITY
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- ============================================================
-- NEXT STEPS (Manual Configuration Required)
-- ============================================================
-- To activate this hook, you need to:
-- 1. Go to Supabase Dashboard > Authentication > Hooks
-- 2. Enable "Custom Access Token" hook
-- 3. Select the function: public.custom_access_token_hook
-- 
-- OR use Supabase CLI:
-- supabase secrets set --env-file .env AUTH_HOOK_CUSTOM_ACCESS_TOKEN_URI=pg-functions://postgres/public/custom_access_token_hook
--
-- After activation, JWT tokens will include user_role and company_id claims
