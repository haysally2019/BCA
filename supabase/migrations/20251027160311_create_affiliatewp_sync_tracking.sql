/*
  # AffiliateWP Sync Tracking System

  1. New Tables
    - `affiliatewp_sync_log`
      - `id` (uuid, primary key) - Unique identifier for sync log entry
      - `profile_id` (uuid) - Reference to profiles table
      - `operation` (text) - Type of operation (create, update, sync)
      - `status` (text) - Status of sync attempt (pending, success, failed)
      - `affiliatewp_id` (integer) - AffiliateWP affiliate ID (if successful)
      - `wordpress_user_id` (integer) - WordPress user ID (if created)
      - `request_payload` (jsonb) - API request data
      - `response_payload` (jsonb) - API response data
      - `error_message` (text) - Error message if failed
      - `retry_count` (integer) - Number of retry attempts
      - `last_retry_at` (timestamptz) - Timestamp of last retry
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update

  2. Security
    - Enable RLS on `affiliatewp_sync_log` table
    - Add policies for authenticated users to read their own sync logs
    - Add policies for service role to insert and update sync logs

  3. Indexes
    - Add index on profile_id for fast lookups
    - Add index on status for filtering failed syncs
    - Add index on created_at for chronological queries

  4. Important Notes
    - This table tracks all AffiliateWP account creation and sync attempts
    - Provides audit trail for troubleshooting integration issues
    - Enables manual retry of failed account creations
    - Stores both request and response data for debugging
*/

-- Create affiliatewp_sync_log table
CREATE TABLE IF NOT EXISTS public.affiliatewp_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('create', 'update', 'sync', 'retry')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  affiliatewp_id integer,
  wordpress_user_id integer,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  retry_count integer DEFAULT 0 NOT NULL,
  last_retry_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on affiliatewp_sync_log
ALTER TABLE public.affiliatewp_sync_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for affiliatewp_sync_log
CREATE POLICY "Users can read own sync logs"
  ON public.affiliatewp_sync_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = affiliatewp_sync_log.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can read team member sync logs"
  ON public.affiliatewp_sync_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      INNER JOIN public.profiles p2 ON p2.manager_id = p1.id
      WHERE p1.user_id = auth.uid()
      AND p2.id = affiliatewp_sync_log.profile_id
    )
  );

CREATE POLICY "Service role can insert sync logs"
  ON public.affiliatewp_sync_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update sync logs"
  ON public.affiliatewp_sync_log
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_log_profile_id 
  ON public.affiliatewp_sync_log(profile_id);

CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_log_status 
  ON public.affiliatewp_sync_log(status);

CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_log_created_at 
  ON public.affiliatewp_sync_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_log_affiliatewp_id 
  ON public.affiliatewp_sync_log(affiliatewp_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_affiliatewp_sync_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_affiliatewp_sync_log_updated_at_trigger 
  ON public.affiliatewp_sync_log;

CREATE TRIGGER update_affiliatewp_sync_log_updated_at_trigger
  BEFORE UPDATE ON public.affiliatewp_sync_log
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliatewp_sync_log_updated_at();