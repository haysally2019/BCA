/*
  # Initial Blue Caller AI CRM Schema

  1. New Tables
    - `profiles` - User profiles and company information
    - `leads` - Lead management with comprehensive tracking
    - `calls` - Call logs and AI call records
    - `sms_campaigns` - SMS campaign management
    - `sms_messages` - Individual SMS message tracking
    - `appointments` - Appointment scheduling
    - `workflows` - Automation workflow definitions
    - `workflow_executions` - Workflow execution tracking
    - `integrations` - Third-party integration settings
    - `call_scripts` - AI call script templates
    - `lead_sources` - Lead source tracking
    - `analytics_events` - Event tracking for analytics

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Company-based data isolation
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_phone text,
  company_email text,
  company_address text,
  subscription_plan text DEFAULT 'starter',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lead_sources table
CREATE TABLE IF NOT EXISTS lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('website', 'facebook', 'referral', 'cold_call', 'google_ads', 'other')),
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  source_id uuid REFERENCES lead_sources(id),
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  address text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'nurturing')),
  score integer DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  estimated_value numeric(10,2),
  roof_type text,
  notes text,
  tags text[] DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}',
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create call_scripts table
CREATE TABLE IF NOT EXISTS call_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  script_type text NOT NULL CHECK (script_type IN ('initial_contact', 'follow_up', 'appointment_booking', 'qualification')),
  content text NOT NULL,
  voice_settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  script_id uuid REFERENCES call_scripts(id),
  type text NOT NULL CHECK (type IN ('inbound', 'outbound', 'ai_outbound')),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'missed')),
  duration_seconds integer DEFAULT 0,
  recording_url text,
  transcript text,
  summary text,
  outcome text CHECK (outcome IN ('success', 'voicemail', 'no_answer', 'busy', 'failed')),
  ai_score numeric(3,1) CHECK (ai_score >= 0 AND ai_score <= 10),
  next_action text,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create sms_campaigns table
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  message_template text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  target_criteria jsonb DEFAULT '{}',
  schedule_settings jsonb DEFAULT '{}',
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  response_count integer DEFAULT 0,
  opt_out_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sms_messages table
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES sms_campaigns(id),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  message_content text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'replied')),
  twilio_sid text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  replied_at timestamptz,
  reply_content text,
  created_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  appointment_type text DEFAULT 'consultation' CHECK (appointment_type IN ('consultation', 'estimate', 'inspection', 'follow_up')),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  location text,
  assigned_to uuid REFERENCES auth.users(id),
  reminder_sent boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('new_lead', 'status_change', 'time_based', 'manual')),
  trigger_conditions jsonb DEFAULT '{}',
  actions jsonb NOT NULL,
  is_active boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  current_step integer DEFAULT 0,
  execution_data jsonb DEFAULT '{}',
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  integration_type text NOT NULL CHECK (integration_type IN ('twilio', 'elevenlabs', 'facebook', 'google_ads', 'zapier')),
  name text NOT NULL,
  settings jsonb NOT NULL,
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  lead_id uuid REFERENCES leads(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can manage their own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can access their company's data"
  ON lead_sources
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's call scripts"
  ON call_scripts
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's calls"
  ON calls
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's SMS campaigns"
  ON sms_campaigns
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's SMS messages"
  ON sms_messages
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's workflows"
  ON workflows
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's workflow executions"
  ON workflow_executions
  FOR ALL
  TO authenticated
  USING (workflow_id IN (SELECT id FROM workflows WHERE company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can access their company's integrations"
  ON integrations
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their company's analytics"
  ON analytics_events
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_scheduled_at ON calls(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_campaign_id ON sms_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_company_id ON analytics_events(company_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);