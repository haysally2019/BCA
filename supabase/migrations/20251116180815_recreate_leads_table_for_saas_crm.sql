/*
  # Recreate Leads Table for SaaS CRM

  1. Changes
    - Drop existing leads table with all dependencies
    - Create new leads table with SaaS-focused fields:
      - company_name, contact_name, email, phone
      - service_area, company_size, crm_used_now
      - status, deal_value, notes
      - company_id and user_id for multi-tenancy
    
  2. Security
    - Enable RLS on leads table
    - Add policies for SELECT, INSERT, UPDATE, DELETE
    - Users can only access their own leads (user_id = auth.uid())
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

    company_id text,
    user_id text
);

-- ============================================================
-- 3. ENABLE ROW LEVEL SECURITY (required in Bolt/Supabase)
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. ALLOW USER TO READ ONLY THEIR OWN LEADS
-- ============================================================
CREATE POLICY "Users can select own leads" 
ON leads
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

-- ============================================================
-- 5. ALLOW USER TO INSERT ONLY THEIR OWN LEADS
-- ============================================================
CREATE POLICY "Users can insert own leads" 
ON leads
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- ============================================================
-- 6. ALLOW USER TO UPDATE ONLY THEIR OWN LEADS
-- ============================================================
CREATE POLICY "Users can update own leads" 
ON leads
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- ============================================================
-- 7. ALLOW USER TO DELETE ONLY THEIR OWN LEADS
-- ============================================================
CREATE POLICY "Users can delete own leads" 
ON leads
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

-- ============================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
