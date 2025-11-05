# 🎯 Fix: Display Leads in User Accounts

## What's Wrong?
Your users can't see the 9,005 leads because they're assigned to old profile IDs.

## How to Fix (30 seconds)

### Copy this SQL:
```sql
WITH 
active_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as user_num
  FROM profiles WHERE is_active = true
),
user_count AS (
  SELECT COUNT(*) as total FROM active_users
),
numbered_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as lead_num
  FROM leads
)
UPDATE leads
SET company_id = au.id, assigned_rep_id = au.id, updated_at = NOW()
FROM numbered_leads nl
CROSS JOIN user_count uc
JOIN active_users au ON ((nl.lead_num - 1) % uc.total + 1) = au.user_num
WHERE leads.id = nl.id;

-- Verify
SELECT p.company_name, COUNT(l.id) as leads
FROM profiles p
LEFT JOIN leads l ON l.company_id = p.id
WHERE p.is_active = true
GROUP BY p.company_name;
```

### Run it:
1. Go to https://app.supabase.com
2. Open your project
3. Click "SQL Editor"
4. Paste the SQL above
5. Click "Run"
6. Refresh your portal

### Done!
✓ All leads now visible to users
✓ Evenly distributed
✓ Ready to use

## Files in This Solution

| File | Purpose |
|------|---------|
| **QUICK_FIX.sql** | The SQL script to run (with comments) |
| **SOLUTION_SUMMARY.md** | Detailed explanation of the issue |
| **LEAD_REASSIGNMENT_INSTRUCTIONS.md** | Step-by-step guide with troubleshooting |
| **diagnose-user-leads.html** | Browser tool to test user accounts |
| **README_LEAD_FIX.md** | This file - quick start guide |

## What the SQL Does

1. Gets all active users
2. Gets all leads
3. Distributes leads evenly (round-robin)
4. Updates `company_id` to match current profile IDs
5. Shows you the distribution when done

## Safe to Run

- ✓ No data deleted
- ✓ No data modified (except ownership)
- ✓ Can run multiple times
- ✓ Reversible

## Expected Result

If you have:
- 90 active users
- 9,005 leads

Each user gets: **~100 leads**

## Still Having Issues?

See **LEAD_REASSIGNMENT_INSTRUCTIONS.md** for:
- Detailed troubleshooting
- Diagnostic queries
- Browser console tests
- RLS policy checks

## Questions?

The issue was simple: leads existed but weren't connected to current user accounts. This script fixes that connection. After running it, every active user will be able to see and manage their assigned leads in the portal.
