/*
  # Create commission rate templates table

  1. New Tables
    - `commission_rate_templates`
      - `id` (uuid, primary key)
      - `name` (text, required) - Template name
      - `description` (text, optional) - Template description
      - `upfront_rate` (numeric, required) - Upfront commission rate percentage
      - `residual_rate` (numeric, required) - Residual commission rate percentage
      - `tier_level` (text, required) - Affiliate tier level (bronze, silver, gold, platinum, standard)
      - `is_default` (boolean, required) - Whether this is the default template
      - `is_active` (boolean, required) - Whether this template is active
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `commission_rate_templates` table
    - Add policies for authenticated users to read, insert, update, and delete
    - Add unique constraint to ensure only one default template exists

  3. Initial Data
    - Insert default template for standard tier affiliates
*/

-- Create the commission_rate_templates table
CREATE TABLE IF NOT EXISTS public.commission_rate_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    upfront_rate numeric(5,2) NOT NULL CHECK (upfront_rate >= 0 AND upfront_rate <= 100),
    residual_rate numeric(5,2) NOT NULL CHECK (residual_rate >= 0 AND residual_rate <= 100),
    tier_level text NOT NULL CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum', 'standard')),
    is_default boolean NOT NULL DEFAULT FALSE,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.commission_rate_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" 
ON public.commission_rate_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.commission_rate_templates 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" 
ON public.commission_rate_templates 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" 
ON public.commission_rate_templates 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Add unique constraint for is_default to ensure only one default template
CREATE UNIQUE INDEX IF NOT EXISTS commission_rate_templates_unique_default 
ON public.commission_rate_templates (is_default) 
WHERE is_default IS TRUE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_commission_rate_templates_tier_level 
ON public.commission_rate_templates (tier_level);

CREATE INDEX IF NOT EXISTS idx_commission_rate_templates_is_active 
ON public.commission_rate_templates (is_active);

-- Insert default templates
INSERT INTO public.commission_rate_templates (name, description, upfront_rate, residual_rate, tier_level, is_default, is_active)
VALUES 
  ('Standard Tier', 'Default commission rates for new affiliates', 10.00, 5.00, 'standard', TRUE, TRUE),
  ('Bronze Tier', 'Entry level affiliate commission rates', 8.00, 4.00, 'bronze', FALSE, TRUE),
  ('Silver Tier', 'Mid-level affiliate commission rates', 12.00, 6.00, 'silver', FALSE, TRUE),
  ('Gold Tier', 'High-performing affiliate commission rates', 15.00, 8.00, 'gold', FALSE, TRUE),
  ('Platinum Tier', 'Top-tier affiliate commission rates', 20.00, 10.00, 'platinum', FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_commission_rate_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_commission_rate_templates_updated_at
    BEFORE UPDATE ON public.commission_rate_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_commission_rate_templates_updated_at();