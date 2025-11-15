import React, { useCallback, useEffect, useState } from "react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAuthStore } from "../store/authStore";
import { X } from "lucide-react";

type Lead = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  owner_id: string | null;
  created_at: string;
};

type LeadNote = {
  id: number;
  lead_id: number;
  note: string;
  created_at: string;
  created_by: string;
};

const LeadManagement = () => {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");

  const isManager =
    profile?.user_role?.toLowerCase() === "manager" ||
    profile?.user_role?.toLowerCase() === "admin" ||
    profile?.user_role?.toLowerCase() === "owner";

  /* -------------------------------------------
     Load all leads (manager = all, rep = owned)
  ------------------------------------------- */
  const loadLeads = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isManager) {
      query = query.eq("owner_id", profile?.id);
    }

    const { data, error } = await query;
    if (!error) setLeads(data || []);

    setLoading(false);
  }, [supabase, isManager, profile?.id]);

  /* ------------------------
     Load notes for a lead
  ------------------------ */
  const loadNotes = async (leadId: number) => {
    const { data, error } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (!error) setNotes(data || []);
  };

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  /* ------------------------
     Add a note
  ------------------------ */
  const addNote = async () => {
    if (!selectedLead || !newNote.trim()) return;

    await supabase.from("lead_notes").insert({
      lead_id: selectedLead.id,
      note: newNote.trim(),
      created_by: profile?.id,
    });

    setNewNote("");
    loadNotes(selectedLead.id);
  };

  /* ------------------------
     Delete a lead
  ------------------------ */
  const deleteLead = async (id: number) => {
    if (!isManager) return;

    await supabase.from("leads").delete().eq("id", id);
    await supabase.from("lead_notes").delete().eq("lead_id", id);

    setSelectedLead(null);
    loadLeads();
  };

  /* --------------------------------------
     UI Utility: initials from full name
  -------------------------------------- */
  const initials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  /* ------------------------
      Render
  ------------------------ */
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Leads</h1>

      {/* Leads Table */}
      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">Lead</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedLead(lead);
                  loadNotes(lead.id);
                }}
              >
                <td className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                    {initials(lead.full_name)}
                  </div>
                  {lead.full_name}
                </td>

                <td className="p-3 capitalize text-gray-700">{lead.status}</td>
                <td className="p-3">{lead.phone}</td>
                <td className="p-3">{lead.email}</td>
                <td className="p-3">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>

                <td className="p-3 text-right">
                  <button className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-xs">
                    View
                  </button>
                </td>
              </tr>
            ))}

            {!loading && leads.length === 0 && (
              <tr>
                <td className="p-3 text-center text-gray-500" colSpan={6}>
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lead Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{selectedLead.full_name}</h2>
              <button onClick={() => setSelectedLead(null)}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contact details */}
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Phone:</span> {selectedLead.phone}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">Email:</span> {selectedLead.email}
            </p>

            {/* Notes Section */}
            <div className="border p-3 rounded-lg bg-gray-50 mb-4">
              <h3 className="font-semibold text-sm mb-2">Notes</h3>

              <div className="space-y-2 max-h-40 overflow-auto mb-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border rounded p-2 text-sm text-gray-800"
                  >
                    {note.note}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(note.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}

                {notes.length === 0 && (
                  <div className="text-sm text-gray-500">No notes yet.</div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  placeholder="Add note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <button
                  onClick={addNote}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Manager delete action */}
            {isManager && (
              <button
                className="text-red-600 text-sm flex items-center gap-2 hover:text-red-800"
                onClick={() => deleteLead(selectedLead.id)}
              >
                Delete Lead
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManagement;