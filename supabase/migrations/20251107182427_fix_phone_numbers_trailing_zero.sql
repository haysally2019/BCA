/*
  # Fix Phone Numbers - Remove Trailing Zero

  This migration removes the trailing '0' that was incorrectly added to all phone numbers during import.

  1. Changes
    - Updates all phone numbers in the prospects table that end with '0'
    - Removes the last character (the extra '0') from each phone number
  
  2. Notes
    - Only affects phone numbers that end with '0'
    - Uses SUBSTRING to remove the last character
*/

-- Remove trailing 0 from all phone numbers that end with 0
UPDATE prospects
SET phone = SUBSTRING(phone FROM 1 FOR LENGTH(phone) - 1)
WHERE phone LIKE '%0' AND LENGTH(phone) > 10;
