/*
  # Fix Leads Table Foreign Keys with RLS

  1. Changes
    - Drop existing RLS policies
    - Convert assigned_to, user_id, and claimed_by columns from text to uuid
    - Add foreign key constraints to profiles table (user_id column)
    - Recreate RLS policies with proper UUID comparisons

  2. Security
    - Maintains all existing RLS policies
    - Updates policies to use proper UUID comparisons
*/

-- Step 1: Drop existing policies that depend on the columns
DROP POLICY IF EXISTS "Role-based lead update access" ON leads;
DROP POLICY IF EXISTS "Role-based lead insert access" ON leads;
DROP POLICY IF EXISTS "Role-based lead delete access" ON leads;
DROP POLICY IF EXISTS "Universal access to leads" ON leads;
DROP POLICY IF EXISTS "Claim pool leads" ON leads;

-- Step 2: Clean up any invalid data
UPDATE leads SET assigned_to = NULL WHERE assigned_to = '' OR assigned_to !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE leads SET user_id = NULL WHERE user_id = '' OR user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE leads SET claimed_by = NULL WHERE claimed_by = '' OR claimed_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 3: Change column types from text to uuid
ALTER TABLE leads 
  ALTER COLUMN assigned_to TYPE uuid USING assigned_to::uuid,
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ALTER COLUMN claimed_by TYPE uuid USING claimed_by::uuid;

-- Step 4: Add foreign key constraints (profiles table uses user_id as primary key)
ALTER TABLE leads
  ADD CONSTRAINT leads_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES profiles(user_id) 
  ON DELETE SET NULL;

ALTER TABLE leads
  ADD CONSTRAINT leads_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(user_id) 
  ON DELETE SET NULL;

ALTER TABLE leads
  ADD CONSTRAINT leads_claimed_by_fkey 
  FOREIGN KEY (claimed_by) 
  REFERENCES profiles(user_id) 
  ON DELETE SET NULL;

-- Step 5: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_claimed_by ON leads(claimed_by);
CREATE INDEX IF NOT EXISTS idx_leads_is_pool_lead ON leads(is_pool_lead) WHERE is_pool_lead = true;

-- Step 6: Recreate RLS policies with proper UUID comparisons
CREATE POLICY "Universal access to leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    is_pool_lead = true OR
    CASE get_user_role()
      WHEN 'admin' THEN true
      ELSE company_id = get_user_company_id()
    END
  );

CREATE POLICY "Role-based lead insert access"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE get_user_role()
      WHEN 'admin' THEN true
      WHEN 'manager' THEN company_id = get_user_company_id()
      ELSE user_id = auth.uid() AND company_id = get_user_company_id()
    END
  );

CREATE POLICY "Role-based lead update access"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    CASE get_user_role()
      WHEN 'admin' THEN true
      WHEN 'manager' THEN company_id = get_user_company_id()
      ELSE user_id = auth.uid() OR assigned_to = auth.uid()
    END
  )
  WITH CHECK (
    CASE get_user_role()
      WHEN 'admin' THEN true
      WHEN 'manager' THEN company_id = get_user_company_id()
      ELSE user_id = auth.uid() OR assigned_to = auth.uid()
    END
  );

CREATE POLICY "Role-based lead delete access"
  ON leads FOR DELETE
  TO authenticated
  USING (
    CASE get_user_role()
      WHEN 'admin' THEN true
      WHEN 'manager' THEN company_id = get_user_company_id()
      ELSE user_id = auth.uid()
    END
  );

CREATE POLICY "Claim pool leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (is_pool_lead = true AND claimed_by IS NULL)
  WITH CHECK (claimed_by = auth.uid() AND is_pool_lead = false);