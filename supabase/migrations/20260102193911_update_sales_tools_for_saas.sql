/*
  # Update Sales Tools Content for SaaS Sales
  
  1. Changes
    - Clear existing roofing-focused content
    - Add comprehensive SaaS-focused sales scripts and templates
    - Scripts include: Cold calls, discovery, demo, objection handling, and closing
    - Email templates for SaaS product outreach
    - All content tailored for selling SaaS/CRM products
    
  2. Security
    - No RLS changes needed
    - Existing policies ensure only admins can edit
    - All authenticated users can view active content
*/

-- Clear existing content to replace with SaaS-specific content
DELETE FROM sales_tools_content;

-- Insert SaaS-focused call scripts
INSERT INTO sales_tools_content (content_type, title, content, display_order, metadata)
VALUES 
  (
    'call_script',
    'Cold Call - SaaS CRM Opening',
    'Hi {{first_name}}, this is {{rep_name}} with {{company_name}}. Quick 30 seconds—

We help growing businesses streamline their sales process with a modern CRM that actually gets used by your team.

Unlike complex enterprise tools, our platform is designed to be simple enough to start using today, but powerful enough to scale with you.

If I could show you a 15-minute demo of how companies like yours are closing 20-30% more deals with better pipeline visibility, would you be open to seeing it this week?',
    1,
    '{"script_type": "cold_call", "stage": "prospecting"}'::jsonb
  ),
  (
    'call_script',
    'Discovery - Qualifying Questions',
    'Great! Before I show you the platform, let me ask a few quick questions so I can tailor this to your needs:

1. What''s your current process for tracking leads and deals? (spreadsheets, another CRM, or mostly in your head?)

2. How many people on your team need visibility into your sales pipeline?

3. What''s the biggest frustration with your current setup? (leads falling through cracks, no visibility, too complex, team not using it?)

4. If we could solve [their pain point], what would that be worth to your business?',
    2,
    '{"script_type": "discovery", "stage": "qualification"}'::jsonb
  ),
  (
    'call_script',
    'Demo - Value Proposition',
    'Perfect. Let me show you exactly how we solve [their pain point]:

[SCREEN SHARE]

First, notice how clean the interface is. Your team can add a new lead in literally 10 seconds—no training needed.

See this pipeline view? This is what you see the moment you log in. Every deal, every stage, complete visibility.

The best part? Built-in automation. When a lead comes in, automatic follow-up emails, task reminders, everything your team needs to never let a deal slip.

[Show their specific use case]

Questions so far?',
    3,
    '{"script_type": "demo", "stage": "presentation"}'::jsonb
  ),
  (
    'call_script',
    'Objection Handling - "Too Expensive"',
    'I totally understand—budget is always a consideration. Let me put this in perspective:

Right now, how many leads would you say fall through the cracks each month? Even if it''s just 2-3...

At your average deal size of [their ACV], that''s [calculate] in lost revenue.

Our platform costs [price], which means if it helps you close just ONE additional deal, it''s paid for itself for the entire year.

Plus, we have a 30-day money-back guarantee. If you don''t see the value in the first month, you get a full refund. Fair enough?',
    4,
    '{"script_type": "objection_handling", "stage": "negotiation"}'::jsonb
  ),
  (
    'call_script',
    'Objection Handling - "Need to Think About It"',
    'Absolutely, I respect that. Can I ask—what specifically do you need to think about? Is it:

A) Whether the platform fits your workflow?
B) Budget and pricing?
C) Getting buy-in from your team?
D) Something else?

[Listen and address specific concern]

Here''s what I suggest: Let''s get you set up with a free trial. You can invite your team, import your actual leads, and see how it works for YOUR business. No commitment, no credit card needed.

If it''s not a fit, no hard feelings. But I''d hate for you to miss out on closing more deals while you''re "thinking about it." Sound good?',
    5,
    '{"script_type": "objection_handling", "stage": "negotiation"}'::jsonb
  ),
  (
    'call_script',
    'Objection Handling - "We Already Have a CRM"',
    'That''s great! What are you currently using?

[Listen]

How''s that working for your team? Are they actually using it every day?

Here''s what we hear a lot: companies invest in powerful CRMs like [Salesforce/HubSpot/etc.], but they''re either:
- Too complex, so the team resists using it
- Missing features specific to [their industry]
- Expensive when you factor in add-ons and per-user fees

We built our platform specifically for [their company size/industry]. It''s the features you actually need, without the bloat.

Most of our customers actually came from [their current CRM]. Would you be open to a side-by-side comparison? I think you''ll be surprised.',
    6,
    '{"script_type": "objection_handling", "stage": "negotiation"}'::jsonb
  ),
  (
    'call_script',
    'Closing - Trial to Paid',
    'So {{first_name}}, you''ve been using the platform for a couple weeks now. How''s it going?

[Listen to feedback]

That''s exactly what we hear from customers. Now here''s the thing—your trial expires in [X days], and I''d hate to see your team lose access right when you''re getting momentum.

We have two options to get you set up:

Option 1: Our Starter plan at [price]/month - perfect for teams under 10 users
Option 2: Our Professional plan at [price]/month - includes automation, advanced reporting, and priority support

Based on what you''ve told me about your team size and goals, I''d recommend [Plan Name]. 

Can I get you set up today so there''s no interruption in service?',
    7,
    '{"script_type": "closing", "stage": "closing"}'::jsonb
  ),
  (
    'call_script',
    'Closing - Direct Ask',
    'Based on everything we''ve discussed, I think our platform is a perfect fit for [company name]. 

Here''s what happens next:
1. I''ll send you a proposal with [Plan Name] at [price]/month
2. You can review with your team
3. Once approved, we''ll get you onboarded within 24 hours
4. Your dedicated success manager will help migrate your data and train your team

The sooner we get started, the sooner you start seeing results. 

Can I send that proposal over right now?',
    8,
    '{"script_type": "closing", "stage": "closing"}'::jsonb
  );

-- Insert SaaS-focused email templates
INSERT INTO sales_tools_content (content_type, title, content, display_order, metadata)
VALUES 
  (
    'email_template',
    'Initial Outreach - SaaS Cold Email',
    'Subject: Quick question about {{company_name}}''s sales process

Hi {{first_name}},

I noticed {{company_name}} is growing (congrats on [recent achievement/funding/hiring]!), and I''m curious—how are you currently tracking your sales pipeline?

Most companies at your stage are either:
• Using spreadsheets (which break down as you scale)
• Paying too much for enterprise CRMs they barely use
• Winging it (which is honestly fine until it''s not)

We built {{product_name}} specifically for companies like yours—powerful enough to scale, simple enough that your team will actually use it.

Quick question: Would you be open to a 15-minute demo? I can show you exactly how we''ve helped companies like [similar company] close 30% more deals with better pipeline visibility.

Best,
{{rep_name}}',
    1,
    '{"template_type": "cold_outreach", "stage": "prospecting"}'::jsonb
  ),
  (
    'email_template',
    'Follow-up - After No Response',
    'Subject: Following up - {{company_name}}

Hi {{first_name}},

I sent you a note last week about improving {{company_name}}''s sales process. I know you''re busy, so I''ll keep this short:

We help companies like yours:
✓ Stop losing leads in spreadsheets
✓ Give your team complete pipeline visibility
✓ Close more deals with built-in automation

Worth 15 minutes?

If not, no worries—just let me know and I won''t bug you again.

Best,
{{rep_name}}',
    2,
    '{"template_type": "follow_up", "stage": "prospecting"}'::jsonb
  ),
  (
    'email_template',
    'Demo Confirmation',
    'Subject: Confirmed: Demo with {{company_name}} - {{date}} at {{time}}

Hi {{first_name}},

Looking forward to showing you {{product_name}} tomorrow!

Demo Details:
📅 Date: {{date}}
⏰ Time: {{time}}
📞 Meeting Link: {{meeting_link}}

I''ll show you:
• How to set up your complete sales pipeline in under 10 minutes
• Automation that keeps leads from falling through the cracks
• Real ROI examples from companies your size
• Live Q&A—bring any questions

Come prepared with:
• Your current lead tracking process (even if it''s rough)
• Number of team members who need access
• Your biggest sales process frustration

See you tomorrow!

{{rep_name}}',
    3,
    '{"template_type": "meeting_confirmation", "stage": "qualification"}'::jsonb
  ),
  (
    'email_template',
    'Post-Demo Follow-up',
    'Subject: Great talking to you, {{first_name}}

Hi {{first_name}},

Thanks for taking the time for that demo today. Based on our conversation, I think {{product_name}} would be a great fit for {{company_name}}, especially for [specific pain point discussed].

As promised, here''s:
• Pricing proposal: [attach/link]
• Case study from [similar company]: [link]
• Quick setup guide: [link]

Next steps:
1. Review the proposal
2. Share with your team if needed
3. Schedule a follow-up call for any questions

I blocked off time on {{date_options}} if you want to discuss further. Or if you''re ready to move forward, just reply "let''s do it" and I''ll get you onboarded this week.

Sound good?

{{rep_name}}',
    4,
    '{"template_type": "post_demo", "stage": "proposal"}'::jsonb
  ),
  (
    'email_template',
    'Proposal Sent',
    'Subject: Proposal for {{company_name}} - {{product_name}}

Hi {{first_name}},

As discussed, here''s the proposal for getting {{company_name}} set up with {{product_name}}.

WHAT YOU GET:
• {{plan_name}} plan
• Up to {{user_count}} users
• All core features (pipeline management, automation, reporting)
• Dedicated onboarding & training
• Priority support

INVESTMENT:
• {{price}}/month, billed {{billing_frequency}}
• No setup fees
• Cancel anytime

TIMELINE:
• Sign today → Live by {{go_live_date}}
• Your success manager: {{csm_name}}

The sooner we start, the sooner you start closing more deals. Ready to move forward?

Reply with "approved" and I''ll get you set up today.

{{rep_name}}',
    5,
    '{"template_type": "proposal", "stage": "proposal"}'::jsonb
  ),
  (
    'email_template',
    'Breakup Email - Last Attempt',
    'Subject: Should I close your file?

Hi {{first_name}},

I''ve reached out a few times about improving {{company_name}}''s sales process, but haven''t heard back.

I get it—timing might not be right, or maybe you''re all set with your current setup.

Before I close your file, I wanted to check one last time:

If you''re open to seeing how we''ve helped companies like yours close more deals with better pipeline visibility, reply with "show me."

If not, no hard feelings. Just reply "not interested" and I''ll stop reaching out.

Either way, I''d appreciate knowing where you stand.

Best,
{{rep_name}}',
    6,
    '{"template_type": "breakup", "stage": "prospecting"}'::jsonb
  );
