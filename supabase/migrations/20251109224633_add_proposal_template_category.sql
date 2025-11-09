/*
  # Add Proposal Template Category to Sales Material

  1. Changes
    - Expand the CHECK constraint on sales_material.category to include 'proposal_template'
    - Insert default empty record for proposal_template category

  2. Notes
    - This allows the Proposal Tools component to store and retrieve proposal templates
    - Managers can edit the template; all team members can use it to generate proposals
*/

-- Drop existing constraint
ALTER TABLE public.sales_material 
DROP CONSTRAINT IF EXISTS sales_material_category_check;

-- Add new constraint with proposal_template included
ALTER TABLE public.sales_material 
ADD CONSTRAINT sales_material_category_check 
CHECK (category IN ('scripts', 'pitch', 'objections', 'followup', 'resources', 'proposal_template'));

-- Insert default empty record for proposal_template
INSERT INTO public.sales_material (category, content)
VALUES ('proposal_template', '')
ON CONFLICT (category) DO NOTHING;