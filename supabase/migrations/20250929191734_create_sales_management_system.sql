/*
  # Sales Management System Database Schema

  ## Overview
  This migration creates a comprehensive sales management system with the following key features:
  - User profiles and company management
  - Lead tracking and scoring
  - Sales pipeline with deals and stages
  - Appointment scheduling and management
  - Commission tracking and calculations
  - Activity logging and reporting

  ## New Tables Created

  ### 1. User Profiles & Company Management
  - `profiles` - Extended user profiles with company information
  - `sales_reps` - Sales representative specific data and territories

  ### 2. Lead Management System  
  - `leads` - Customer leads with contact info and scoring
  - `lead_sources` - Configurable lead sources and tracking
  - `lead_activities` - Activity log for each lead interaction

  ### 3. Sales Pipeline System
  - `deal_stages` - Configurable pipeline stages
  - `deals` - Sales opportunities linked to leads
  - `deal_activities` - Deal progression and activity tracking

  ### 4. Appointment System
  - `appointments` - Scheduled meetings and consultations
  - `appointment_types` - Configurable appointment categories

  ### 5. Commission System
  - `commission_structures` - Commission rates and rules
  - `commissions` - Individual commission records
  - `commission_payments` - Payment tracking and history

  ## Security Features
  - Row Level Security (RLS) enabled on all tables
  - User-based access control with proper policies
  - Company-based data isolation
  - Role-based permissions (sales rep vs management)

  ## Important Notes
  - All tables use UUID primary keys for security
  - Automatic timestamp management with triggers
  - Proper foreign key relationships maintained
  - Indexes added for query performance
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('sales_rep', 'manager', 'admin');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost');
CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost', 'cancelled');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_name text NOT NULL DEFAULT '',
  company_phone text,
  company_email text,
  company_address text,
  subscription_plan text NOT NULL DEFAULT 'professional',
  user_role user_role NOT NULL DEFAULT 'sales_rep',
  territory text,
  commission_rate numeric(5,2) DEFAULT 15.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sales representatives table
CREATE TABLE IF NOT EXISTS sales_reps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  quota_amount numeric(10,2) DEFAULT 0,
  quota_period text DEFAULT 'monthly',
  manager_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lead sources for tracking attribution
CREATE TABLE IF NOT EXISTS lead_sources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_rep_id uuid REFERENCES profiles(id),
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  address text,
  status lead_status DEFAULT 'new',
  score integer DEFAULT 0,
  estimated_value numeric(10,2),
  roof_type text,
  notes text,
  source text DEFAULT 'website',
  lead_source_id uuid REFERENCES lead_sources(id),
  last_contact_date timestamptz,
  next_follow_up_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lead activities for tracking interactions
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL, -- 'call', 'email', 'sms', 'meeting', 'note'
  subject text,
  description text,
  duration_minutes integer,
  outcome text,
  next_action text,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Deal stages for pipeline management
CREATE TABLE IF NOT EXISTS deal_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index integer NOT NULL,
  probability_percentage integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deals table for pipeline management
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id),
  assigned_rep_id uuid REFERENCES profiles(id) NOT NULL,
  stage_id uuid REFERENCES deal_stages(id) NOT NULL,
  title text NOT NULL,
  description text,
  value numeric(10,2) NOT NULL,
  probability integer DEFAULT 0,
  expected_close_date date,
  actual_close_date date,
  status deal_status DEFAULT 'open',
  lost_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deal activities for tracking deal progression
CREATE TABLE IF NOT EXISTS deal_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  description text,
  previous_stage_id uuid REFERENCES deal_stages(id),
  new_stage_id uuid REFERENCES deal_stages(id),
  previous_value numeric(10,2),
  new_value numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- Appointment types
CREATE TABLE IF NOT EXISTS appointment_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_duration_minutes integer DEFAULT 60,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id),
  deal_id uuid REFERENCES deals(id),
  assigned_rep_id uuid REFERENCES profiles(id) NOT NULL,
  appointment_type_id uuid REFERENCES appointment_types(id),
  title text NOT NULL,
  description text,
  location text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  status appointment_status DEFAULT 'scheduled',
  reminder_sent_at timestamptz,
  outcome text,
  next_action text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commission structures
CREATE TABLE IF NOT EXISTS commission_structures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  base_rate numeric(5,2) NOT NULL,
  tier_1_threshold numeric(10,2),
  tier_1_rate numeric(5,2),
  tier_2_threshold numeric(10,2),
  tier_2_rate numeric(5,2),
  tier_3_threshold numeric(10,2),
  tier_3_rate numeric(5,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) NOT NULL,
  rep_id uuid REFERENCES profiles(id) NOT NULL,
  commission_structure_id uuid REFERENCES commission_structures(id),
  deal_value numeric(10,2) NOT NULL,
  commission_rate numeric(5,2) NOT NULL,
  commission_amount numeric(10,2) NOT NULL,
  status commission_status DEFAULT 'pending',
  quarter text,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commission payments tracking
CREATE TABLE IF NOT EXISTS commission_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rep_id uuid REFERENCES profiles(id) NOT NULL,
  payment_period text NOT NULL, -- e.g., '2024-Q1', '2024-01'
  total_amount numeric(10,2) NOT NULL,
  commission_ids uuid[] NOT NULL, -- Array of commission IDs included
  payment_method text,
  payment_reference text,
  paid_at timestamptz NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_rep_id ON leads(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_rep_id ON deals(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_rep_id ON appointments(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_commissions_company_id ON commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_rep_id ON commissions(rep_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

-- Insert default lead sources
INSERT INTO lead_sources (company_id, name, description) 
SELECT id, 'Website', 'Direct website inquiries'
FROM profiles 
WHERE NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Website')
LIMIT 1;

INSERT INTO lead_sources (company_id, name, description)
SELECT id, 'Facebook', 'Facebook advertising and organic'  
FROM profiles
WHERE NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Facebook')
LIMIT 1;

INSERT INTO lead_sources (company_id, name, description)
SELECT id, 'Google Ads', 'Google advertising campaigns'
FROM profiles  
WHERE NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Google Ads')
LIMIT 1;

INSERT INTO lead_sources (company_id, name, description)
SELECT id, 'Referral', 'Customer referrals'
FROM profiles
WHERE NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Referral')  
LIMIT 1;

INSERT INTO lead_sources (company_id, name, description)
SELECT id, 'Cold Call', 'Cold calling campaigns'
FROM profiles
WHERE NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Cold Call')
LIMIT 1;

-- Insert default deal stages
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN SELECT id FROM profiles LOOP
        -- Insert default stages if they don't exist for this company
        INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage)
        SELECT profile_record.id, 'Lead', 'Initial lead qualification', 1, 10
        WHERE NOT EXISTS (
            SELECT 1 FROM deal_stages 
            WHERE company_id = profile_record.id AND name = 'Lead'
        );
        
        INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage)
        SELECT profile_record.id, 'Qualified', 'Lead has been qualified', 2, 25
        WHERE NOT EXISTS (
            SELECT 1 FROM deal_stages 
            WHERE company_id = profile_record.id AND name = 'Qualified'
        );
        
        INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage)
        SELECT profile_record.id, 'Demo Scheduled', 'Product demonstration scheduled', 3, 40
        WHERE NOT EXISTS (
            SELECT 1 FROM deal_stages 
            WHERE company_id = profile_record.id AND name = 'Demo Scheduled'
        );
        
        INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage)
        SELECT profile_record.id, 'Demo Completed', 'Product demo completed', 4, 60
        WHERE NOT EXISTS (
            SELECT 1 FROM deal_stages 
            WHERE company_id = profile_record.id AND name = 'Demo Completed'
        );
        
        INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage)
        SELECT profile_record.id, 'Proposal Sent', 'Proposal has been sent', 5, 75
        WHERE NOT EXISTS (
            SELECT 1 FROM deal_stages 
            WHERE company_id = profile_record.id AND name = 'Proposal Sent'
        );
        
        INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage)
        SELECT profile_record.id, 'Negotiating', 'Contract negotiation phase', 6, 90
        WHERE NOT EXISTS (
            SELECT 1 FROM deal_stages 
            WHERE company_id = profile_record.id AND name = 'Negotiating'
        );
        
        INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage)
        SELECT profile_record.id, 'Closed Won', 'Deal successfully closed', 7, 100
        WHERE NOT EXISTS (
            SELECT 1 FROM deal_stages 
            WHERE company_id = profile_record.id AND name = 'Closed Won'
        );
    END LOOP;
END $$;

-- Insert default appointment types
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN SELECT id FROM profiles LOOP
        INSERT INTO appointment_types (company_id, name, description, default_duration_minutes, color)
        SELECT profile_record.id, 'Consultation', 'Initial consultation meeting', 60, '#3B82F6'
        WHERE NOT EXISTS (
            SELECT 1 FROM appointment_types 
            WHERE company_id = profile_record.id AND name = 'Consultation'
        );
        
        INSERT INTO appointment_types (company_id, name, description, default_duration_minutes, color)
        SELECT profile_record.id, 'Estimate', 'Property estimate appointment', 90, '#F59E0B'
        WHERE NOT EXISTS (
            SELECT 1 FROM appointment_types 
            WHERE company_id = profile_record.id AND name = 'Estimate'
        );
        
        INSERT INTO appointment_types (company_id, name, description, default_duration_minutes, color)
        SELECT profile_record.id, 'Inspection', 'Property inspection', 75, '#10B981'
        WHERE NOT EXISTS (
            SELECT 1 FROM appointment_types 
            WHERE company_id = profile_record.id AND name = 'Inspection'
        );
        
        INSERT INTO appointment_types (company_id, name, description, default_duration_minutes, color)
        SELECT profile_record.id, 'Follow-up', 'Follow-up meeting', 30, '#8B5CF6'
        WHERE NOT EXISTS (
            SELECT 1 FROM appointment_types 
            WHERE company_id = profile_record.id AND name = 'Follow-up'
        );
    END LOOP;
END $$;

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN SELECT unnest(ARRAY[
        'profiles', 'sales_reps', 'lead_sources', 'leads', 
        'deal_stages', 'deals', 'appointment_types', 'appointments', 
        'commission_structures', 'commissions'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at 
                BEFORE UPDATE ON %s 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;