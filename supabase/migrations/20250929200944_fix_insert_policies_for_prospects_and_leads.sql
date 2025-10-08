/*
  # Fix INSERT policies for prospects and leads tables

  1. Problem Identified
    - INSERT policies for prospects and leads tables are missing WITH CHECK clauses
    - This prevents users from actually inserting data even though they have permission
    
  2. Changes Made
    - Drop existing INSERT policies for prospects and leads tables
    - Recreate INSERT policies with proper WITH CHECK clauses
    - Ensure users can only insert records with their own company_id
    
  3. Security
    - Maintains RLS security by checking company_id matches user's profile
    - Users can only create records for their own company
*/

-- Fix prospects table INSERT policy
DROP POLICY IF EXISTS "Users can create prospects for their company" ON prospects;

CREATE POLICY "Users can create prospects for their company"
  ON prospects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

-- Fix leads table INSERT policy  
DROP POLICY IF EXISTS "Users can create leads for their company" ON leads;

CREATE POLICY "Users can create leads for their company"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  );