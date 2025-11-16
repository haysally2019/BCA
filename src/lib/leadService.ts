import { supabase } from "./supabaseClient";

// Pipeline statuses
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface LeadInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: LeadStatus;
  assigned_to?: string | null; // auth.uid() only
}

export interface LeadRecord extends LeadInput {
  id: string;
  created_at: string;
  created_by: string;
  assigned_to: string;
}

// Fetch current authenticated user ID
async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");
  return user.id;
}

// CREATE lead (RLS safe)
export async function createLead(input: LeadInput): Promise<LeadRecord> {
  const uid = await getCurrentUserId();

  const payload = {
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    notes: input.notes || null,
    status: input.status || "new",
    created_by: uid,
    assigned_to: input.assigned_to || uid,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  return data as LeadRecord;
}

// UPDATE lead
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

  if (error) throw error;
  return data as LeadRecord;
}

// GET leads (RLS enforced)
export async function getLeads(): Promise<LeadRecord[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as LeadRecord[];
}