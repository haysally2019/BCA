/*
  # Create Sales Material Table

  1. New Tables
    - `sales_material`
      - `id` (uuid, primary key)
      - `category` (text, unique) - scripts, pitch, objections, followup, resources
      - `content` (text) - the actual material content (supports HTML/markdown)
      - `updated_by` (uuid, foreign key to auth.users) - last editor
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `sales_material` table
    - All authenticated users can read sales material
    - Only managers/admins can update sales material
    - Managers include: admin, manager roles

  3. Indexes
    - Unique index on category for fast lookups
    - Index on updated_by for audit tracking
*/

CREATE TABLE IF NOT EXISTS public.sales_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text UNIQUE NOT NULL CHECK (category IN ('scripts', 'pitch', 'objections', 'followup', 'resources')),
  content text DEFAULT '',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_material ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_material_category ON public.sales_material(category);
CREATE INDEX IF NOT EXISTS idx_sales_material_updated_by ON public.sales_material(updated_by);

-- RLS Policies: Everyone can read
CREATE POLICY "All authenticated users can view sales material"
  ON public.sales_material
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies: Only managers can insert/update
CREATE POLICY "Managers can insert sales material"
  ON public.sales_material
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can update sales material"
  ON public.sales_material
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sales_material_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_material_updated_at
  BEFORE UPDATE ON public.sales_material
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_material_updated_at();

-- Insert default empty records for each category
INSERT INTO public.sales_material (category, content)
VALUES 
  ('scripts', ''),
  ('pitch', ''),
  ('objections', ''),
  ('followup', ''),
  ('resources', '')
ON CONFLICT (category) DO NOTHING;