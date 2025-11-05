-- ============================================================
-- LEAD REASSIGNMENT SCRIPT
-- This script will reassign all existing leads to current users
-- Run this in your Supabase SQL Editor
-- ============================================================

-- First, let's see what we're working with
SELECT 
  'Current State' as info,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_profiles,
  (SELECT COUNT(*) FROM leads) as total_leads;

-- Get all active profiles and assign them a row number
WITH active_profiles AS (
  SELECT 
    id as profile_id,
    company_name,
    ROW_NUMBER() OVER (ORDER BY created_at) as profile_num
  FROM profiles
  WHERE is_active = true
),
-- Get all leads and assign them a row number
numbered_leads AS (
  SELECT 
    id as lead_id,
    ROW_NUMBER() OVER (ORDER BY created_at) as lead_num
  FROM leads
),
-- Calculate how many profiles we have
profile_count AS (
  SELECT COUNT(*) as total FROM active_profiles
)
-- Now update each lead to be assigned to a profile
-- Using modulo to distribute evenly
UPDATE leads
SET 
  company_id = ap.profile_id,
  assigned_rep_id = ap.profile_id,
  updated_at = NOW()
FROM numbered_leads nl
CROSS JOIN profile_count pc
JOIN active_profiles ap ON (((nl.lead_num - 1) % pc.total) + 1) = ap.profile_num
WHERE leads.id = nl.lead_id;

-- Verify the distribution
SELECT 
  p.company_name,
  p.id as profile_id,
  COUNT(l.id) as lead_count
FROM profiles p
LEFT JOIN leads l ON l.company_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.company_name
ORDER BY p.created_at;

-- Show total summary
SELECT 
  'Final State' as info,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_profiles,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(DISTINCT company_id) FROM leads) as profiles_with_leads;
