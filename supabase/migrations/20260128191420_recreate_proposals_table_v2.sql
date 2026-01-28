/*
  # Recreate Proposals Table

  1. New Tables
    - `proposals`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, nullable) - Reference to leads table
      - `created_by` (uuid, nullable) - User who created the proposal
      - `company_name` (text) - Prospect's company name
      - `contact_name` (text) - Prospect's contact name
      - `contact_email` (text) - Prospect's email
      - `contact_phone` (text) - Prospect's phone
      - `package_name` (text) - Selected package/plan
      - `monthly_investment` (numeric) - Monthly cost
      - `annual_value` (numeric) - Annual contract value
      - `amount` (numeric) - Total amount
      - `proposal_content` (text) - Full proposal text
      - `affiliate_link` (text) - Sales rep's affiliate link
      - `sent_via` (text) - How it was sent: 'email', 'sms', 'both'
      - `sent_at` (timestamptz) - When proposal was sent
      - `viewed_at` (timestamptz) - When proposal was viewed
      - `responded_at` (timestamptz) - When prospect responded
      - `status` (enum) - Proposal status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `proposals` table
    - Users can view their own proposals
    - Users can create proposals
    - Managers/admins can view all proposals in their company
*/

-- Create proposal status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
    CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected');
  END IF;
END $$;

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  package_name text NOT NULL DEFAULT 'Standard Plan',
  monthly_investment numeric DEFAULT 299,
  annual_value numeric DEFAULT 3588,
  amount numeric DEFAULT 3588,
  proposal_content text NOT NULL,
  affiliate_link text,
  sent_via text CHECK (sent_via IN ('email', 'sms', 'both')) DEFAULT 'email',
  sent_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  status proposal_status DEFAULT 'sent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_sent_at ON proposals(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

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

-- Policy: Users can create proposals
CREATE POLICY "Users can create proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own proposals
CREATE POLICY "Users can update own proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own proposals
CREATE POLICY "Users can delete own proposals"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Policy: Managers can update company proposals
CREATE POLICY "Managers can update company proposals"
  ON proposals
  FOR UPDATE
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