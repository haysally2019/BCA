/*
  # Add Cold Call Pool System

  1. Changes
    - Add `is_pool_lead` boolean field to leads table to distinguish pool leads from claimed leads
    - Add `claimed_by` field to track which rep claimed the lead
    - Add `claimed_at` timestamp to track when lead was claimed
    - Update RLS policies to allow all authenticated users to view pool leads
    - Add policy to allow reps to claim leads by updating them

  2. Security
    - Pool leads (is_pool_lead = true) are visible to all authenticated users
    - Reps can update pool leads to claim them
    - Once claimed, leads follow normal RLS policies
*/

-- Add new columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS is_pool_lead boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_by text,
ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Mark imported leads as pool leads
UPDATE leads 
SET is_pool_lead = true 
WHERE notes = 'Imported from roofing leads list';

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Universal company leads access" ON leads;

-- Create new SELECT policy that includes pool leads
CREATE POLICY "Universal access to leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    -- Pool leads visible to everyone
    is_pool_lead = true
    OR
    -- Regular company leads
    CASE get_user_role()
      WHEN 'admin' THEN true
      ELSE (company_id = get_user_company_id())
    END
  );

-- Allow reps to claim pool leads
CREATE POLICY "Claim pool leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (
    is_pool_lead = true AND claimed_by IS NULL
  )
  WITH CHECK (
    claimed_by = auth.uid()::text AND is_pool_lead = false
  );

-- Create index for faster pool lead queries
CREATE INDEX IF NOT EXISTS idx_leads_pool ON leads(is_pool_lead) WHERE is_pool_lead = true;
CREATE INDEX IF NOT EXISTS idx_leads_claimed_by ON leads(claimed_by) WHERE claimed_by IS NOT NULL;