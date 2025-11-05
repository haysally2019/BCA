/*
  # Fix Existing Prospects Company ID

  1. Problem
    - Existing prospects have company_id = assigned_rep_id (sales rep's ID)
    - Should have company_id = manager's ID for proper access control
  
  2. Solution
    - Update all prospects where assigned_rep_id is a sales_rep
    - Set company_id to the manager_id from team_members table
  
  3. Security
    - Only updates prospects for sales reps (not managers)
    - Preserves assigned_rep_id (who works the prospect)
    - Sets company_id to manager (who owns the team)
*/

-- Update prospects to have correct company_id (manager's ID)
UPDATE prospects p
SET company_id = tm.manager_id
FROM team_members tm
JOIN profiles pr ON pr.id = tm.profile_id
WHERE p.assigned_rep_id = tm.profile_id
  AND pr.user_role = 'sales_rep'
  AND p.company_id = p.assigned_rep_id
  AND tm.manager_id IS NOT NULL;
