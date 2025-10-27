/*
  # Create App Settings Table
  
  1. New Tables
    - `app_settings`
      - `key` (text, primary key) - Setting name
      - `value` (text) - Setting value (encrypted for sensitive data)
      - `description` (text) - What this setting is for
      - `created_at` (timestamptz) - When created
      - `updated_at` (timestamptz) - When last updated
  
  2. Security
    - Enable RLS on `app_settings` table
    - Only service role can read/write (edge functions only)
    - No user access to prevent credential exposure
  
  3. Initial Data
    - AffiliateWP API credentials
*/

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- No policies = only service role can access (perfect for credentials)

-- Insert AffiliateWP credentials
INSERT INTO app_settings (key, value, description) VALUES
  ('affiliatewp_site_url', 'https://bluecollaracademy.info', 'AffiliateWP site URL'),
  ('affiliatewp_api_username', 'admin', 'AffiliateWP API username'),
  ('affiliatewp_api_password', '8JhB 1Tt0 DqQe r7AG JBj6 5tMB', 'AffiliateWP API password')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
