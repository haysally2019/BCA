/*
  # Fix Existing Leads Company ID

  1. Problem
    - Existing leads have company_id = assigned_rep_id (sales rep's ID)
    - Should have company_id = manager's ID for proper access control
  
  2. Solution
    - Update all leads where assigned_rep_id is a sales_rep
    - Set company_id to the manager_id from team_members table
  
  3. Security
    - Only updates leads for sales reps (not managers)
    - Preserves assigned_rep_id (who works the lead)
    - Sets company_id to manager (who owns the team)
*/

-- Update leads to have correct company_id (manager's ID)
UPDATE leads l
SET company_id = tm.manager_id
FROM team_members tm
JOIN profiles pr ON pr.id = tm.profile_id
WHERE l.assigned_rep_id = tm.profile_id
  AND pr.user_role = 'sales_rep'
  AND l.company_id = l.assigned_rep_id
  AND tm.manager_id IS NOT NULL;
