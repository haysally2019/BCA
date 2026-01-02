/*
  # Add Proposal Tracking Fields

  1. Changes to proposals table
    - Add `status` enum field to track proposal lifecycle (draft, sent, viewed, accepted, rejected)
    - Add `amount` field to store the deal value (derived from annual_value)
    - Add `viewed_at` timestamp to track when proposal was first viewed
    - Add `responded_at` timestamp to track when prospect responded
    - Add index on status for filtering performance
    - Add index on created_by for rep-specific queries

  2. Security
    - RLS policies already exist for proposals table
    - No changes needed to existing security model
*/

-- Create enum type for proposal status
DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new fields to proposals table
DO $$
BEGIN
  -- Add status field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'status'
  ) THEN
    ALTER TABLE proposals ADD COLUMN status proposal_status DEFAULT 'sent';
  END IF;

  -- Add amount field (stores the total deal value)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'amount'
  ) THEN
    ALTER TABLE proposals ADD COLUMN amount numeric DEFAULT 0;
  END IF;

  -- Add viewed_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'viewed_at'
  ) THEN
    ALTER TABLE proposals ADD COLUMN viewed_at timestamptz;
  END IF;

  -- Add responded_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'responded_at'
  ) THEN
    ALTER TABLE proposals ADD COLUMN responded_at timestamptz;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);

-- Update existing proposals to have amount equal to annual_value
UPDATE proposals SET amount = annual_value WHERE amount = 0 OR amount IS NULL;
