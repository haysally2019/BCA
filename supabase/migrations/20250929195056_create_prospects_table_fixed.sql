/*
  # Create prospects table

  1. New Tables
    - `prospects`
      - `id` (uuid, primary key)  
      - `company_id` (uuid, references profiles)
      - `company_name` (text)
      - `contact_name` (text) 
      - `email` (text)
      - `phone` (text)
      - `status` (enum: lead, qualified, demo_scheduled, demo_completed, proposal_sent, negotiating, closed_won, closed_lost)
      - `deal_value` (numeric)
      - `probability` (integer 0-100)
      - `source` (text)
      - `assigned_rep_id` (uuid, references profiles)
      - `company_size` (text)
      - `current_crm` (text)
      - `pain_points` (text array)
      - `decision_maker` (boolean)
      - `notes` (text)
      - `last_contact_date` (timestamptz)
      - `next_follow_up_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `prospects` table
    - Add policies for authenticated users to manage their company prospects
    
  3. Important Notes
    - This table is for managing business prospects (potential clients for the CRM software)
    - Different from leads table which tracks roofing leads for individual companies
    - Includes CRM-specific fields like current_crm, company_size, pain_points
*/

-- Create enum for prospect status
DO $$ BEGIN
  CREATE TYPE prospect_status AS ENUM (
    'lead',
    'qualified', 
    'demo_scheduled',
    'demo_completed',
    'proposal_sent',
    'negotiating',
    'closed_won',
    'closed_lost'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create prospects table
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text,
  phone text NOT NULL,
  status prospect_status DEFAULT 'lead',
  deal_value numeric DEFAULT 0,
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  source text DEFAULT 'website',
  assigned_rep_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  company_size text,
  current_crm text,
  pain_points text[],
  decision_maker boolean DEFAULT false,
  notes text,
  last_contact_date timestamptz DEFAULT now(),
  next_follow_up_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their company prospects"
  ON prospects FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create prospects for their company" 
  ON prospects FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company prospects"
  ON prospects FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company prospects"
  ON prospects FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS prospects_company_id_idx ON prospects(company_id);
CREATE INDEX IF NOT EXISTS prospects_status_idx ON prospects(status);
CREATE INDEX IF NOT EXISTS prospects_assigned_rep_id_idx ON prospects(assigned_rep_id);
CREATE INDEX IF NOT EXISTS prospects_created_at_idx ON prospects(created_at DESC);