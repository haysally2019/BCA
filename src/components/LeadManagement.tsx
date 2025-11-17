import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseService"; // ✅ Correct import

export default function LeadManagement() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeads() {
      try {
        setLoading(true);

        // 1. Get logged-in user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError("User not logged in.");
          setLoading(false);
          return;
        }

        // 2. Load leads
        const { data, error: leadsError } = await supabase
          .from("leads")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (leadsError) {
          console.error("[LeadManagement] Fetch error:", leadsError);
          setError("Could not load leads.");
          setLoading(false);
          return;
        }

        setLeads(data || []);
      } catch (err) {
        console.error("[LeadManagement] Unexpected error:", err);
        setError("Unexpected error loading leads.");
      }

      setLoading(false);
    }

    loadLeads();
  }, []);

  // ---------------------------
  // RENDER STATES
  // ---------------------------

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Lead Management</h1>
        <p className="text-gray-400 animate-pulse mt-4">Loading leads…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Lead Management</h1>
        <div className="p-4 bg-red-100 border rounded mt-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Lead Management</h1>
        <p className="mt-4 text-gray-600">No leads yet.</p>
      </div>
    );
  }

  // ---------------------------
  // LEAD LIST
  // ---------------------------

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Lead Management</h1>

      <div className="space-y-4">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="p-4 border rounded-lg bg-white shadow-sm"
          >
            <h3 className="font-semibold text-lg">{lead.name}</h3>
            <p className="text-sm text-gray-600">{lead.email}</p>
            <p className="text-sm text-gray-600">{lead.phone}</p>
            <p className="text-xs text-gray-500 mt-2">
              Created: {new Date(lead.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}