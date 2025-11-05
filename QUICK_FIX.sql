-- ============================================================
-- QUICK FIX: Reassign Leads to Active Users
-- Copy and paste this entire script into Supabase SQL Editor
-- ============================================================

-- Step 1: Check current state
SELECT 
  'BEFORE UPDATE' as status,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(DISTINCT company_id) FROM leads) as profiles_with_leads;

-- Step 2: Reassign all leads evenly to active users
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

-- Step 3: Verify distribution
SELECT 
  p.company_name,
  COUNT(l.id) as lead_count
FROM profiles p
LEFT JOIN leads l ON l.company_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.company_name
ORDER BY p.company_name;

-- Step 4: Final summary
SELECT 
  'AFTER UPDATE' as status,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(DISTINCT company_id) FROM leads) as profiles_with_leads,
  ROUND((SELECT COUNT(*) FROM leads)::numeric / NULLIF((SELECT COUNT(*) FROM profiles WHERE is_active = true), 0), 0) as avg_leads_per_user;
