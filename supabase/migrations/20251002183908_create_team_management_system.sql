/*
  # Team Management System Enhancement

  ## Overview
  Extends the sales management system with comprehensive team management capabilities including:
  - Enhanced team member profiles with employment details
  - Performance tracking and historical metrics
  - Territory management and assignment
  - Goals and quotas system with tracking
  - Team skills and certifications
  - Performance evaluations and notes
  - Team activity logging

  ## New Tables Created

  ### 1. team_members
  Extended team member information beyond basic profiles
  - Employment details (hire date, status, position)
  - Manager relationships and team hierarchy
  - Performance ratings and review dates
  - Custom fields for company-specific data

  ### 2. team_performance_history
  Historical performance metrics tracking
  - Monthly and quarterly performance snapshots
  - Revenue, deals, and conversion tracking
  - Goal attainment percentages
  - Comparative performance analysis

  ### 3. team_goals
  Individual and team goal management
  - Revenue and activity-based goals
  - Monthly, quarterly, and annual targets
  - Progress tracking and completion status
  - Goal categories and priorities

  ### 4. team_territories
  Territory assignment and management
  - Geographic territory definitions
  - Territory assignments to team members
  - Territory performance metrics
  - Coverage and conflict management

  ### 5. team_skills
  Skills and certifications tracking
  - Skill inventory per team member
  - Certification tracking with expiry dates
  - Skill level ratings
  - Training requirements and completion

  ### 6. team_notes
  Team member notes and evaluations
  - Performance review notes
  - Manager feedback and coaching notes
  - Achievement records
  - Issue tracking and resolution

  ### 7. team_activity_log
  Comprehensive activity tracking
  - Team member actions and changes
  - Profile updates and status changes
  - Performance milestones
  - System events and notifications

  ## Security Features
  - Row Level Security (RLS) enabled on all tables
  - Manager and admin-only access for sensitive data
  - Team member can view own records only
  - Proper data isolation by company

  ## Performance Optimizations
  - Indexes on frequently queried columns
  - Composite indexes for complex queries
  - Efficient foreign key relationships
*/

-- Create custom types for team management
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
    CREATE TYPE employment_status AS ENUM ('active', 'inactive', 'on_leave', 'terminated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_status') THEN
    CREATE TYPE goal_status AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_period') THEN
    CREATE TYPE goal_period AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'annual');
  END IF;
END $$;

-- Enhanced team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  employee_id text,
  hire_date date DEFAULT CURRENT_DATE,
  employment_status employment_status DEFAULT 'active',
  position text,
  department text,
  manager_id uuid REFERENCES profiles(id),
  performance_rating numeric(3,2),
  last_review_date date,
  next_review_date date,
  notes text,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team performance history table
CREATE TABLE IF NOT EXISTS team_performance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text NOT NULL,
  revenue_generated numeric(12,2) DEFAULT 0,
  deals_closed integer DEFAULT 0,
  deals_lost integer DEFAULT 0,
  conversion_rate numeric(5,2),
  avg_deal_size numeric(10,2),
  quota_amount numeric(12,2),
  quota_attainment numeric(5,2),
  activities_completed integer DEFAULT 0,
  calls_made integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  meetings_held integer DEFAULT 0,
  performance_score numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Team goals table
CREATE TABLE IF NOT EXISTS team_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_type text NOT NULL,
  goal_period goal_period NOT NULL,
  target_value numeric(12,2) NOT NULL,
  current_value numeric(12,2) DEFAULT 0,
  status goal_status DEFAULT 'not_started',
  priority text DEFAULT 'medium',
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team territories table
CREATE TABLE IF NOT EXISTS team_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  region text,
  states text[],
  zip_codes text[],
  assigned_member_id uuid REFERENCES team_members(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team skills and certifications table
CREATE TABLE IF NOT EXISTS team_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  skill_category text,
  proficiency_level text,
  certification_name text,
  certification_number text,
  issue_date date,
  expiry_date date,
  verified boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team notes and evaluations table
CREATE TABLE IF NOT EXISTS team_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  note_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  rating numeric(3,2),
  is_private boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team activity log table
CREATE TABLE IF NOT EXISTS team_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  performed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_profile_id ON team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_manager_id ON team_members(manager_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(employment_status);

CREATE INDEX IF NOT EXISTS idx_team_performance_member_id ON team_performance_history(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_performance_company_id ON team_performance_history(company_id);
CREATE INDEX IF NOT EXISTS idx_team_performance_period ON team_performance_history(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_team_goals_member_id ON team_goals(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_goals_company_id ON team_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_team_goals_status ON team_goals(status);
CREATE INDEX IF NOT EXISTS idx_team_goals_period ON team_goals(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_team_territories_company_id ON team_territories(company_id);
CREATE INDEX IF NOT EXISTS idx_team_territories_assigned ON team_territories(assigned_member_id);

CREATE INDEX IF NOT EXISTS idx_team_skills_member_id ON team_skills(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_skills_company_id ON team_skills(company_id);

CREATE INDEX IF NOT EXISTS idx_team_notes_member_id ON team_notes(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_company_id ON team_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_created_by ON team_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_team_activity_member_id ON team_activity_log(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_company_id ON team_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_created_at ON team_activity_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Users can view team members in their company"
  ON team_members FOR SELECT
  TO authenticated
  USING (company_id = auth.uid() OR profile_id = auth.uid());

CREATE POLICY "Managers can insert team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Managers can update team members"
  ON team_members FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Managers can delete team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- RLS Policies for team_performance_history
CREATE POLICY "Users can view performance history in their company"
  ON team_performance_history FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Managers can insert performance records"
  ON team_performance_history FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Managers can update performance records"
  ON team_performance_history FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

-- RLS Policies for team_goals
CREATE POLICY "Users can view goals in their company"
  ON team_goals FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Managers can create goals"
  ON team_goals FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Managers can update goals"
  ON team_goals FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Managers can delete goals"
  ON team_goals FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- RLS Policies for team_territories
CREATE POLICY "Users can view territories in their company"
  ON team_territories FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Managers can manage territories"
  ON team_territories FOR ALL
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

-- RLS Policies for team_skills
CREATE POLICY "Users can view skills in their company"
  ON team_skills FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Managers can manage skills"
  ON team_skills FOR ALL
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

-- RLS Policies for team_notes
CREATE POLICY "Users can view appropriate notes"
  ON team_notes FOR SELECT
  TO authenticated
  USING (
    company_id = auth.uid() OR 
    (created_by = auth.uid() AND is_private = true)
  );

CREATE POLICY "Users can create notes"
  ON team_notes FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "Users can update own notes"
  ON team_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Managers can delete notes"
  ON team_notes FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- RLS Policies for team_activity_log
CREATE POLICY "Users can view activity in their company"
  ON team_activity_log FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "System can log activities"
  ON team_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_team_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_team_members_updated_at 
  BEFORE UPDATE ON team_members 
  FOR EACH ROW 
  EXECUTE FUNCTION update_team_updated_at_column();

CREATE TRIGGER update_team_goals_updated_at 
  BEFORE UPDATE ON team_goals 
  FOR EACH ROW 
  EXECUTE FUNCTION update_team_updated_at_column();

CREATE TRIGGER update_team_territories_updated_at 
  BEFORE UPDATE ON team_territories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_team_updated_at_column();

CREATE TRIGGER update_team_skills_updated_at 
  BEFORE UPDATE ON team_skills 
  FOR EACH ROW 
  EXECUTE FUNCTION update_team_updated_at_column();

CREATE TRIGGER update_team_notes_updated_at 
  BEFORE UPDATE ON team_notes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_team_updated_at_column();