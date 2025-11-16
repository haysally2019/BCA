import { supabase } from "./supabaseClient";

// =====================================================
//  SUPABASE SERVICE — CLEAN VERSION
//  (ONLY SaaS CRM Leads + AffiliateWP + Auth)
// =====================================================

export const supabaseService = {
  // ---------------------------------------------------
  // AUTH
  // ---------------------------------------------------
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Error fetching profile:", err);
      return null;
    }
  },

  // ---------------------------------------------------
  // LEADS (SaaS CRM Selling Roofing CRM)
  // ---------------------------------------------------

  async getLeads(company_id: string) {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("company_id", company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error("Error fetching leads:", err);
      return [];
    }
  },

  async createLead(payload: any) {
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          company_name: payload.company_name ?? null,
          contact_name: payload.contact_name ?? null,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          service_area: payload.service_area ?? null,
          company_size: payload.company_size ?? null,
          crm_used_now: payload.crm_used_now ?? null,
          status: payload.status ?? "new",
          deal_value: payload.deal_value ?? 0,
          notes: payload.notes ?? null,
          user_id: payload.user_id ?? null,
          company_id: payload.company_id ?? null,
        })
        .select("*")
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error("Error creating lead:", err);
      return { data: null, error: err };
    }
  },

  async updateLead(id: string, payload: any) {
    try {
      const { data, error } = await supabase
        .from("leads")
        .update({
          company_name: payload.company_name ?? null,
          contact_name: payload.contact_name ?? null,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          service_area: payload.service_area ?? null,
          company_size: payload.company_size ?? null,
          crm_used_now: payload.crm_used_now ?? null,
          status: payload.status ?? "new",
          deal_value: payload.deal_value ?? 0,
          notes: payload.notes ?? null,
          user_id: payload.user_id ?? null,
          company_id: payload.company_id ?? null,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error("Error updating lead:", err);
      return { data: null, error: err };
    }
  },

  async deleteLead(id: string) {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error("Error deleting lead:", err);
      return { error: err };
    }
  },

  // ---------------------------------------------------
  // AFFILIATEWP METRICS (Manager & Rep Dashboard)
  // ---------------------------------------------------
  async getAffiliateStats(affiliateId: string) {
    try {
      const { data, error } = await supabase
        .from("affiliate_stats")
        .select("*")
        .eq("affiliate_id", affiliateId);

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error("Error fetching affiliate stats:", err);
      return [];
    }
  },

  async getAffiliateDashboard(company_id: string) {
    try {
      const { data, error } = await supabase
        .from("affiliate_dashboard")
        .select("*")
        .eq("company_id", company_id);

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error("Error fetching affiliate dashboard:", err);
      return [];
    }
  },

  // ---------------------------------------------------
  // TEAM ACCOUNTS (Managers + Reps)
  // ---------------------------------------------------
  async getTeamMembers(company_id: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", company_id);

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error("Error fetching team:", err);
      return [];
    }
  },

  async updateTeamMember(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Error updating team member:", err);
      return null;
    }
  },
};