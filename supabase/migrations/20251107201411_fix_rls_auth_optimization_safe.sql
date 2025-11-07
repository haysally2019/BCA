/*
  # Fix RLS Performance - Safe Auth UID Optimization

  1. Replace auth.uid() with (select auth.uid()) in RLS policies
    - Only updates policies on tables that exist with correct schema
    - Prevents re-evaluation for better performance
    
  2. Security
    - No functional changes
    - Performance optimization only
*/

-- ============================================================================
-- Fix payout tables policies (safe - we created these)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own payout information" ON public.payout_information;
CREATE POLICY "Users can view their own payout information"
  ON public.payout_information FOR SELECT TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert their own payout information" ON public.payout_information;
CREATE POLICY "Users can insert their own payout information"
  ON public.payout_information FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own payout information" ON public.payout_information;
CREATE POLICY "Users can update their own payout information"
  ON public.payout_information FOR UPDATE TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own payout information" ON public.payout_information;
CREATE POLICY "Users can delete their own payout information"
  ON public.payout_information FOR DELETE TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view their own payout history" ON public.payout_history;
CREATE POLICY "Users can view their own payout history"
  ON public.payout_history FOR SELECT TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view their own audit log" ON public.payout_audit_log;
CREATE POLICY "Users can view their own audit log"
  ON public.payout_audit_log FOR SELECT TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- Fix profiles policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- Fix prospects policies (has company_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view prospects assigned to them or in their company" ON public.prospects;
CREATE POLICY "Users can view prospects assigned to them or in their company"
  ON public.prospects FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create prospects for their company" ON public.prospects;
CREATE POLICY "Users can create prospects for their company"
  ON public.prospects FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update prospects assigned to them or in their company" ON public.prospects;
CREATE POLICY "Users can update prospects assigned to them or in their company"
  ON public.prospects FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete prospects assigned to them or in their company" ON public.prospects;
CREATE POLICY "Users can delete prospects assigned to them or in their company"
  ON public.prospects FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- Fix team_members policies
-- ============================================================================

DROP POLICY IF EXISTS "Sales reps can view own team member record" ON public.team_members;
CREATE POLICY "Sales reps can view own team member record"
  ON public.team_members FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Managers can view their team members" ON public.team_members;
CREATE POLICY "Managers can view their team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can insert team members by user_id" ON public.team_members;
CREATE POLICY "Managers can insert team members by user_id"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE user_id = (select auth.uid()) AND user_role IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update team members in their company" ON public.team_members;
CREATE POLICY "Managers can update team members in their company"
  ON public.team_members FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE user_id = (select auth.uid()) AND user_role IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can delete team members in their company" ON public.team_members;
CREATE POLICY "Managers can delete team members in their company"
  ON public.team_members FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE user_id = (select auth.uid()) AND user_role IN ('manager', 'admin')
    )
  );

-- ============================================================================
-- Fix team_notes policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view all non-private notes or own private notes" ON public.team_notes;
CREATE POLICY "Users can view all non-private notes or own private notes"
  ON public.team_notes FOR SELECT TO authenticated
  USING (
    is_private = false OR created_by = (select auth.uid())
  );

-- ============================================================================
-- Fix lead_activities policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own activities" ON public.lead_activities;
CREATE POLICY "Users can update own activities"
  ON public.lead_activities FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- Fix commission_rate_templates policies
-- ============================================================================

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.commission_rate_templates;
CREATE POLICY "Enable insert for authenticated users"
  ON public.commission_rate_templates FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.commission_rate_templates;
CREATE POLICY "Enable update for authenticated users"
  ON public.commission_rate_templates FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.commission_rate_templates;
CREATE POLICY "Enable delete for authenticated users"
  ON public.commission_rate_templates FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);