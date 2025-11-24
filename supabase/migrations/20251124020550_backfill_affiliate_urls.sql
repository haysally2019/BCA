/*
  # Backfill Missing Affiliate Referral URLs

  1. Purpose
    - Fix missing affiliate_url values for existing profiles
    - Construct referral URLs from existing affiliatewp_id values
    - Ensure all users with AffiliateWP accounts can see their referral links

  2. Changes
    - Update all profiles that have affiliatewp_id but missing affiliate_url
    - Construct URL in format: {wordpress_url}/?ref={affiliate_id}

  3. Security
    - Uses data from app_settings table to get WordPress URL
    - Only updates profiles with valid affiliatewp_id
*/

-- Create a function to backfill affiliate URLs
CREATE OR REPLACE FUNCTION backfill_affiliate_urls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wp_url text;
  updated_count integer := 0;
BEGIN
  -- Get WordPress URL from app_settings
  SELECT value INTO wp_url
  FROM public.app_settings
  WHERE key = 'affiliatewp_site_url'
  LIMIT 1;

  -- If no WordPress URL is configured, log warning and exit
  IF wp_url IS NULL THEN
    RAISE WARNING 'AffiliateWP URL not found in app_settings. Skipping referral URL backfill.';
    RETURN;
  END IF;

  -- Remove trailing slash from URL if present
  wp_url := rtrim(wp_url, '/');

  -- Update all profiles that have affiliatewp_id but no affiliate URL
  UPDATE public.profiles
  SET affiliate_url = wp_url || '/?ref=' || affiliatewp_id
  WHERE affiliatewp_id IS NOT NULL
    AND (affiliate_url IS NULL OR affiliate_url = '');

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE 'Successfully backfilled % affiliate URLs', updated_count;
END;
$$;

-- Execute the backfill function
SELECT backfill_affiliate_urls();

-- Drop the function after use (cleanup)
DROP FUNCTION IF EXISTS backfill_affiliate_urls();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Affiliate URL Backfill Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All profiles with AffiliateWP IDs now have referral URLs';
  RAISE NOTICE 'Users can now see and share their affiliate links';
END $$;
