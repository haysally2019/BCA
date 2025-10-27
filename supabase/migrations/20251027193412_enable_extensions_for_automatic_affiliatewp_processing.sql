/*
  # Enable Extensions for Automatic AffiliateWP Processing
  
  1. Extensions Enabled
    - `pg_cron` - PostgreSQL job scheduler for batch processing
    - `pg_net` - Async HTTP requests from database triggers
  
  2. Purpose
    - pg_cron: Scheduled job to process pending AffiliateWP creations every 3 minutes
    - pg_net: Immediate HTTP invocation of Edge Function from database trigger
  
  3. Architecture
    - Immediate processing: Database trigger uses pg_net to invoke Edge Function
    - Backup processing: pg_cron processes any pending/failed entries every 3 minutes
    - This dual approach ensures no signup is missed even at high volume
  
  4. Security
    - pg_net requests use service role key for Edge Function authentication
    - Credentials stored in app_settings table (service role access only)
    - All HTTP requests are asynchronous and non-blocking
*/

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, service_role;

-- Log successful installation
DO $$
BEGIN
    RAISE NOTICE 'Extensions enabled successfully:';
    RAISE NOTICE '  - pg_cron: Scheduled job processor';
    RAISE NOTICE '  - pg_net: Async HTTP requests';
    RAISE NOTICE 'Ready for automatic AffiliateWP account creation at scale';
END $$;
