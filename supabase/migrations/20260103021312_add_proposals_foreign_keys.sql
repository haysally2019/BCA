/*
  # Add Foreign Key Constraints to Proposals Table

  1. Changes
    - Add foreign key constraint from proposals.created_by to profiles.user_id
    - This enables proper joins in queries

  2. Security
    - No changes to RLS policies, just adding referential integrity
*/

-- Add foreign key constraint for created_by field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'proposals_created_by_fkey'
    AND table_name = 'proposals'
  ) THEN
    ALTER TABLE proposals
    ADD CONSTRAINT proposals_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES profiles(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;
