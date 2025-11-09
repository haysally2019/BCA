/*
  # Create Sales Templates Table

  1. New Tables
    - `sales_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text, required)
      - `kind` (text, required) - script, email, sms, proposal
      - `content` (text, required) - the actual template content
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `sales_templates` table
    - Add policy for authenticated users to manage their own templates
    - Users can only view and modify their own templates

  3. Indexes
    - Index on user_id for faster lookups
    - Index on kind for filtering by template type
*/

CREATE TABLE IF NOT EXISTS public.sales_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('script', 'email', 'sms', 'proposal')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_templates ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sales_templates_user_id ON public.sales_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_templates_kind ON public.sales_templates(kind);
CREATE INDEX IF NOT EXISTS idx_sales_templates_updated_at ON public.sales_templates(updated_at DESC);

-- RLS Policies
CREATE POLICY "Users can view own templates"
  ON public.sales_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.sales_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.sales_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.sales_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sales_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_templates_updated_at
  BEFORE UPDATE ON public.sales_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_templates_updated_at();