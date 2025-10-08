/*
  # Row Level Security (RLS) Setup

  This migration sets up comprehensive Row Level Security for all tables in the sales management system.

  ## Security Overview
  - All tables have RLS enabled for complete data protection
  - Users can only access data from their own company
  - Sales reps can only see their own leads/deals unless they're managers
  - Managers can see all company data
  - Proper authentication checks on all policies

  ## Policy Structure
  - SELECT policies: Control read access to data
  - INSERT policies: Control creation of new records  
  - UPDATE policies: Control modification of existing records
  - DELETE policies: Control deletion permissions

  ## User Roles
  - sales_rep: Can manage own leads/deals/appointments
  - manager: Can manage all company data
  - admin: Full system access
*/

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's profile
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS profiles AS $$
DECLARE
    profile_record profiles;
BEGIN
    SELECT * INTO profile_record
    FROM profiles 
    WHERE user_id = auth.uid();
    
    RETURN profile_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is manager or admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS boolean AS $$
DECLARE
    user_profile profiles;
BEGIN
    user_profile := get_user_profile();
    RETURN user_profile.user_role IN ('manager', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's company ID
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid AS $$
DECLARE
    user_profile profiles;
BEGIN
    user_profile := get_user_profile();
    RETURN user_profile.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Managers can view all company profiles
CREATE POLICY "Managers can view company profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    is_manager_or_admin() AND 
    id IN (
      SELECT p.id FROM profiles p
      WHERE p.company_name = (SELECT company_name FROM profiles WHERE user_id = auth.uid())
    )
  );

-- SALES_REPS TABLE POLICIES
CREATE POLICY "Sales reps can view own data"
  ON sales_reps FOR SELECT
  TO authenticated
  USING (profile_id = get_user_company_id());

CREATE POLICY "Sales reps can update own data"
  ON sales_reps FOR UPDATE
  TO authenticated
  USING (profile_id = get_user_company_id())
  WITH CHECK (profile_id = get_user_company_id());

CREATE POLICY "Managers can manage sales reps"
  ON sales_reps FOR ALL
  TO authenticated
  USING (
    is_manager_or_admin() AND 
    profile_id IN (
      SELECT p.id FROM profiles p
      WHERE p.company_name = (SELECT company_name FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    is_manager_or_admin() AND 
    profile_id IN (
      SELECT p.id FROM profiles p
      WHERE p.company_name = (SELECT company_name FROM profiles WHERE user_id = auth.uid())
    )
  );

-- LEAD_SOURCES TABLE POLICIES
CREATE POLICY "Users can view company lead sources"
  ON lead_sources FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_manager_or_admin());

CREATE POLICY "Managers can manage lead sources"
  ON lead_sources FOR ALL
  TO authenticated
  USING (is_manager_or_admin() AND company_id = get_user_company_id())
  WITH CHECK (is_manager_or_admin() AND company_id = get_user_company_id());

-- LEADS TABLE POLICIES
CREATE POLICY "Sales reps can view own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    assigned_rep_id = get_user_company_id() OR 
    company_id = get_user_company_id() OR
    is_manager_or_admin()
  );

CREATE POLICY "Sales reps can create company leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Sales reps can update own leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    assigned_rep_id = get_user_company_id() OR 
    is_manager_or_admin()
  )
  WITH CHECK (
    assigned_rep_id = get_user_company_id() OR 
    is_manager_or_admin()
  );

CREATE POLICY "Managers can delete company leads"
  ON leads FOR DELETE
  TO authenticated
  USING (is_manager_or_admin() AND company_id = get_user_company_id());

-- LEAD_ACTIVITIES TABLE POLICIES
CREATE POLICY "Users can view activities for accessible leads"
  ON lead_activities FOR SELECT
  TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads 
      WHERE assigned_rep_id = get_user_company_id() OR 
            company_id = get_user_company_id() OR
            is_manager_or_admin()
    )
  );

CREATE POLICY "Users can create activities for accessible leads"
  ON lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads 
      WHERE assigned_rep_id = get_user_company_id() OR 
            company_id = get_user_company_id()
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own activities"
  ON lead_activities FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_manager_or_admin())
  WITH CHECK (user_id = auth.uid() OR is_manager_or_admin());

-- DEAL_STAGES TABLE POLICIES
CREATE POLICY "Users can view company deal stages"
  ON deal_stages FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Managers can manage deal stages"
  ON deal_stages FOR ALL
  TO authenticated
  USING (is_manager_or_admin() AND company_id = get_user_company_id())
  WITH CHECK (is_manager_or_admin() AND company_id = get_user_company_id());

-- DEALS TABLE POLICIES
CREATE POLICY "Sales reps can view own deals"
  ON deals FOR SELECT
  TO authenticated
  USING (
    assigned_rep_id = get_user_company_id() OR 
    company_id = get_user_company_id() OR
    is_manager_or_admin()
  );

CREATE POLICY "Sales reps can create company deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id() AND
    assigned_rep_id = get_user_company_id()
  );

CREATE POLICY "Sales reps can update own deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (
    assigned_rep_id = get_user_company_id() OR 
    is_manager_or_admin()
  )
  WITH CHECK (
    assigned_rep_id = get_user_company_id() OR 
    is_manager_or_admin()
  );

CREATE POLICY "Managers can delete company deals"
  ON deals FOR DELETE
  TO authenticated
  USING (is_manager_or_admin() AND company_id = get_user_company_id());

-- DEAL_ACTIVITIES TABLE POLICIES
CREATE POLICY "Users can view activities for accessible deals"
  ON deal_activities FOR SELECT
  TO authenticated
  USING (
    deal_id IN (
      SELECT id FROM deals 
      WHERE assigned_rep_id = get_user_company_id() OR 
            company_id = get_user_company_id() OR
            is_manager_or_admin()
    )
  );

CREATE POLICY "Users can create activities for accessible deals"
  ON deal_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    deal_id IN (
      SELECT id FROM deals 
      WHERE assigned_rep_id = get_user_company_id() OR 
            company_id = get_user_company_id()
    ) AND user_id = auth.uid()
  );

-- APPOINTMENT_TYPES TABLE POLICIES
CREATE POLICY "Users can view company appointment types"
  ON appointment_types FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Managers can manage appointment types"
  ON appointment_types FOR ALL
  TO authenticated
  USING (is_manager_or_admin() AND company_id = get_user_company_id())
  WITH CHECK (is_manager_or_admin() AND company_id = get_user_company_id());

-- APPOINTMENTS TABLE POLICIES
CREATE POLICY "Sales reps can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    assigned_rep_id = get_user_company_id() OR 
    company_id = get_user_company_id() OR
    is_manager_or_admin()
  );

CREATE POLICY "Sales reps can create company appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id() AND
    assigned_rep_id = get_user_company_id()
  );

CREATE POLICY "Sales reps can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    assigned_rep_id = get_user_company_id() OR 
    is_manager_or_admin()
  )
  WITH CHECK (
    assigned_rep_id = get_user_company_id() OR 
    is_manager_or_admin()
  );

CREATE POLICY "Users can delete own appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (
    assigned_rep_id = get_user_company_id() OR 
    is_manager_or_admin()
  );

-- COMMISSION_STRUCTURES TABLE POLICIES
CREATE POLICY "Users can view company commission structures"
  ON commission_structures FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Managers can manage commission structures"
  ON commission_structures FOR ALL
  TO authenticated
  USING (is_manager_or_admin() AND company_id = get_user_company_id())
  WITH CHECK (is_manager_or_admin() AND company_id = get_user_company_id());

-- COMMISSIONS TABLE POLICIES
CREATE POLICY "Sales reps can view own commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (
    rep_id = get_user_company_id() OR 
    company_id = get_user_company_id() OR
    is_manager_or_admin()
  );

CREATE POLICY "System can create commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Managers can update commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (is_manager_or_admin() AND company_id = get_user_company_id())
  WITH CHECK (is_manager_or_admin() AND company_id = get_user_company_id());

-- COMMISSION_PAYMENTS TABLE POLICIES
CREATE POLICY "Sales reps can view own payments"
  ON commission_payments FOR SELECT
  TO authenticated
  USING (
    rep_id = get_user_company_id() OR 
    company_id = get_user_company_id() OR
    is_manager_or_admin()
  );

CREATE POLICY "Managers can manage commission payments"
  ON commission_payments FOR ALL
  TO authenticated
  USING (is_manager_or_admin() AND company_id = get_user_company_id())
  WITH CHECK (is_manager_or_admin() AND company_id = get_user_company_id());