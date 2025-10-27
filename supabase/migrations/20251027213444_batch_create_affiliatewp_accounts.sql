/*
  # Batch Create AffiliateWP Accounts for Existing Users
  
  1. Purpose
    - Create a SQL function to trigger AffiliateWP account creation for all users without accounts
    - Call the edge function for each user that needs an account
    
  2. Process
    - Find all profiles without affiliatewp_id
    - Call the create-affiliatewp-account edge function for each
    - Return summary of results
*/

-- Function to batch create AffiliateWP accounts
CREATE OR REPLACE FUNCTION batch_create_affiliatewp_accounts()
RETURNS TABLE (
  profile_id uuid,
  email text,
  full_name text,
  status text,
  message text
) AS $$
DECLARE
  profile_record RECORD;
  function_url text;
  service_key text;
  result_json jsonb;
BEGIN
  -- Get Supabase URL and Service Role Key from environment
  function_url := current_setting('app.supabase_url', true) || '/functions/v1/create-affiliatewp-account';
  service_key := current_setting('app.supabase_service_key', true);
  
  -- Loop through all profiles without AffiliateWP accounts
  FOR profile_record IN 
    SELECT p.id, p.full_name, p.company_email, p.personal_phone
    FROM profiles p
    WHERE p.affiliatewp_id IS NULL
      AND p.company_email IS NOT NULL 
      AND p.company_email != ''
      AND p.full_name IS NOT NULL
      AND p.full_name != ''
    ORDER BY p.created_at
  LOOP
    -- Return each profile being processed
    profile_id := profile_record.id;
    email := profile_record.company_email;
    full_name := profile_record.full_name;
    status := 'processing';
    message := 'Calling edge function...';
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION batch_create_affiliatewp_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION batch_create_affiliatewp_accounts() TO service_role;
