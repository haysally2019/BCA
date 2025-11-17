// src/lib/supabaseService.ts

import { createClient } from "@supabase/supabase-js";
import { createAffiliateProfile } from "./affiliateService";

// Load Supabase credentials from Vite env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------
// TYPES
// ---------------------------------------------------
export interface AnalyticsData {
  totalRevenue: number;
  conversionRate: number;
  avgDealSize: number;
  activeDeals: number;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expected_close_date?: string;
  company_id: string;
  user_id: string;
  created_at?: string;
}

export interface DealStage {
  id: string;
  name: string;
  order: number;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  metadata?: any;
  created_at: string;
}

export interface Commission {
  id: string;
  amount: number;
  date: string;
  status: string;
  deal_id?: string;
  user_id: string;
  company_id: string;
}

export interface Prospect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  source?: string;
  user_id: string;
  company_id: string;
  created_at?: string;
}

// ---------------------------------------------------
// SIGNUP FUNCTION (with AffiliateWP integration)
// ---------------------------------------------------
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    console.error("[Supabase Signup Error]", error);
    return { error };
  }

  const userId = data.user.id;

  // CREATE AFFILIATE
  const affiliate = await createAffiliateProfile(email);

  // UPDATE PROFILES TABLE
  if (affiliate.ok) {
    await supabase
      .from("profiles")
      .update({
        affiliate_id: affiliate.affiliate_id,
        affiliate_url: affiliate.affiliate_url,
      })
      .eq("user_id", userId);
  }

  return { user: data.user };
}

// ---------------------------------------------------
// SUPABASE SERVICE OBJECT
// ---------------------------------------------------
export const supabaseService = {
  // LEADS
  async getLeads(userId: string) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  },

  async createLead(leadData: any) {
    const { data, error } = await supabase
      .from("leads")
      .insert([leadData])
      .select()
      .single();

    if (error) {
      console.error("Error creating lead:", error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  async updateLead(leadId: string, updates: any) {
    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      console.error("Error updating lead:", error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  async deleteLead(leadId: string) {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId);

    if (error) {
      console.error("Error deleting lead:", error);
      return { error };
    }

    return { error: null };
  },

  // ANALYTICS
  async getAnalyticsData(companyId: string, timeRange?: string): Promise<AnalyticsData> {
    return {
      totalRevenue: 0,
      conversionRate: 0,
      avgDealSize: 0,
      activeDeals: 0,
    };
  },

  // PROSPECTS
  async getProspects(companyId: string, limit: number = 50, offset: number = 0): Promise<Prospect[]> {
    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching prospects:", error);
      return [];
    }

    return data || [];
  },

  async getProspectsCount(companyId: string): Promise<number> {
    const { count, error } = await supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);

    if (error) {
      console.error("Error counting prospects:", error);
      return 0;
    }

    return count || 0;
  },

  // DEALS
  async getDeals(companyId: string): Promise<Deal[]> {
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching deals:", error);
      return [];
    }

    return data || [];
  },

  async getDealStages(companyId: string): Promise<DealStage[]> {
    const { data, error } = await supabase
      .from("deal_stages")
      .select("*")
      .eq("company_id", companyId)
      .order("order", { ascending: true });

    if (error) {
      console.error("Error fetching deal stages:", error);
      return [];
    }

    return data || [];
  },

  async getDealActivities(dealId: string): Promise<DealActivity[]> {
    const { data, error } = await supabase
      .from("deal_activities")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching deal activities:", error);
      return [];
    }

    return data || [];
  },

  async logDealActivity(dealId: string, userId: string, activityType: string, metadata?: any) {
    const { error } = await supabase
      .from("deal_activities")
      .insert([{
        deal_id: dealId,
        user_id: userId,
        activity_type: activityType,
        metadata,
      }]);

    if (error) {
      console.error("Error logging deal activity:", error);
      return { error };
    }

    return { error: null };
  },

  // COMMISSIONS
  async getCommissions(companyId: string): Promise<Commission[]> {
    const { data, error } = await supabase
      .from("commissions")
      .select("*")
      .eq("company_id", companyId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching commissions:", error);
      return [];
    }

    return data || [];
  },
};

// Default export (optional but safe)
export default supabase;