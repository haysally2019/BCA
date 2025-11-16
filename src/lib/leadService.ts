// src/lib/leadService.ts
import { supabase } from "./supabaseClient";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export interface LeadInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status?: LeadStatus;
  assigned_to?: string | null; // MUST be auth.uid() of a rep
}

export interface LeadRecord extends LeadInput {
  id: string;
  created_at: string;
  created_by: string; // auth.uid()
  assigned_to: string;
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("No authenticated user");

  return user.id;
}

// ---------------------------------------------------------
// CREATE LEAD (RLS SAFE)
// ---------------------------------------------------------
export async function createLead(input: LeadInput): Promise<LeadRecord> {
  const userId = await getCurrentUserId();

  const payload = {
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    notes: input.notes || null,
    status: input.status || "new",

    // MUST MATCH RLS
    created_by: userId,
    assigned_to: input.assigned_to || userId,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[createLead]", error);
    throw error;
  }

  return data as LeadRecord;
}

// ---------------------------------------------------------
// UPDATE LEAD (RLS SAFE)
// ---------------------------------------------------------
export async function updateLead(
  id: string,
  updates: Partial<LeadInput>
): Promise<LeadRecord> {
  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[updateLead]", error);
    throw error;
  }

  return data as LeadRecord;
}

// ---------------------------------------------------------
// GET LEADS FOR CURRENT USER
// RLS ensures reps only see their leads
// Managers see team leads if your RLS allows
// ---------------------------------------------------------
export async function getMyLeads(): Promise<LeadRecord[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getMyLeads]", error);
    throw error;
  }

  return data || [];
}