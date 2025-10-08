/*
  # Fix Team Members RLS Policies

  ## Overview
  Updates Row Level Security policies for team management tables to properly handle
  the relationship between auth users and profile IDs.

  ## Problem
  The current RLS policies check `company_id = auth.uid()`, but `company_id` in these
  tables references `profiles(id)`, not `auth.users(id)`. This causes authorization
  failures when the Edge Function tries to create team members.

  ## Solution
  Update policies to use a subquery that maps auth.uid() to the user's profile ID,
  then checks if that profile ID matches the company_id.

  ## Changes
  1. Drop existing restrictive policies
  2. Create new policies that properly map auth.uid() -> profile.id -> company_id
  3. Maintain security by ensuring users can only access their own company data

  ## Security
  - Users can only view/manage team members in their own company
  - Authorization is based on the authenticated user's profile ID
  - Proper data isolation maintained between companies
*/

-- Drop existing policies that use incorrect auth.uid() checks
DROP POLICY IF EXISTS "Users can view team members in their company" ON team_members;
DROP POLICY IF EXISTS "Managers can insert team members" ON team_members;
DROP POLICY IF EXISTS "Managers can update team members" ON team_members;
DROP POLICY IF EXISTS "Managers can delete team members" ON team_members;

DROP POLICY IF EXISTS "Users can view performance history in their company" ON team_performance_history;
DROP POLICY IF EXISTS "Managers can insert performance records" ON team_performance_history;
DROP POLICY IF EXISTS "Managers can update performance records" ON team_performance_history;

DROP POLICY IF EXISTS "Users can view goals in their company" ON team_goals;
DROP POLICY IF EXISTS "Managers can create goals" ON team_goals;
DROP POLICY IF EXISTS "Managers can update goals" ON team_goals;
DROP POLICY IF EXISTS "Managers can delete goals" ON team_goals;

DROP POLICY IF EXISTS "Users can view territories in their company" ON team_territories;
DROP POLICY IF EXISTS "Managers can manage territories" ON team_territories;

DROP POLICY IF EXISTS "Users can view skills in their company" ON team_skills;
DROP POLICY IF EXISTS "Managers can manage skills" ON team_skills;

DROP POLICY IF EXISTS "Users can view appropriate notes" ON team_notes;
DROP POLICY IF EXISTS "Users can create notes" ON team_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON team_notes;
DROP POLICY IF EXISTS "Managers can delete notes" ON team_notes;

DROP POLICY IF EXISTS "Users can view activity in their company" ON team_activity_log;
DROP POLICY IF EXISTS "System can log activities" ON team_activity_log;

-- Create helper function to get user's profile ID from auth.uid()
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS uuid AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies for team_members with correct profile ID mapping
CREATE POLICY "Users can view team members in their company"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_profile_id() OR 
    profile_id = get_user_profile_id() OR
    user_id = auth.uid()
  );

CREATE POLICY "Managers can insert team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_profile_id());

CREATE POLICY "Managers can update team members"
  ON team_members FOR UPDATE
  TO authenticated
  USING (company_id = get_user_profile_id())
  WITH CHECK (company_id = get_user_profile_id());

CREATE POLICY "Managers can delete team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (company_id = get_user_profile_id());

-- RLS Policies for team_performance_history
CREATE POLICY "Users can view performance history in their company"
  ON team_performance_history FOR SELECT
  TO authenticated
  USING (company_id = get_user_profile_id());

CREATE POLICY "Managers can insert performance records"
  ON team_performance_history FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_profile_id());

CREATE POLICY "Managers can update performance records"
  ON team_performance_history FOR UPDATE
  TO authenticated
  USING (company_id = get_user_profile_id())
  WITH CHECK (company_id = get_user_profile_id());

-- RLS Policies for team_goals
CREATE POLICY "Users can view goals in their company"
  ON team_goals FOR SELECT
  TO authenticated
  USING (company_id = get_user_profile_id());

CREATE POLICY "Managers can create goals"
  ON team_goals FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_profile_id());

CREATE POLICY "Managers can update goals"
  ON team_goals FOR UPDATE
  TO authenticated
  USING (company_id = get_user_profile_id())
  WITH CHECK (company_id = get_user_profile_id());

CREATE POLICY "Managers can delete goals"
  ON team_goals FOR DELETE
  TO authenticated
  USING (company_id = get_user_profile_id());

-- RLS Policies for team_territories
CREATE POLICY "Users can view territories in their company"
  ON team_territories FOR SELECT
  TO authenticated
  USING (company_id = get_user_profile_id());

CREATE POLICY "Managers can manage territories"
  ON team_territories FOR ALL
  TO authenticated
  USING (company_id = get_user_profile_id())
  WITH CHECK (company_id = get_user_profile_id());

-- RLS Policies for team_skills
CREATE POLICY "Users can view skills in their company"
  ON team_skills FOR SELECT
  TO authenticated
  USING (company_id = get_user_profile_id());

CREATE POLICY "Managers can manage skills"
  ON team_skills FOR ALL
  TO authenticated
  USING (company_id = get_user_profile_id())
  WITH CHECK (company_id = get_user_profile_id());

-- RLS Policies for team_notes
CREATE POLICY "Users can view appropriate notes"
  ON team_notes FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_profile_id() OR 
    (created_by = get_user_profile_id() AND is_private = true)
  );

CREATE POLICY "Users can create notes"
  ON team_notes FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_profile_id() AND created_by = get_user_profile_id());

CREATE POLICY "Users can update own notes"
  ON team_notes FOR UPDATE
  TO authenticated
  USING (created_by = get_user_profile_id())
  WITH CHECK (created_by = get_user_profile_id());

CREATE POLICY "Managers can delete notes"
  ON team_notes FOR DELETE
  TO authenticated
  USING (company_id = get_user_profile_id());

-- RLS Policies for team_activity_log
CREATE POLICY "Users can view activity in their company"
  ON team_activity_log FOR SELECT
  TO authenticated
  USING (company_id = get_user_profile_id());

CREATE POLICY "System can log activities"
  ON team_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_profile_id());