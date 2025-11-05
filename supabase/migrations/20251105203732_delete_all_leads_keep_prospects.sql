/*
  # Delete All Leads, Keep Prospects

  1. Action
    - Delete all 10,805 leads from the leads table
    - Keep all 3,036 prospects in the prospects table
  
  2. Reason
    - User requested to consolidate data by keeping only prospects
    - Leads and prospects are functionally the same thing in this system
  
  3. Impact
    - All lead records will be permanently deleted
    - Prospects remain untouched
    - No data recovery possible after this migration
*/

-- Delete all leads
DELETE FROM leads;
