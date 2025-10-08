/*
  # Create Sales Tools Content Table

  1. New Tables
    - `sales_tools_content`
      - `id` (uuid, primary key)
      - `content_type` (text) - Type of content: 'email_template', 'call_script', 'competitor_feature'
      - `title` (text) - Title or subject of the content
      - `content` (text) - The actual content (email body, script, etc.)
      - `metadata` (jsonb) - Additional data specific to each content type
      - `display_order` (integer) - Order for displaying items
      - `is_active` (boolean) - Whether the content is active/visible
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid) - Reference to auth.users
      - `updated_by` (uuid) - Reference to auth.users

  2. Security
    - Enable RLS on `sales_tools_content` table
    - Add policy for all authenticated users to read active content
    - Add policy for managers/admins to create, update, and delete content
*/

CREATE TABLE IF NOT EXISTS sales_tools_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('email_template', 'call_script', 'competitor_feature')),
  title text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE sales_tools_content ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read active sales tools content
CREATE POLICY "Authenticated users can view active sales tools content"
  ON sales_tools_content
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Managers and admins can insert sales tools content
CREATE POLICY "Managers can insert sales tools content"
  ON sales_tools_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.user_role IN ('admin', 'manager') OR
        profiles.subscription_plan = 'enterprise'
      )
    )
  );

-- Policy: Managers and admins can update sales tools content
CREATE POLICY "Managers can update sales tools content"
  ON sales_tools_content
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.user_role IN ('admin', 'manager') OR
        profiles.subscription_plan = 'enterprise'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.user_role IN ('admin', 'manager') OR
        profiles.subscription_plan = 'enterprise'
      )
    )
  );

-- Policy: Managers and admins can delete sales tools content
CREATE POLICY "Managers can delete sales tools content"
  ON sales_tools_content
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.user_role IN ('admin', 'manager') OR
        profiles.subscription_plan = 'enterprise'
      )
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_tools_content_type ON sales_tools_content(content_type);
CREATE INDEX IF NOT EXISTS idx_sales_tools_content_active ON sales_tools_content(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_tools_content_order ON sales_tools_content(content_type, display_order);

-- Insert default email templates
INSERT INTO sales_tools_content (content_type, title, content, display_order, metadata)
VALUES 
  (
    'email_template',
    'Transform Your Roofing Business with AI',
    'Hi [NAME],

I hope this email finds you well. I''m reaching out because I noticed [COMPANY] is a growing roofing business, and I wanted to share something that could significantly impact your lead conversion and operational efficiency.

Blue Collar Academy is revolutionizing how roofing companies train their teams and improve operations. Here''s what makes us different:

📚 Expert Training Programs: Comprehensive roofing education and certification
👥 Team Development: Leadership and skills training for your crew
📊 Business Growth: Sales and operational improvement strategies
⚡ Proven Results: Our clients see significant business improvements

Would you be interested in a 15-minute consultation to see how our training programs could benefit your business? I have some time available [TIME_SLOTS].

Best regards,
[YOUR_NAME]',
    1,
    '{"template_id": "initial_outreach"}'::jsonb
  ),
  (
    'email_template',
    'Quick follow-up on Blue Caller AI demo',
    'Hi [NAME],

I wanted to follow up on my previous email about Blue Collar Academy training programs. I know you''re busy running [COMPANY], but I thought you might be interested in how we''ve helped similar roofing companies:

✅ ABC Roofing improved their team efficiency by 45% after training
✅ XYZ Contractors reduced project completion time significantly
✅ Premier Roofing enhanced their safety record and team skills

The consultation only takes 15 minutes, and I can show you exactly how our training programs would benefit your team.

Are you available for a quick call this week?

Best,
[YOUR_NAME]',
    2,
    '{"template_id": "follow_up"}'::jsonb
  ),
  (
    'email_template',
    'Confirmed: Blue Caller AI Demo - [DATE] at [TIME]',
    'Hi [NAME],

Great! I''m excited to show you how Blue Collar Academy can transform [COMPANY]''s team performance and business operations.

Consultation Details:
📅 Date: [DATE]
⏰ Time: [TIME]
📞 Meeting Link: [CONSULTATION_LINK]

What we''ll cover:
• Overview of our training programs and certifications
• Team development strategies
• Business growth opportunities
• ROI calculation specific to your training needs
• Q&A session

Please have your current team size and training needs handy - I''ll show you a personalized training plan.

Looking forward to speaking with you!

Best,
[YOUR_NAME]',
    3,
    '{"template_id": "demo_confirmation"}'::jsonb
  );

-- Insert default call scripts
INSERT INTO sales_tools_content (content_type, title, content, display_order, metadata)
VALUES 
  (
    'call_script',
    'Cold Call Opening',
    'Hi [NAME], this is [YOUR_NAME] from Blue Collar Academy. I know you didn''t expect my call, so I''ll be brief.

I''m reaching out to roofing company owners like yourself because we''ve developed training programs that are helping companies like yours improve their team performance and business operations significantly.

I''m not trying to sell you anything today - I''d just like to show you a quick 15-minute overview of how our training programs work. Would you be open to seeing how [COMPANY] could benefit from our programs?

[PAUSE FOR RESPONSE]

Great! I have some time available [TIME_OPTIONS]. What works better for you?',
    1,
    '{"script_id": "cold_call"}'::jsonb
  ),
  (
    'call_script',
    'Consultation Call Script',
    'Hi [NAME], thanks for taking the time for this consultation today.

[LISTEN TO RESPONSE]

Based on what you''ve told me about [COMPANY], I can see how our training programs would be a perfect fit. Let me show you exactly how we can help...

[PRESENT SOLUTION]

What questions do you have about our training programs?',
    2,
    '{"script_id": "consultation_call"}'::jsonb
  ),
  (
    'call_script',
    'Closing Call Script',
    'Hi [NAME], I wanted to follow up on our consultation last week. What did you think about our training programs?

[LISTEN TO RESPONSE]

I understand you want to think it over. Let me ask you this - what would need to happen for you to feel confident moving forward with our training programs?

[ADDRESS OBJECTIONS]

Here''s what I can do: I can set you up with a trial training session at no cost. This way, you can see the value firsthand with your actual team. If you don''t see significant improvement in team performance, we''ll part ways as friends.

Does that sound fair?',
    3,
    '{"script_id": "closing_call"}'::jsonb
  );

-- Insert default competitor comparison features
INSERT INTO sales_tools_content (content_type, title, content, display_order, metadata)
VALUES 
  ('competitor_feature', 'Roofing-Specific Training', 'true', 1, '{"blueCaller": true, "competitor1": false, "competitor2": false}'::jsonb),
  ('competitor_feature', 'Certification Programs', 'true', 2, '{"blueCaller": true, "competitor1": true, "competitor2": false}'::jsonb),
  ('competitor_feature', 'Safety Training', 'true', 3, '{"blueCaller": true, "competitor1": false, "competitor2": true}'::jsonb),
  ('competitor_feature', 'Leadership Development', 'true', 4, '{"blueCaller": true, "competitor1": false, "competitor2": false}'::jsonb),
  ('competitor_feature', 'Business Growth Coaching', 'true', 5, '{"blueCaller": true, "competitor1": true, "competitor2": true}'::jsonb),
  ('competitor_feature', 'Hands-on Workshops', 'true', 6, '{"blueCaller": true, "competitor1": false, "competitor2": false}'::jsonb),
  ('competitor_feature', 'Online Learning Platform', 'true', 7, '{"blueCaller": true, "competitor1": false, "competitor2": true}'::jsonb),
  ('competitor_feature', '24/7 Support', 'true', 8, '{"blueCaller": true, "competitor1": false, "competitor2": true}'::jsonb),
  ('competitor_feature', 'Custom Training Plans', 'true', 9, '{"blueCaller": true, "competitor1": true, "competitor2": false}'::jsonb),
  ('competitor_feature', 'Mobile Access', 'true', 10, '{"blueCaller": true, "competitor1": true, "competitor2": true}'::jsonb);
