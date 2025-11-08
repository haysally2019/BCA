import React, { useState } from 'react';
import {
  BookOpen, PhoneCall, Mail, Target, TrendingUp, Users, Lightbulb,
  CheckCircle, AlertCircle, Play, ChevronRight, Copy, Award,
  Zap, BarChart3, MessageSquare, Clock, Star, Headphones
} from 'lucide-react';
import toast from 'react-hot-toast';

const SalesTools: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<number>(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard!'))
      .catch(() => toast.error('Failed to copy'));
  };

  const markLessonComplete = (moduleId: string, lessonIndex: number) => {
    const key = `${moduleId}-${lessonIndex}`;
    setCompletedLessons(prev => new Set([...prev, key]));
    localStorage.setItem('completedLessons', JSON.stringify([...completedLessons, key]));
    toast.success('Lesson marked as complete!');
  };

  const isLessonComplete = (moduleId: string, lessonIndex: number) => {
    return completedLessons.has(`${moduleId}-${lessonIndex}`);
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('completedLessons');
    if (saved) {
      setCompletedLessons(new Set(JSON.parse(saved)));
    }
  }, []);

  const trainingModules = [
    {
      id: 'cold-calling-fundamentals',
      title: 'Cold Calling Fundamentals',
      icon: PhoneCall,
      color: 'bg-blue-500',
      description: 'Master the art of cold calling with proven techniques',
      lessons: [
        {
          title: 'The Psychology of Cold Calling',
          content: `Understanding why cold calling works and how to develop the right mindset.

Key Principles:
• Rejection is not personal - it's part of the numbers game
• Every "no" brings you closer to a "yes"
• Confidence comes from preparation and practice
• Focus on helping, not selling

The Rule of 100:
For every 100 calls:
- 30-40 will answer
- 10-15 will have a conversation
- 3-5 will show genuine interest
- 1-2 will convert to sales

Your job is to get through the 100 to find your 1-2 wins.`
        },
        {
          title: 'The Perfect Opening (First 10 Seconds)',
          content: `Your opening determines if they hang up or listen. Here's the proven structure:

THE FORMULA:
1. Pattern Interrupt (2 seconds)
2. Permission-Based Hook (3 seconds)
3. Value Statement (5 seconds)

EXAMPLE OPENER:
"Hey [Name], this is [Your Name] with Blue Collar Academy - quick question, are you still looking for ways to increase your conversion rates and close more deals?"

Why This Works:
✓ Uses their name immediately (pattern interrupt)
✓ "Quick question" lowers resistance
✓ Assumes they want the outcome (not asking IF)
✓ Gets them talking immediately

AVOID:
✗ "Is this a good time?" (Always says no)
✗ Long company introductions
✗ "How are you today?" (Sounds scripted)
✗ Asking for their time upfront`
        },
        {
          title: 'Handling the Gatekeeper',
          content: `Getting past assistants and receptionists with confidence and respect.

MINDSET SHIFT:
Gatekeepers are allies, not obstacles. They want to direct calls to the right person.

TECHNIQUE #1: The Direct Approach
"Hi, I need to speak with [Name] about your sales automation system - is she available?"

Why it works: Confident, specific, sounds important.

TECHNIQUE #2: The Referral Implication
"Hi, [Name] is expecting my call regarding the sales software upgrade. Can you put me through?"

Why it works: Creates assumption of existing relationship.

TECHNIQUE #3: The Question Approach
"Hi, quick question - who handles your sales technology decisions? Would that be [Decision Maker]?"

Why it works: Seems informational, not sales.

PRO TIPS:
• Sound like you belong - confidence is key
• Be friendly but professional with gatekeepers
• Call at 7:30 AM or 5:30 PM (decision makers answer their own phone)
• Never say "just calling to..." (diminishes importance)
• If asked what it's about: "It's regarding their sales efficiency initiatives"`
        },
        {
          title: 'The Discovery Questions',
          content: `Asking the right questions separates top performers from the rest.

THE PAIN FRAMEWORK:
1. Current Situation
2. Problems & Frustrations
3. Impact & Cost
4. Desired Outcome
5. Timeline & Urgency

EXAMPLE QUESTION FLOW:

"Tell me about your current sales process - how are you tracking leads today?"
→ Gets them talking about current state

"What's the biggest challenge you're facing with that system?"
→ Uncovers pain points

"How much time would you say that costs your team each week?"
→ Quantifies the problem

"If you could wave a magic wand, what would your ideal solution look like?"
→ Gets them to envision the solution

"What happens if you don't solve this in the next 90 days?"
→ Creates urgency

POWER QUESTIONS:
• "Walk me through what happens when a lead comes in..."
• "How many deals are you losing due to slow follow-up?"
• "What's this costing you per month in lost revenue?"
• "If I could show you how to [solve specific pain], would that be worth 15 minutes?"

Remember: The person asking the questions controls the conversation.`
        },
        {
          title: 'Overcoming Common Objections',
          content: `The top 5 objections and exactly how to handle them.

OBJECTION #1: "I'm not interested"
Response: "I understand - most of our best clients said the same thing initially. But when they saw how [specific benefit], it changed everything. Do you mind if I ask - what are you currently using for [their pain point]?"

Why it works: Acknowledges objection, provides social proof, pivots to discovery.

OBJECTION #2: "Send me some information"
Response: "Happy to! Just so I send the right materials - are you currently losing deals due to [pain point], or is it more about [alternative pain]?"

Why it works: Agrees but continues qualifying. Gets information to personalize follow-up.

OBJECTION #3: "We're already using [Competitor]"
Response: "That's great! [Competitor] is solid. Most of our clients actually came from them. What made you choose them initially? ... And what's working well? ... Is there anything you wish it did better?"

Why it works: Validates their choice, then uncovers gaps and dissatisfaction.

OBJECTION #4: "We don't have the budget"
Response: "I completely understand - that's exactly why companies switch to us. Our clients typically save $[amount] per month while getting better results. What are you currently spending on [category]?"

Why it works: Reframes as a cost-saver, not additional expense.

OBJECTION #5: "I need to think about it"
Response: "Absolutely - this is an important decision. Just so I can help you think through this, what specific concerns are on your mind? Is it the price, the implementation, or something else?"

Why it works: Accepts the objection but uncovers the real concern.

THE GOLDEN RULE:
Objections are buying signals in disguise. They only object if they're somewhat interested.`
        },
        {
          title: 'Closing Techniques That Work',
          content: `Moving prospects from interest to commitment.

THE ASSUMPTIVE CLOSE:
"Sounds like this would be perfect for your team. Let's get you set up - does Tuesday or Wednesday work better for onboarding?"

When to use: When they've shown clear interest and agreement.

THE ALTERNATIVE CLOSE:
"Would you prefer to start with the Pro plan or go straight to Enterprise?"

When to use: When they're ready but indecisive.

THE URGENCY CLOSE:
"We have 3 spots left this month for onboarding. After that, we're booked until [date]. Want to grab one of those spots?"

When to use: When they're interested but dragging their feet.

THE PUPPY DOG CLOSE:
"Tell you what - let's do a 14-day trial. No commitment, no credit card. If it doesn't blow you away, no hard feelings. Fair enough?"

When to use: When they're hesitant about commitment.

THE SUMMARY CLOSE:
"So if I'm hearing you right, you need [pain point 1] solved, you want [outcome 1], and you're hoping to see results within [timeframe]. Is that accurate? ... Great! Then let's get this scheduled."

When to use: After a good discovery call.

CLOSING CHECKLIST:
✓ Confirmed budget and authority
✓ Identified clear pain points
✓ Agreement on desired outcomes
✓ Established timeline/urgency
✓ Removed all major objections

If all 5 are checked, ask for the sale confidently.`
        }
      ]
    },
    {
      id: 'software-sales-mastery',
      title: 'Selling Software Successfully',
      icon: Zap,
      color: 'bg-purple-500',
      description: 'Specific strategies for selling SaaS and software products',
      lessons: [
        {
          title: 'Understanding SaaS Buyer Psychology',
          content: `What software buyers really care about (and it's not features).

THE THREE CORE CONCERNS:
1. "Will this actually work for us?"
2. "Is the ROI worth it?"
3. "What's the risk if we're wrong?"

Your job is to address all three in every conversation.

CONCERN #1: Will this work for us?
Solution: Use case studies from similar industries
• "We work with 47 roofing companies just like yours..."
• "Here's exactly how [similar company] uses it..."
• Offer a demo with their actual data

CONCERN #2: Is the ROI worth it?
Solution: Build a clear ROI calculator
• If they close 2 extra deals per month at $5K each = $10K
• Your software costs $297/month
• Net gain: $9,703/month or $116,436/year
• Show them the math clearly

CONCERN #3: What if we're wrong?
Solution: Risk reversal
• Money-back guarantee
• Free trial period
• Month-to-month contracts
• "95% of our clients stay beyond year 1"

THE SOFTWARE BUYING JOURNEY:
1. Problem Recognition (They know they have a problem)
2. Solution Research (Looking at different approaches)
3. Vendor Evaluation (Comparing specific tools)
4. Purchase Decision (Making the final choice)
5. Implementation (Getting set up)

Match your pitch to their stage in the journey.`
        },
        {
          title: 'The Perfect Software Demo',
          content: `Delivering demos that convert prospects into customers.

BEFORE THE DEMO:
Discovery Questions to Ask:
• "What's the #1 thing you want to see today?"
• "What would make this a home run for you?"
• "Who else should be on this call?"
• "If this is everything you're hoping for, what happens next?"

THE DEMO STRUCTURE:
1. Re-cap their needs (2 minutes)
   "Based on our conversation, your biggest challenges are [X, Y, Z]"

2. Show the outcome first (5 minutes)
   Start with reports/results, not login screens
   "Here's what your dashboard will look like after 30 days..."

3. Work backwards through the process (10 minutes)
   Show how to get those results
   Focus on their use case only

4. Handle objections (3 minutes)
   "What concerns do you have?"

5. Close or schedule next steps (2 minutes)
   "Want to get started?"

DEMO DO'S:
✓ Use their company name in examples
✓ Focus on 3-4 key features max
✓ Show, don't tell
✓ Make them the hero of the story
✓ Pause for questions frequently
✓ Have them click/drive if possible

DEMO DON'TS:
✗ Feature dumping (showing everything)
✗ Starting with account setup/settings
✗ Talking more than 70% of the time
✗ Ignoring their specific needs
✗ Going over time
✗ Using generic examples

THE SECRET SAUCE:
After showing each feature, ask: "How would you use this in your business?"

This gets them mentally using the product before they buy.`
        },
        {
          title: 'Value-Based Pricing Conversations',
          content: `Talking about price without losing the deal.

RULE #1: Never lead with price
Price without context feels expensive.
Value first, price second.

THE PRICING REVEAL SEQUENCE:

Step 1: Anchor on the problem cost
"You mentioned you're losing about 10 deals per month due to slow follow-up. At $5,000 per deal, that's $50,000 in monthly revenue walking away. Is that accurate?"

Step 2: Present the outcome
"Our clients in your industry typically see a 40% improvement in conversion rates within 60 days. For you, that would mean 4 additional deals per month, or $20,000 in recovered revenue."

Step 3: Now reveal the price
"The investment for the Pro plan is $297 per month. Over a year, that's $3,564 for an additional $240,000 in revenue. Does that make sense as an investment?"

Step 4: Payment options
"We can do monthly at $297, or annual at $2,970 - which gives you two months free. Most clients go annual to maximize the ROI. What works better for you?"

HANDLING "IT'S TOO EXPENSIVE":

Response Framework:
"I understand - let me ask you this: is it the total investment, or is it more about whether you'll get the return you're looking for?"

If total investment:
"What number makes sense based on the value we discussed?"

If ROI concern:
"What would you need to see in results to make this a no-brainer?"

THE COMPARISON CLOSE:
"Most companies spend $X on [manual process/current solution]. We're $Y, but you get [Z specific outcomes]. The real question is: what's the cost of not solving this?"

Remember: Cheap software is expensive when it doesn't work.`
        },
        {
          title: 'Multi-Threading: Selling to Teams',
          content: `How to navigate complex B2B sales with multiple stakeholders.

THE TYPICAL SOFTWARE BUYING COMMITTEE:
• Economic Buyer (Signs the check - CEO/Owner)
• Technical Buyer (IT/Systems - Evaluates implementation)
• End User (Sales team - Actually uses it daily)
• Champion (Your internal advocate)

YOU NEED ALL FOUR TO WIN THE DEAL.

IDENTIFYING STAKEHOLDERS:
Discovery Questions:
• "Who else is involved in decisions like this?"
• "What does your evaluation process typically look like?"
• "Is there anyone not on this call who could veto this?"
• "Walk me through how you bought your last software tool"

BUILDING YOUR CHAMPION:
This is the most critical step. Your champion sells for you when you're not there.

How to create a champion:
1. Make them look good to their boss
2. Give them ammunition (ROI calculators, case studies)
3. Prepare them for objections
4. Show how this makes THEIR job easier
5. Build a genuine relationship

CHAMPION QUESTIONS:
• "What would make you a hero internally?"
• "What concerns will [boss] have?"
• "What has to happen for this to get approved?"
• "Can you walk me through the approval process?"

THE STAKEHOLDER EMAIL:
After your call with a champion:

"[Champion Name], great call today. I put together a summary doc for you to share with [Economic Buyer] and [Technical Buyer]:

1. Current Challenge Summary
2. Proposed Solution
3. ROI Analysis ($[X] return on $[Y] investment)
4. Implementation Timeline
5. Risk Mitigation (trial period, guarantee)
6. Next Steps

Want to schedule a call with them this week? I can present this or you can - whatever you prefer."

This makes it easy for your champion to sell internally.

PARALLEL PATH STRATEGY:
Don't wait for one person to sell for you.
Schedule separate calls with each stakeholder.

Economic Buyer Focus: ROI, Risk, Timeline
Technical Buyer Focus: Integration, Security, Support
End User Focus: Ease of use, Time savings, Features

Customize your pitch to each person's priorities.`
        },
        {
          title: 'Email Templates for Software Sales',
          content: `Proven email templates that get responses.

COLD OUTREACH EMAIL:
Subject: Quick question about [Company]'s sales process

Hi [Name],

I noticed [specific observation about their company/industry]. Most [industry] companies we work with struggle with [common pain point] - is this something you're dealing with?

We help [industry] companies like [similar client] increase close rates by [%] through [brief value prop]. They were losing [X] deals per month before switching to our system.

Worth a 15-minute conversation?

[Your Name]
[Company] | [Phone]

Why it works: Specific, short, focuses on their problem, social proof.

---

FOLLOW-UP EMAIL (No Response):
Subject: Re: Quick question about [Company]'s sales process

[Name],

Following up on my email from [day].

I ask because [new specific reason/news about their company]. If you're already handling [pain point] effectively, no worries - I'll stop following up.

But if it's still a challenge, happy to show you what's working for [similar company]. They went from [before state] to [after state] in [timeframe].

Just reply "interested" or "not now" so I know where things stand.

[Your Name]

Why it works: Acknowledges the follow-up, gives them an easy out, creates curiosity.

---

POST-DEMO FOLLOW-UP:
Subject: Next steps for [Company]

Hi [Name],

Great speaking with you today. As promised, here's everything you need:

✓ Demo recording: [link]
✓ ROI Calculator (showing $[X]/year return): [link]
✓ Case study from [similar company]: [link]
✓ Pricing options: [link]

Based on our conversation, the Pro plan makes the most sense for your team size and goals.

To move forward:
1. Review these materials
2. Share with [other stakeholders if mentioned]
3. Let's schedule 15 mins this week to answer any questions

What day works for that follow-up call?

[Your Name]
[Phone]

Why it works: Summarizes everything, clear next steps, asks for the follow-up.

---

THE BREAKUP EMAIL (Last Resort):
Subject: Closing your file

[Name],

I've reached out a few times about [pain point they mentioned]. Haven't heard back, so I'm assuming it's not a priority right now.

I'm closing your file on my end. If anything changes and you want to revisit this, just reply and I'll reopen it.

Best of luck with [specific thing about their business]!

[Your Name]

Why it works: Often gets a response when nothing else does. Shows respect for their time.

PRO TIP: 30% of "breakup emails" result in a meeting scheduled.`
        },
        {
          title: 'Closing Enterprise Deals',
          content: `Special strategies for larger contracts and longer sales cycles.

ENTERPRISE DEAL CHARACTERISTICS:
• 5-12 month sales cycle
• $50K+ annual contract value
• Multiple stakeholders (5-10 people)
• Legal review, procurement, security audits
• Custom pricing/terms negotiation

THE ENTERPRISE SALES PROCESS:

PHASE 1: Land a Meeting (Weeks 1-2)
Strategy: Target mid-level champions first
• Directors respond more than VPs
• Get a champion who can intro you up
• Reference customers in their industry

PHASE 2: Discovery & Scoping (Weeks 3-6)
Strategy: Understand the business case
• What's the economic impact?
• Who are ALL the decision makers?
• What's the approval process?
• What's their timeline and why?
• Previous vendor relationships?

Key Question:
"Walk me through exactly how a purchase like this gets approved at [Company]."

PHASE 3: Demo & Proof of Concept (Weeks 7-12)
Strategy: Get them using it
• Offer a 30-day pilot with their data
• Identify quick wins to show value
• Train their team during pilot
• Document wins weekly

Goal: Make them dependent on it.

PHASE 4: Commercial Negotiation (Weeks 13-18)
Strategy: Negotiate from value
• Start 20-30% above target
• Know your walk-away point
• Bundle instead of discounting
• Annual contracts only
• Payment terms negotiable

Watch out for:
- Procurement trying to commoditize you
- "Your competitor is cheaper" tactics
- Requests for spec work/custom builds

PHASE 5: Legal & Security (Weeks 19-22)
Strategy: Have everything ready
• Standard contract template
• Security questionnaire pre-filled
• SOC2, GDPR compliance docs
• Vendor insurance certificates
• Reference calls ready

PHASE 6: Close & Onboarding (Weeks 23-24)
Strategy: Executive alignment
• C-level call to celebrate
• Assign dedicated success manager
• 90-day success plan
• Quarterly business reviews

THE ENTERPRISE LANDMINE:
"Can you give us a better price?"

Bad Response: Immediately discount

Good Response:
"I can work on pricing, but first let me understand - if we get to a number that works, is there anything else that would prevent you from moving forward?"

This uncovers OTHER objections before you give away margin.

ENTERPRISE CLOSING TACTICS:

1. The Pilot-to-Paid Path
"Let's start with a 60-day pilot for [Department]. If you hit [metric], we expand company-wide at [price]. If not, no obligation. Fair?"

2. The Phased Rollout
"Year 1: 50 users at $[X]. Year 2: 200 users at $[Y]. Year 3: Enterprise-wide at $[Z]. This lets you prove ROI before full commitment."

3. The Annual Lock-In
"I can do $[X]/month if you commit to 12 months and pay annually. This also locks in your rate - prices go up [%] in Q3."

Remember: Enterprise buyers expect to negotiate. Build room into your pricing.`
        }
      ]
    },
    {
      id: 'scripts-and-templates',
      title: 'Ready-to-Use Scripts',
      icon: MessageSquare,
      color: 'bg-green-500',
      description: 'Copy-paste scripts for every scenario',
      lessons: [
        {
          title: 'Cold Call Scripts',
          content: `Complete scripts you can use immediately.

SCRIPT #1: THE DIRECT APPROACH
---
You: "Hi [Name], this is [Your Name] with Blue Collar Academy. Quick question - are you still looking for ways to close more deals and automate your follow-up?"

Prospect: "Uh... who is this?"

You: "Blue Collar Academy - we help contractors and service businesses like yours automate their sales process. Most of our clients were losing 40-50% of their leads due to slow follow-up. Is that something you're dealing with?"

Prospect: "Maybe... what do you do exactly?"

You: "We built software specifically for [their industry]. It automatically follows up with every lead, books appointments, and keeps deals moving through your pipeline. [Similar Company] started using it 90 days ago and increased their close rate from 18% to 31%. Worth a quick 10-minute demo to see if it would work for you?"

Prospect: "How much does it cost?"

You: "Investment depends on your team size and needs, but typically companies see a 3X-5X return in the first 90 days. That sound like something worth exploring? I can show you exactly what it would look like for [Company] tomorrow at 2 PM or Thursday at 10 AM - which works better?"
---

SCRIPT #2: THE REFERRAL APPROACH
---
You: "Hi [Name], I'm calling from Blue Collar Academy. I work with [Competitor/Similar Company] in [their city], and they mentioned you might be looking at upgrading your sales systems. Is that accurate?"

Prospect: "I don't know who said that..."

You: "No worries - I may have gotten my wires crossed. Let me ask you this: how are you currently handling lead follow-up and pipeline management?"

Prospect: "We use [Current System] / spreadsheets / nothing really"

You: "Got it. And how's that working for you? Are you getting to every lead within 5 minutes, or do some fall through the cracks?"

Prospect: "Yeah, we definitely lose some leads."

You: "That's exactly why [Similar Company] switched to us. They were in the same boat - great at the work, but losing leads left and right. Now they have a system that captures, follows up, and closes deals automatically. Want to see how it works? I can show you in 10 minutes."
---

SCRIPT #3: THE EVENT FOLLOW-UP
---
You: "Hi [Name], this is [Your Name] from Blue Collar Academy. I saw you attended [Event/Webinar] last week about [Topic]. How'd you like it?"

Prospect: "It was pretty good."

You: "Awesome. I'm actually calling everyone who attended because we're offering free strategy sessions this week. Basically, we look at your current sales process and show you exactly where you're losing deals and how to fix it. No cost, no obligation - worst case, you get some good ideas. Best case, we can help you implement them. Got 15 minutes Thursday at 10 AM?"
---

COMMON OBJECTION RESPONSES:

"I'm busy right now"
→ "Totally understand. This will take 60 seconds, tops. If you're already happy with how you're capturing and following up with leads, I'll let you go. But if you're losing even 2-3 deals per month to slow follow-up, this could be worth millions. Is that happening?"

"We already have a CRM"
→ "Perfect! Which one are you using? ... Great choice. Out of curiosity, is it doing everything you need? The reason I ask is that 80% of our clients came from [their CRM], not because it's bad, but because it wasn't built specifically for [their industry]. Is there anything you wish it did better?"

"Send me some information"
→ "Happy to! Just so I send the right stuff - what specifically about your sales process are you looking to improve? The follow-up automation, the pipeline management, or the reporting?"

"How much does it cost?"
→ "Great question. Investment depends on your team size - are you running this solo or do you have sales reps? [They answer] For a team that size, most clients invest between $[low] and $[high] per month. But the real question is: what's your average deal worth? [They answer] So if this helped you close even one extra deal per month, would that pay for itself?"

"Call me next quarter"
→ "I can definitely do that. Just curious - what's happening between now and next quarter that makes it better timing? [They answer] I ask because the average company loses $[amount] in the first 90 days they wait. Want to at least see what you're missing so you can make an informed decision?"

Remember: These are frameworks, not scripts to read word-for-word. Make them yours.`
        },
        {
          title: 'Email Templates',
          content: `High-converting email templates for every stage.

TEMPLATE #1: Cold Outreach
---
Subject: Question about [Company]

Hi [Name],

I noticed [specific observation about their company].

Most [industry] businesses we work with struggle with [pain point] - is this something you're dealing with?

We help companies like [Similar Company] [specific outcome]. They went from [before] to [after] in [timeframe].

Worth a quick call? I can show you exactly what it would look like for [Company].

[Your Name]
[Company] | [Phone]
---

TEMPLATE #2: Post-Connection (LinkedIn)
---
Subject: Thanks for connecting

[Name],

Thanks for connecting!

I see you're [Title] at [Company]. We work with a lot of [industry] companies helping them [outcome].

Currently working with [Similar Company] and they've seen [specific result].

If you're ever looking to [solve pain point], happy to share what's working for them.

[Your Name]
---

TEMPLATE #3: Post-Demo
---
Subject: Here's everything you need

Hi [Name],

Great call today! As promised:

📹 Demo recording: [link]
💰 ROI Calculator (showing $[X] annual return): [link]
📊 Case study from [Similar Company]: [link]

Next Steps:
1. Review materials above
2. Share with [Stakeholders mentioned]
3. Quick follow-up call [Day] at [Time]

Sound good?

[Your Name]
[Phone] (call/text anytime)

P.S. - The special pricing we discussed is good through [Date]. After that, we'll be at standard rates.
---

TEMPLATE #4: Following Up (No Response After Demo)
---
Subject: Still interested?

[Name],

Following up on our demo from [Day].

I know things get busy - just wanted to make sure this is still a priority for you.

If yes: Here's that ROI calculator again showing $[X]/year return: [link]

If not: No worries at all. Just let me know so I stop bothering you.

[Your Name]
---

TEMPLATE #5: The Breakup Email
---
Subject: Closing your file

[Name],

I've followed up a few times on the demo we did for [pain point solution]. Since I haven't heard back, I'm assuming it's not a priority right now.

I'm going to close your file on my end.

If things change and you want to revisit this in a few months, just reply to this email and I'll reopen everything.

Best of luck with [specific thing about their business]!

[Your Name]

P.S. - If you went with another solution, I'd love to know what made them a better fit. Always trying to improve. 🙏
---

TEMPLATE #6: Re-Engagement (Old Lead)
---
Subject: Still struggling with [pain point]?

Hey [Name],

We spoke [months] ago about [pain point]. You mentioned [specific thing they said].

Just curious - did you ever solve that, or is it still an issue?

If you solved it: Congrats! What did you end up doing?

If still an issue: We've added [new feature] specifically for this. [Similar Company] is using it and seeing [result]. Want me to show you?

[Your Name]
---

TEMPLATE #7: Referral Request
---
Subject: Quick favor?

Hi [Customer Name],

Hope [Company] is killing it with [your product]!

Quick favor: Do you know anyone else in [industry] who struggles with [pain point] like you used to?

I'd love to help them get similar results to what you're seeing.

If you can think of anyone, just forward this email or reply with their name/email.

Appreciate you!

[Your Name]

P.S. - For every referral that becomes a client, we'll give you [incentive - free month, gift card, etc.]
---

PRO TIPS:
• Keep emails under 150 words
• One clear call-to-action
• Personalize the first line
• Use their company name
• Test subject lines
• Send Tuesday-Thursday, 8-10 AM`
        },
        {
          title: 'Discovery Call Framework',
          content: `Complete framework for your discovery/qualification calls.

THE 5-PART DISCOVERY STRUCTURE:

PART 1: RAPPORT & CONTEXT (3 minutes)
Purpose: Make them comfortable and set the agenda

"Thanks for taking the time, [Name]. I've got about 30 minutes blocked - that still work for you? ... Perfect.

Here's how I typically run these: I'll ask you some questions about your current process, your goals, and what's working or not working. Then I can show you if and how we can help. Sound good?

Before we dive in - how'd you hear about us?"

---

PART 2: CURRENT STATE (8 minutes)
Purpose: Understand their situation

"Walk me through your sales process from start to finish - what happens when a lead comes in?"

[Let them talk, take notes]

"How many leads per month are we talking?"

"What percentage typically close?"

"How long does the average sales cycle take?"

"What are you using now to manage all this?"

"What's working well with that setup?"

---

PART 3: PAIN & PROBLEMS (8 minutes)
Purpose: Uncover the real issues

"You mentioned [thing they said] - tell me more about that. How big of a problem is it?"

"If you could wave a magic wand and fix one thing about your sales process, what would it be?"

"How much time would you say your team spends on [pain point] each week?"

"What's that costing you in terms of lost deals or revenue?"

"Have you tried to solve this before? What happened?"

"On a scale of 1-10, how urgent is fixing this?"

---

PART 4: DESIRED OUTCOME (5 minutes)
Purpose: Get them to articulate the solution

"If we were having this conversation a year from now and you were thrilled with the results, what would be different?"

"What specific metrics would you want to see improve?"

"What would that be worth to your business?"

"Who else at [Company] cares about solving this?"

---

PART 5: LOGISTICS & CLOSE (6 minutes)
Purpose: Qualify budget, authority, timeline

"Have you budgeted for a solution like this?"

"If this makes sense, what's the process for moving forward at [Company]?"

"What's your timeline for making a decision?"

"Is there anything that would prevent you from moving forward if this checks all the boxes?"

[If qualified, transition to demo or next steps]

---

QUALIFICATION CHECKLIST:
Before you do a demo, confirm:

✓ They have the problem you solve
✓ They've admitted it's costing them money/time
✓ They have budget or authority to find budget
✓ They're motivated to solve it soon
✓ There are no hidden blockers

If any are ✗, you're not ready for a demo yet.

---

RED FLAGS TO WATCH FOR:

🚩 "Just looking around" = Not a real buyer yet
🚩 "Need to talk to my partner" = Missing decision maker
🚩 "What's your best price?" = Price shopping, no value discussion
🚩 Vague answers to problem questions = No real pain
🚩 "Send me info" = Polite brush-off

If you see these, either disqualify or dig deeper before investing time in a demo.

---

DISCOVERY QUESTION BANK:

Current Situation:
• "How do you currently handle [process]?"
• "What does a typical day look like for your sales team?"
• "Walk me through your workflow from lead to close"

Problems:
• "What's the biggest bottleneck in your sales process?"
• "Where are you losing deals?"
• "What keeps you up at night about sales?"
• "If you do nothing, what happens?"

Impact:
• "How many deals are you losing per month because of this?"
• "What's your average deal size?"
• "How much is this problem costing you?"
• "What's your time worth per hour?"

Motivation:
• "Why now? Why not 6 months ago or 6 months from now?"
• "What happens if you don't fix this?"
• "How long have you been dealing with this?"

Authority & Process:
• "Who else needs to be involved in this decision?"
• "What does your buying process look like?"
• "How did you buy your last software tool?"
• "What's your budget for solving this?"

Vision:
• "What would success look like 90 days from now?"
• "If this worked perfectly, what would change?"
• "What would make you a hero internally?"

Remember: The person asking the questions controls the conversation.`
        }
      ]
    },
    {
      id: 'mindset-motivation',
      title: 'Sales Mindset & Motivation',
      icon: Award,
      color: 'bg-red-500',
      description: 'Develop the mental game of top performers',
      lessons: [
        {
          title: 'The Top 1% Mindset',
          content: `What separates elite salespeople from everyone else.

THE 80/20 RULE IN SALES:
• 20% of salespeople generate 80% of revenue
• Top performers earn 5-10X more than average performers
• The difference? Mindset, not talent

ELITE SELLER CHARACTERISTICS:

1. PROCESS OVER OUTCOMES
Average: "I need to close 3 deals this week"
Elite: "I need to make 100 calls and book 10 demos this week"

Why: You control activity, not outcomes. Focus on inputs.

2. REJECTION NEUTRAL
Average: Gets discouraged after 10 "no's"
Elite: "Every no gets me closer to yes. I need to hear 'no' 50 times to find my 3 wins."

Why: Takes emotion out of rejection. It's math, not personal.

3. LONG-TERM GREEDY
Average: Closes deals at any cost, even bad-fit clients
Elite: Walks away from bad-fit deals to protect time and reputation

Why: Bad clients cost more than they're worth. Elite sellers have standards.

4. ALWAYS LEARNING
Average: Does the same thing repeatedly, hopes for different results
Elite: Records calls, studies objections, tests new approaches

Why: Continuous improvement compounds over time.

5. COMPETITIVE WITH SELF
Average: Compares to other reps
Elite: "Did I beat yesterday's numbers? Am I better than last month?"

Why: You can only control yourself. Beat your personal best.

THE DAILY NON-NEGOTIABLES:

Morning Routine (30 min):
• Review goals
• Visualize successful calls
• Read/listen to 15 min of sales training
• Set intention for the day

Work Block #1 (9 AM - 12 PM):
• High-value prospecting and calls
• Most important deals first
• Phone time = no distractions

Work Block #2 (1 PM - 4 PM):
• Demos and follow-ups
• Email campaigns
• Pipeline management

End of Day (15 min):
• Update CRM
• Plan tomorrow's priority list
• Celebrate wins (even small ones)

REFRAMING LIMITING BELIEFS:

"I hate cold calling"
→ "Cold calling is how I create my own opportunities"

"They'll probably say no"
→ "Most will say no, which makes each call easier"

"I'm bothering people"
→ "I'm offering solutions to people who need them"

"I'm not good at sales"
→ "I'm getting better with every conversation"

"This is too expensive"
→ "Cheap solutions rarely solve expensive problems"

THE ABUNDANCE MINDSET:
There are millions of potential clients.
Losing one deal doesn't matter.
There's always another opportunity.

This removes desperation from your voice.

30-DAY CHALLENGE:
Track these daily for 30 days:
• Calls made
• Demos booked
• Deals closed
• Objections handled well
• New techniques tried

Review weekly. You'll see patterns and improvement.

Remember: Top performers aren't born. They're built through consistent daily action.`
        },
        {
          title: 'Handling Rejection Like a Pro',
          content: `Turning rejection from painful to powerful.

THE TRUTH ABOUT REJECTION:
• 90% of prospects will say "no"
• You'll hear "no" 100X more than "yes"
• Every top performer has been rejected 1000s of times
• Rejection is not personal - it's statistical

THE REJECTION REFRAME:

Bad Frame: "They rejected me"
Good Frame: "They rejected the offer at this moment"

The person who rejected you today might:
• Need more time to think
• Have bad timing right now
• Not understand the value yet
• Need to experience pain before buying
• Come back in 3-6 months ready

70% of sales happen after the 5th follow-up.
Most reps quit after 2.

TYPES OF "NO" AND WHAT THEY MEAN:

"Not interested" = "I don't understand the value yet"
Strategy: Better discovery questions next time

"Too expensive" = "I don't see the ROI"
Strategy: Build better value story with numbers

"Need to think about it" = "I'm not convinced or I need approval"
Strategy: Uncover the real objection

"Call me next quarter" = "Not urgent enough right now"
Strategy: Create urgency or follow up then

"We're using a competitor" = "I don't see why yours is better"
Strategy: Competitive differentiation story

Each "no" is feedback on your approach.

THE 5-SECOND RULE:
After a rejection:
• 5 seconds to feel it
• Take a breath
• Immediately dial the next number

Motion beats emotion. Keep moving.

REJECTION TRACKING:
Keep a "rejection journal" for one month:

Date | Prospect | Objection | What I learned
-----|----------|-----------|---------------
     |          |           |

After 30 days, you'll see patterns and know exactly which objections to prepare for.

THE REJECTION RECOVERY ROUTINE:

After a particularly hard "no":
1. Stand up and move (walk, stretch)
2. Listen to a hype song
3. Read your wins list
4. Call your easiest prospect
5. Remember your "why"

BUILDING REJECTION IMMUNITY:

Week 1: Make 50 cold calls
Week 2: Make 75 cold calls
Week 3: Make 100 cold calls
Week 4: Make 100 cold calls

By week 4, rejection won't phase you.

FAMOUS REJECTION STORIES:

• Babe Ruth struck out 1,330 times (he also hit 714 home runs)
• Walt Disney was fired for "lacking imagination"
• Oprah was fired from TV for being "unfit for television"
• Michael Jordan was cut from his high school basketball team
• Colonel Sanders was rejected 1,009 times before someone bought his chicken recipe

All legends have one thing in common:
They didn't stop after rejection.

THE ULTIMATE TRUTH:
Your income is on the other side of 1,000 rejections.
Get through them faster.

Remember: Every "no" is one closer to "yes".`
        },
        {
          title: 'Daily Motivation & Accountability',
          content: `Systems to stay motivated when the going gets tough.

THE MOTIVATION MYTH:
Motivation is fleeting. Discipline is reliable.
Elite performers don't wait to "feel like it."
They have systems.

BUILD YOUR SALES ROUTINE:

MORNING POWER HOUR (6-7 AM):
• 10 min: Review your goals and vision
• 20 min: Exercise or walk
• 15 min: Read sales book or listen to podcast
• 15 min: Plan your day's priorities

Why it works: Wins the morning, wins the day.

THE DAILY 8:
Every single day, complete these 8 tasks:

1. Make 20 outbound calls
2. Send 10 follow-up emails
3. Book 2 demos
4. Update CRM
5. Practice one objection response
6. Reach out to 1 past client for referral
7. Engage with 5 prospects on LinkedIn
8. Review tomorrow's priority list

These are non-negotiable. Do them before anything else.

ACCOUNTABILITY SYSTEMS:

1. THE PUBLIC COMMITMENT
Post your monthly goal on social media.
Update weekly.
Social pressure = powerful motivator.

2. THE MONEY JAR
Every day you hit your activity goals, put $10 in a jar.
Every day you miss, take out $20.
At month end, use the jar money for celebration.

3. THE ACCOUNTABILITY PARTNER
Find another rep.
Daily check-in text at 9 AM:
"Today I'm committing to [specific activities]"

Daily check-in text at 5 PM:
"Today I completed [Y/N]"

Miss 3 days in a row = buy partner dinner.

4. THE SCOREBOARD
Create a visible scoreboard in your workspace:

[THIS IS TABLE:
Week | Calls | Demos | Deals | Revenue
-----|-------|-------|-------|--------
  1  |   80  |   12  |   3   | $15K
  2  |   95  |   15  |   4   | $22K
  3  |  110  |   18  |   5   | $28K
]

Watching numbers go up is addictive.

MOTIVATION TRIGGERS:

When you don't feel like calling:
• Read your best customer testimonial
• Check your commission statement
• Look at a picture of your goal (car, house, vacation)
• Remember why you started
• Imagine yourself winning

THE "WHY" EXERCISE:
Write down:
• What are you working toward?
• Who are you doing this for?
• What happens if you quit?
• What happens if you push through?
• Where will you be in 5 years if you keep this up?

Read this EVERY morning.

CELEBRATING WINS:
Most reps only celebrate big wins.
Elite reps celebrate everything:

Small wins:
• Got past a gatekeeper? Win.
• Booked a demo? Win.
• Got a "yes" to a discovery question? Win.
• Left a good voicemail? Win.

Celebrating small wins creates momentum.

THE STREAK MENTALITY:
"I've made 20 calls every day for 47 days straight. I'm not breaking the streak today."

Streaks are powerful. Track them.

DEALING WITH SLUMPS:

Everyone hits slumps. Here's how to break out:

1. INCREASE ACTIVITY
When results dry up, do MORE, not less.
Double your call volume for one week.

2. CHANGE YOUR APPROACH
Try different opening lines, ask different questions, target different industries.

3. LEARN SOMETHING NEW
Take a course, read a book, study top performers.
New knowledge = new results.

4. TALK TO YOUR BEST CUSTOMERS
Nothing is more motivating than happy clients.
Ask them: "Why did you buy? What's working well?"

5. TAKE A BREAK
Sometimes you need a reset.
One day off to recharge = better than burning out.

THE IDENTITY SHIFT:
Stop thinking "I do sales"
Start thinking "I am a professional salesperson"

This small shift changes everything.

30-DAY MOMENTUM BUILDER:
Do one thing every day for 30 days:
• 20 cold calls minimum
• Even on bad days
• Even when you don't feel like it
• No excuses

After 30 days, it becomes automatic.

Remember: Motivation gets you started. Discipline keeps you going.`
        }
      ]
    }
  ];

  const renderLessonContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        elements.push(<div key={`space-${i}`} className="h-3" />);
      } else if (trimmed.startsWith('---')) {
        elements.push(<hr key={`hr-${i}`} className="my-6 border-gray-200" />);
      } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        elements.push(
          <li key={`bullet-${i}`} className="ml-6 mb-2 text-gray-700 list-disc">
            {trimmed.substring(1).trim()}
          </li>
        );
      } else if (trimmed.startsWith('✓') || trimmed.startsWith('✗') || trimmed.startsWith('🚩')) {
        elements.push(
          <div key={`check-${i}`} className="flex items-start space-x-2 mb-2 ml-4">
            <span className="text-lg">{trimmed[0]}</span>
            <span className="text-gray-700">{trimmed.substring(1).trim()}</span>
          </div>
        );
      } else if (trimmed.match(/^[A-Z\s]+:$/) || trimmed.match(/^THE [A-Z\s]+:$/) || trimmed.match(/^[A-Z][A-Z\s]+:$/)) {
        elements.push(
          <h4 key={`heading-${i}`} className="font-bold text-gray-900 mt-8 mb-3 text-xl">
            {trimmed}
          </h4>
        );
      } else if (trimmed.match(/^(SCRIPT|TEMPLATE|OBJECTION|PHASE|STEP|PART|TECHNIQUE|RESPONSE|CONCERN|RULE) (#{0,1}\d+|#\d+):/i)) {
        elements.push(
          <div key={`section-${i}`} className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
            <h5 className="font-bold text-blue-900 text-lg">{trimmed}</h5>
          </div>
        );
      } else if (trimmed.includes('Why it works:') || trimmed.includes('Why:') || trimmed.startsWith('Pro Tip:') || trimmed.startsWith('PRO TIP:') || trimmed.startsWith('Remember:')) {
        elements.push(
          <div key={`tip-${i}`} className="bg-green-50 border-l-4 border-green-500 p-3 my-3">
            <p className="font-semibold text-green-800">{trimmed}</p>
          </div>
        );
      } else if (trimmed.startsWith('AVOID:') || trimmed.startsWith('DEMO DON\'TS:') || trimmed.startsWith('Watch out for:') || trimmed.startsWith('RED FLAGS')) {
        elements.push(
          <div key={`warning-${i}`} className="bg-red-50 border-l-4 border-red-500 p-3 my-3">
            <h5 className="font-bold text-red-800">{trimmed}</h5>
          </div>
        );
      } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        elements.push(
          <blockquote key={`quote-${i}`} className="border-l-4 border-gray-300 pl-4 py-2 my-3 italic text-gray-700 bg-gray-50">
            {trimmed.substring(1, trimmed.length - 1)}
          </blockquote>
        );
      } else if (trimmed.startsWith('You:') || trimmed.startsWith('Prospect:')) {
        const speaker = trimmed.split(':')[0];
        const dialogue = trimmed.substring(speaker.length + 1).trim();
        elements.push(
          <div key={`dialogue-${i}`} className={`p-3 my-2 rounded-lg ${speaker === 'You' ? 'bg-blue-50 ml-0' : 'bg-gray-100 ml-8'}`}>
            <span className="font-semibold text-gray-900">{speaker}:</span>
            <span className="text-gray-700 ml-2">{dialogue}</span>
          </div>
        );
      } else if (trimmed.startsWith('Subject:')) {
        elements.push(
          <div key={`subject-${i}`} className="bg-yellow-50 border border-yellow-200 p-3 rounded my-3">
            <span className="font-semibold text-yellow-900">{trimmed}</span>
          </div>
        );
      } else if (trimmed.startsWith('→')) {
        elements.push(
          <div key={`arrow-${i}`} className="ml-8 mb-2 text-gray-600 italic flex items-start">
            <span className="mr-2">→</span>
            <span>{trimmed.substring(1).trim()}</span>
          </div>
        );
      } else if (trimmed.match(/^\d+\./)) {
        elements.push(
          <div key={`numbered-${i}`} className="ml-4 mb-2 text-gray-700 font-medium">
            {trimmed}
          </div>
        );
      } else {
        elements.push(
          <p key={`text-${i}`} className="mb-3 text-gray-700 leading-relaxed">
            {trimmed}
          </p>
        );
      }
    }

    return elements;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Sales Training Academy
            </h1>
          </div>
          <p className="text-lg text-gray-600 ml-15">
            Master cold calling, software sales, and become a top performer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {trainingModules.map((module) => {
            const Icon = module.icon;
            const completedCount = module.lessons.filter((_, idx) => isLessonComplete(module.id, idx)).length;
            const progressPercent = (completedCount / module.lessons.length) * 100;

            return (
              <div
                key={module.id}
                onClick={() => setActiveSection(module.id)}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group border border-gray-100"
              >
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-16 h-16 ${module.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
                      {module.lessons.length} Lessons
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {module.title}
                  </h3>

                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {module.description}
                  </p>

                  {completedCount > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{completedCount} of {module.lessons.length} completed</span>
                        <span className="font-semibold">{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                    <span>{completedCount > 0 ? 'Continue Learning' : 'Start Learning'}</span>
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeSection && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
              <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-2xl z-10">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const module = trainingModules.find(m => m.id === activeSection);
                        if (!module) return null;
                        const Icon = module.icon;
                        return (
                          <>
                            <div className={`w-10 h-10 ${module.color} rounded-lg flex items-center justify-center`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">
                              {module.title}
                            </h2>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        setActiveSection(null);
                        setActiveLesson(0);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {trainingModules
                      .find(m => m.id === activeSection)
                      ?.lessons.map((lesson, index) => {
                        const module = trainingModules.find(m => m.id === activeSection);
                        const isComplete = module ? isLessonComplete(module.id, index) : false;
                        return (
                          <button
                            key={index}
                            onClick={() => setActiveLesson(index)}
                            className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all flex items-center space-x-2 relative ${
                              activeLesson === index
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              activeLesson === index ? 'bg-white/20' : isComplete ? 'bg-green-500 text-white' : 'bg-gray-300'
                            }`}>
                              {isComplete ? '✓' : index + 1}
                            </span>
                            <span className={isComplete ? 'line-through opacity-75' : ''}>
                              {lesson.title}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto">
                {(() => {
                  const module = trainingModules.find(m => m.id === activeSection);
                  const lesson = module?.lessons[activeLesson];
                  if (!lesson) return null;

                  return (
                    <div>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {lesson.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {isLessonComplete(module.id, activeLesson) && (
                              <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Completed</span>
                              </div>
                            )}
                            <button
                              onClick={() => handleCopy(lesson.content)}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
                            >
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{module.lessons.length} lessons in this module</span>
                          <span>•</span>
                          <span>
                            {module.lessons.filter((_, idx) => isLessonComplete(module.id, idx)).length} completed
                          </span>
                        </div>
                      </div>

                      <div className="prose prose-lg max-w-none">
                        {renderLessonContent(lesson.content)}
                      </div>

                      <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
                        {!isLessonComplete(module.id, activeLesson) && (
                          <button
                            onClick={() => markLessonComplete(module.id, activeLesson)}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all shadow-md"
                          >
                            <CheckCircle className="w-5 h-5" />
                            <span>Mark as Complete</span>
                          </button>
                        )}

                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setActiveLesson(Math.max(0, activeLesson - 1))}
                            disabled={activeLesson === 0}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                              activeLesson === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                            <span>Previous</span>
                          </button>

                          <div className="text-sm text-gray-500 font-medium">
                            Lesson {activeLesson + 1} of {module?.lessons.length}
                          </div>

                          <button
                            onClick={() => {
                              if (module && activeLesson < module.lessons.length - 1) {
                                setActiveLesson(activeLesson + 1);
                              }
                            }}
                            disabled={!module || activeLesson === module.lessons.length - 1}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                              !module || activeLesson === module.lessons.length - 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                            }`}
                          >
                            <span>Next</span>
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesTools;
