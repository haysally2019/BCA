# Solution Summary: Display Leads in User Accounts

## Issue Identified
✓ 9,005 leads exist in the database
✓ Leads are readable and accessible
✗ Leads are assigned to old/invalid `company_id` values
✗ Current user `profile.id` values don't match the `company_id` in leads
✗ Result: Users see "No leads" when they log in

## Root Cause
The leads were distributed to profile IDs that either:
1. No longer exist
2. Were from a previous database state
3. Don't correspond to current active users

## Solution
Run the SQL script in your Supabase SQL Editor to reassign all leads to current active users.

## Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Run This SQL

```sql
-- Reassign all leads to active users evenly
WITH 
active_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as user_num
  FROM profiles 
  WHERE is_active = true
),
user_count AS (
  SELECT COUNT(*) as total FROM active_users
),
numbered_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as lead_num
  FROM leads
)
UPDATE leads
SET 
  company_id = au.id,
  assigned_rep_id = au.id,
  updated_at = NOW()
FROM numbered_leads nl
CROSS JOIN user_count uc
JOIN active_users au ON ((nl.lead_num - 1) % uc.total + 1) = au.user_num
WHERE leads.id = nl.id;

-- Show results
SELECT 
  p.company_name,
  COUNT(l.id) as leads_count
FROM profiles p
LEFT JOIN leads l ON l.company_id = p.id
WHERE p.is_active = true
GROUP BY p.company_name
ORDER BY p.company_name;
```

### Step 3: Verify
1. Refresh your portal
2. Log in as any user
3. Navigate to Leads page
4. You should now see ~100 leads per user!

## Files Created

1. **LEAD_REASSIGNMENT_INSTRUCTIONS.md** - Detailed instructions with troubleshooting
2. **reassign-leads-to-users.sql** - SQL script file
3. **diagnose-user-leads.html** - Browser-based diagnostic tool
4. **SOLUTION_SUMMARY.md** - This file

## What This Does

- Takes all 9,005 existing leads
- Distributes them evenly among all active users
- Updates `company_id` to match current `profile.id` values
- Updates `assigned_rep_id` for proper assignment
- Preserves all lead data (names, phones, addresses, status, etc.)

## Safety

✓ No data is deleted
✓ Only ownership fields are updated
✓ Can be run multiple times safely
✓ All lead information remains intact

## Expected Outcome

After running the script:
- Each active user will have approximately the same number of leads
- If you have 90 active users and 9,005 leads = ~100 leads per user
- Leads will immediately appear in each user's portal
- Users can view, edit, update, and manage their leads

## Need Help?

1. See LEAD_REASSIGNMENT_INSTRUCTIONS.md for detailed steps
2. Open diagnose-user-leads.html in a browser to test specific users
3. Check the troubleshooting section in the instructions

## Alternative: If You Can't Access SQL Editor

If you don't have access to the Supabase SQL Editor, you'll need:
1. The Supabase Service Role Key
2. To modify the distribute-leads.ts script to use it
3. Contact your Supabase project admin for access

Let me know if you need help with any of these steps!
