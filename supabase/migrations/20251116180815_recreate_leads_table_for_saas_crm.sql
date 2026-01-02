/*
  # Recreate Leads Table for SaaS CRM (FIXED)

  1. Changes
    - Drop existing leads table with all dependencies
    - Create new leads table with SaaS-focused fields AND 'assigned_to'
    - Fix RLS policies to allow Manager/Admin access to company leads
    
  2. Security
    - Enable RLS on leads table
    - Policies distinguish between "Individual Reps" and "Managers"
*/

-- ============================================================
-- 1. DROP OLD TABLE (if it exists)
-- ============================================================
DROP TABLE IF EXISTS leads CASCADE;

-- ============================================================
-- 2. RECREATE CLEAN LEADS TABLE FOR SaaS CRM
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),

    company_name text,
    contact_name text,
    email text,
    phone text,

    service_area text,
    company_size text,
    crm_used_now text,

    status text DEFAULT 'new',
    deal_value numeric DEFAULT 0,
    notes text,

    -- Multi-tenancy fields
    company_id text,
    user_id text,          -- The creator of the lead
    assigned_to text       -- The rep currently working the lead
);

-- ============================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. POLICIES (Access Control)
-- ============================================================

-- A. VIEW LEADS
-- 1. Users can see leads they created OR are assigned to
-- 2. Managers/Admins can see ALL leads for their company
CREATE POLICY "View Permissions" 
ON leads
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text 
  OR 
  assigned_to = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id::text = leads.company_id 
      AND profiles.user_role IN ('admin', 'manager', 'owner')
  )
);

-- B. INSERT LEADS
-- Users can insert leads. Usually, they tag themselves as user_id.
CREATE POLICY "Insert Permissions" 
ON leads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id::text = company_id
  )
);

-- C. UPDATE LEADS
-- 1. Users can update their own leads
-- 2. Managers can update any company lead
CREATE POLICY "Update Permissions" 
ON leads
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()::text 
  OR 
  assigned_to = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id::text = leads.company_id 
      AND profiles.user_role IN ('admin', 'manager', 'owner')
  )
);

-- D. DELETE LEADS
-- Only Managers/Admins or the owner can delete
CREATE POLICY "Delete Permissions" 
ON leads
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()::text 
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id::text = leads.company_id 
      AND profiles.user_role IN ('admin', 'manager', 'owner')
  )
);

-- ============================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);