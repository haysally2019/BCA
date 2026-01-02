/*
  # Create Proposals System
  
  1. New Tables
    - `proposals`
      - `id` (uuid, primary key)
      - `lead_id` (uuid) - Reference to leads table
      - `created_by` (uuid) - User who created the proposal
      - `company_name` (text) - Prospect's company name
      - `contact_name` (text) - Prospect's contact name
      - `contact_email` (text) - Prospect's email
      - `contact_phone` (text) - Prospect's phone
      - `package_name` (text) - Selected package/plan
      - `monthly_investment` (numeric) - Monthly cost
      - `annual_value` (numeric) - Annual contract value
      - `proposal_content` (text) - Full proposal text
      - `affiliate_link` (text) - Sales rep's affiliate link
      - `sent_via` (text) - How it was sent: 'email', 'sms', 'both'
      - `sent_at` (timestamptz) - When proposal was sent
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes to Existing Tables
    - Update leads table status enum to include 'proposal_sent'
  
  3. Security
    - Enable RLS on `proposals` table
    - Users can view their own proposals
    - Users can create proposals for their leads
    - Managers/admins can view all proposals in their company
*/

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  package_name text NOT NULL DEFAULT 'Standard Plan',
  monthly_investment numeric DEFAULT 299,
  annual_value numeric DEFAULT 3588,
  proposal_content text NOT NULL,
  affiliate_link text,
  sent_via text CHECK (sent_via IN ('email', 'sms', 'both')) DEFAULT 'email',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_sent_at ON proposals(sent_at DESC);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own proposals
CREATE POLICY "Users can view own proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Policy: Managers can view all proposals in their company
CREATE POLICY "Managers can view company proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
      AND EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.user_id = proposals.created_by
        AND p2.company_id = profiles.company_id
      )
    )
  );

-- Policy: Users can create proposals for their leads
CREATE POLICY "Users can create proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = proposals.lead_id
      AND leads.assigned_to = auth.uid()::text
    )
  );

-- Policy: Users can update their own proposals
CREATE POLICY "Users can update own proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Add 'proposal_sent' to leads status - include all existing statuses
DO $$
BEGIN
  -- Check if the status column exists and update the constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'status'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
    
    -- Add new constraint with proposal_sent included plus all existing statuses
    ALTER TABLE leads ADD CONSTRAINT leads_status_check 
      CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'trial_started', 'closed_won', 'closed_lost'));
  END IF;
END $$;

-- Create function to auto-update lead status when proposal is sent
CREATE OR REPLACE FUNCTION update_lead_status_on_proposal()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the lead status to 'proposal_sent'
  UPDATE leads
  SET 
    status = 'proposal_sent',
    updated_at = now()
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update lead status
DROP TRIGGER IF EXISTS trigger_update_lead_on_proposal ON proposals;
CREATE TRIGGER trigger_update_lead_on_proposal
  AFTER INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_status_on_proposal();
