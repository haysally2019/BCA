/*
  # Reduce Prospects to 20 for Testing

  1. Action
    - Delete all but 20 prospects from the Grant Martinez account
    - Keep the 20 most recently created prospects
  
  2. Reason
    - User wants only 20 prospects to improve loading performance
    - Testing infinite scroll with a smaller dataset
  
  3. Impact
    - 3,016 prospects will be deleted
    - Only 20 most recent prospects remain
*/

-- Delete all but the 20 most recent prospects for Grant Martinez (Tartan Builders Inc manager)
DELETE FROM prospects
WHERE company_id = '28eef186-2734-4c06-ae5f-b80de7f28da9'
AND id NOT IN (
  SELECT id 
  FROM prospects 
  WHERE company_id = '28eef186-2734-4c06-ae5f-b80de7f28da9'
  ORDER BY created_at DESC 
  LIMIT 20
);
