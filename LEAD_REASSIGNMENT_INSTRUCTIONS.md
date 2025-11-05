# Lead Reassignment Instructions

## Problem
The 9,005 leads that were distributed are not showing up in user accounts because the `company_id` values in the leads table don't match the current `profile.id` values of your users.

## Solution
Run the SQL script below in your Supabase Dashboard to reassign all leads to current active users.

## Steps to Fix

### Option 1: Simple SQL Script (Recommended)

1. Open your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Check current state
SELECT 
  'Before Update' as status,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(DISTINCT company_id) FROM leads) as companies_with_leads;

-- Reassign leads evenly to all active users
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

-- Verify the results
SELECT 
  p.company_name,
  COUNT(l.id) as leads_assigned
FROM profiles p
LEFT JOIN leads l ON l.company_id = p.id
WHERE p.is_active = true
GROUP BY p.company_name
ORDER BY p.company_name;

-- Final summary
SELECT 
  'After Update' as status,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(DISTINCT company_id) FROM leads) as companies_with_leads,
  ROUND((SELECT COUNT(*) FROM leads)::numeric / (SELECT COUNT(*) FROM profiles WHERE is_active = true), 0) as avg_leads_per_user;
```

6. Click **Run** or press Ctrl+Enter
7. Wait for the query to complete
8. Check the results to confirm even distribution
9. **Refresh your portal** - leads should now appear!

### Option 2: Diagnostic First Approach

If you want to be extra careful, run this diagnostic query first:

```sql
-- DIAGNOSTIC ONLY - Does not modify data
SELECT 
  'Profiles' as table_name,
  COUNT(*) as count,
  string_agg(DISTINCT company_name, ', ') as sample_names
FROM profiles
WHERE is_active = true

UNION ALL

SELECT 
  'Leads' as table_name,
  COUNT(*) as count,
  COUNT(DISTINCT company_id)::text as unique_companies
FROM leads;

-- Show sample of current lead assignments
SELECT 
  company_id,
  COUNT(*) as lead_count
FROM leads
GROUP BY company_id
ORDER BY lead_count DESC
LIMIT 10;
```

This will show you:
- How many active users you have
- How many leads exist
- How leads are currently distributed

Then run the main script from Option 1.

## Expected Results

After running the script:
- All active users should have leads assigned
- Leads will be distributed evenly (e.g., if you have 90 users and 9,005 leads, each user gets ~100 leads)
- Users can immediately see their leads when they log into the portal
- No data is lost - only the `company_id` and `assigned_rep_id` fields are updated

## Verification

After running the script, log in as any user and:
1. Go to the Leads page
2. You should see ~100 leads (or however many were distributed per user)
3. All leads should be clickable and manageable

## Troubleshooting

**If leads still don't appear:**

1. Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'leads';
```

2. Verify user's profile ID matches leads:
   - Log in as a user
   - Open browser console and run:
   ```javascript
   const { data } = await window.supabase.auth.getUser();
   console.log('User ID:', data.user.id);
   
   const { data: profile } = await window.supabase
     .from('profiles')
     .select('*')
     .eq('user_id', data.user.id)
     .single();
   console.log('Profile ID:', profile.id);
   
   const { count } = await window.supabase
     .from('leads')
     .select('*', { count: 'exact', head: true })
     .eq('company_id', profile.id);
   console.log('Leads for this profile:', count);
   ```

3. If count is still 0, the profile may not be marked as active:
```sql
UPDATE profiles SET is_active = true WHERE user_id = 'USER_ID_HERE';
```

## Notes

- This script is safe to run multiple times
- It will not delete any leads
- It only updates the assignment/ownership of leads
- All lead data (names, phones, addresses, etc.) remains intact
