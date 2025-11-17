// supabaseService.ts
// CLEAN, FULLY PATCHED VERSION — SaaS CRM Leads + Roles

import { supabase } from "./supabaseClient";

export const supabaseService = {
  /* ============================================================
     AUTH HELPERS
  ============================================================ */

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[supabaseService] getProfile error:", error);
      return null;
    }
    return data;
  },

  /* ============================================================
     LEADS — FULLY MATCHED TO NEW DATABASE SCHEMA
  ============================================================ */

  async getLeads(ownerId?: string) {
    try {
      // RLS policies handle access control automatically
      // Admins see all leads, managers see company leads, reps see their own
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[supabaseService] getLeads error:", err);
      return [];
    }
  },

  async createLead(payload: any) {
    try {
      // Ensure payload is valid
      const cleaned = {
        company_name: payload.company_name || "",
        contact_name: payload.contact_name || "",
        email: payload.email || "",
        phone: payload.phone || "",
        service_area: payload.service_area || "",
        company_size: payload.company_size || "",
        crm_used_now: payload.crm_used_now || "",
        status: payload.status || "new",
        deal_value: payload.deal_value || 0,
        notes: payload.notes || "",
        user_id: payload.user_id,
        company_id: payload.company_id,
      };

      const { data, error } = await supabase
        .from("leads")
        .insert(cleaned)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (err) {
      console.error("[supabaseService] createLead error:", err);
      return { error: err };
    }
  },

  async updateLead(id: string, payload: any) {
    try {
      // Only include fields that are actually provided in the payload
      const cleaned: any = {};

      if (payload.company_name !== undefined) cleaned.company_name = payload.company_name;
      if (payload.contact_name !== undefined) cleaned.contact_name = payload.contact_name;
      if (payload.email !== undefined) cleaned.email = payload.email;
      if (payload.phone !== undefined) cleaned.phone = payload.phone;
      if (payload.service_area !== undefined) cleaned.service_area = payload.service_area;
      if (payload.company_size !== undefined) cleaned.company_size = payload.company_size;
      if (payload.crm_used_now !== undefined) cleaned.crm_used_now = payload.crm_used_now;
      if (payload.status !== undefined) cleaned.status = payload.status;
      if (payload.deal_value !== undefined) cleaned.deal_value = payload.deal_value;
      if (payload.notes !== undefined) cleaned.notes = payload.notes;
      if (payload.assigned_to !== undefined) cleaned.assigned_to = payload.assigned_to;

      const { data, error } = await supabase
        .from("leads")
        .update(cleaned)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (err) {
      console.error("[supabaseService] updateLead error:", err);
      return { error: err };
    }
  },

  async deleteLead(id: string) {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("[supabaseService] deleteLead error:", err);
      return false;
    }
  },

  /* ============================================================
     COMMISSIONS (UNCHANGED IF WORKING)
  ============================================================ */

  async getCommissions(companyId: string) {
    try {
      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[supabaseService] getCommissions error:", err);
      return [];
    }
  },

  /* ============================================================
     TEAM MEMBERS (UNCHANGED IF WORKING)
  ============================================================ */

  async getTeamMembers(companyId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId);

      if (error) throw error;

      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[supabaseService] getTeamMembers error:", err);
      return [];
    }
  },
};