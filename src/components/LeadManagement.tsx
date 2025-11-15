import React, { useEffect, useState, useMemo } from "react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAuthStore } from "../store/authStore";
import {
  PlusCircle,
  Search,
  X,
  ClipboardList,
  Trash,
  UserIcon,
  Edit,
  NoteIcon,
} from "lucide-react";

// Utility — get initials from a name
const initials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const LeadManagement = () => {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");

  const isManager =
    profile?.user_role === "manager" ||
    profile?.user_role === "admin" ||
    profile?.user_role === "owner";

  // Fetch leads
  const loadLeads = async () => {
    setLoading(true);

    let query = supabase.from("leads").select("*").order("created_at", {
      ascending: false,
    });

    if (!isManager) {
      query = query.eq("owner_id", profile?.id);
    }

    const { data, error } = await query;
    if (!error) setLeads(data || []);
    setLoading(false);
  };

  // Fetch notes for selected lead
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
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const text = `${lead.full_name} ${lead.email} ${lead.phone} ${lead.status}`
        .toLowerCase()
        .trim();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        lead.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, leads]);

  const deleteLead = async (id: number) => {
    if (!isManager) return;

    await supabase.from("leads").delete().eq("id", id);
    await supabase.from("lead_notes").delete().eq("lead_id", id);
    loadLeads();
    setSelectedLead(null);
  };

  const addNote = async () =>
    {
      if (!selectedLead || !newNote.trim()) return;

      await supabase.from("lead_notes").insert({
        lead_id: selectedLead.id,
        note: newNote.trim(),
        created_by: profile?.id,
      });

      setNewNote("");
      loadNotes(selectedLead.id);
    };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-white border px-3 py-2 rounded-lg w-full max-w-md">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            className="w-full outline-none text-sm"
            placeholder="Search leads by name, phone, email, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="px-3 py-2 border bg-white rounded-lg text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="working">Working</option>
          <option value="interested">Interested</option>
          <option value="not-interested">Not Interested</option>
          <option value="closed">Closed</option>
        </select>
      </div>

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
            {filteredLeads.map((lead) => (
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

            {filteredLeads.length === 0 && !loading && (
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {selectedLead.full_name}
              </h2>
              <button onClick={() => setSelectedLead(null)}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Details */}
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Phone:</span> {selectedLead.phone}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">Email:</span> {selectedLead.email}
            </p>

            {/* Notes */}
            <div className="border p-3 rounded-lg bg-gray-50 mb-4">
              <h3 className="font-semibold text-sm mb-2">Notes</h3>

              <div className="space-y-2 max-h-40 overflow-auto mb-3">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="bg-white border rounded p-2 text-sm text-gray-800"
                  >
                    {n.note}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
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

            {/* Manager Actions */}
            {isManager && (
              <button
                className="text-red-600 text-sm flex items-center gap-2 hover:text-red-800"
                onClick={() => deleteLead(selectedLead.id)}
              >
                <Trash className="w-4 h-4" /> Delete Lead
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManagement;