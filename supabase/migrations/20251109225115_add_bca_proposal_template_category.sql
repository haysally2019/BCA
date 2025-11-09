/*
  # Add BCA Proposal Template Category

  1. Changes
    - Update CHECK constraint to include 'bca_proposal_template'
    - Insert default empty record for bca_proposal_template

  2. Notes
    - Used by ProposalToolsPage component for Blue Collar Academy proposals
*/

-- Drop existing constraint
ALTER TABLE public.sales_material 
DROP CONSTRAINT IF EXISTS sales_material_category_check;

-- Add new constraint including bca_proposal_template
ALTER TABLE public.sales_material 
ADD CONSTRAINT sales_material_category_check 
CHECK (category IN ('scripts', 'pitch', 'objections', 'followup', 'resources', 'proposal_template', 'bca_proposal_template'));

-- Ensure record exists
INSERT INTO public.sales_material (category, content)
VALUES ('bca_proposal_template', '')
ON CONFLICT (category) DO NOTHING;