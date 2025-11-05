/*
  # Assign All Leads to Grant Martinez Manager Account

  1. Problem
    - 405 leads have company_id pointing to other profiles (Hayden Salyer's various IDs)
    - These leads should have company_id = Grant Martinez's manager ID
  
  2. Solution
    - Update all leads to have company_id = '28eef186-2734-4c06-ae5f-b80de7f28da9' (Grant Martinez)
    - This ensures Grant Martinez's manager portal shows all team leads
    - Preserves assigned_rep_id so sales reps still see their assigned leads
  
  3. Impact
    - Grant Martinez will see all 10,805 leads in manager portal
    - Sales reps continue to see only their assigned leads
    - No data loss, only company_id correction
*/

-- Update all leads that don't have Grant Martinez as company_id
UPDATE leads
SET company_id = '28eef186-2734-4c06-ae5f-b80de7f28da9'
WHERE company_id != '28eef186-2734-4c06-ae5f-b80de7f28da9'
OR company_id IS NULL;
