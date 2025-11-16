import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Upload,
  MapPin,
  Edit3,
  Trash2,
  Eye,
  Phone,
  Mail,
  Trophy,
  Users,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { supabaseService } from "../lib/supabaseService";
import LoadingSpinner from "./LoadingSpinner";
import BaseModal from "./modals/BaseModal";
import ConfirmationModal from "./modals/ConfirmationModal";
import LeadDetailsModal from "./modals/LeadDetailsModal";
import ImportLeadsModal from "./modals/ImportLeadsModal";
import toast from "react-hot-toast";

// Local Lead shape — kept generic so it works with your current table
export interface Lead {
  id: string;
  user_id?: string;
  company_id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: "new" | "contacted" | "qualified" | "won" | "lost" | string | null;
  source?: string | null;
  score?: number | null;
  notes?: string | null;
  created_at?: string | null;
}

type StatusFilter = "all" | "new" | "contacted" | "qualified" | "won" | "lost";

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
  avgScore: number;
}

const LeadManagement: React.FC = () => {
  const { profile } = useAuthStore();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);

  const [formData, setFormData] = useState<Partial<Lead>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "new",
    source: "manual",
    score: 60,
    notes: "",
  });

  // ------------------------------------------
  // LOAD LEADS (never hangs, always sets loading=false)
  // ------------------------------------------
  useEffect(() => {
    const load = async () => {
      // If there is no profile yet, just stop loading so UI doesn't spin forever
      if (!profile) {
        console.log("[LeadManagement] No profile, skipping load.");
        setLoading(false);
        return;
      }

      const ownerId = (profile as any).company_id || profile.id;

      if (!ownerId) {
        console.log("[LeadManagement] No owner id (company_id or id).");
        setLoading(false);
        return;
      }

      try {
        console.log("[LeadManagement] Fetching leads for owner:", ownerId);
        const result = await supabaseService.getLeads(ownerId as string);
        const safe = Array.isArray(result) ? (result as Lead[]) : [];
        setLeads(safe);
      } catch (err) {
        console.error("[LeadManagement] Error loading leads:", err);
        toast.error("Error loading leads");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile]);

  // ------------------------------------------
  // SAFE LEADS
  // ------------------------------------------
  const safeLeads: Lead[] = useMemo(
    () => (Array.isArray(leads) ? leads : []),
    [leads]
  );

  // ------------------------------------------
  // STATS
  // ------------------------------------------
  const stats: LeadStats = useMemo(() => {
    if (!safeLeads.length) {
      return {
        total: 0,
        new: 0,
        contacted: 0,
        qualified: 0,
        won: 0,
        lost: 0,
        avgScore: 0,
      };
    }

    const total = safeLeads.length;
    const byStatus = {
      new: 0,
      contacted: 0,
      qualified: 0,
      won: 0,
      lost: 0,
    };

    let scoreSum = 0;

    safeLeads.forEach((lead) => {
      const status = (lead.status || "new") as StatusFilter;
      if (status in byStatus) {
        // @ts-ignore
        byStatus[status] += 1;
      }
      scoreSum += lead.score ?? 0;
    });

    return {
      total,
      new: byStatus.new,
      contacted: byStatus.contacted,
      qualified: byStatus.qualified,
      won: byStatus.won,
      lost: byStatus.lost,
      avgScore: Math.round(scoreSum / total),
    };
  }, [safeLeads]);

  // ------------------------------------------
  // FILTERED LEADS
  // ------------------------------------------
  const filteredLeads = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return safeLeads.filter((lead) => {
      const name = (lead.name || "").toLowerCase();
      const phone = lead.phone || "";
      const email = (lead.email || "").toLowerCase();
      const address = (lead.address || "").toLowerCase();
      const status = (lead.status || "").toLowerCase();
      const source = (lead.source || "").toLowerCase();

      const matchesSearch =
        !term ||
        name.includes(term) ||
        phone.includes(searchTerm) ||
        email.includes(term) ||
        address.includes(term);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();

      const matchesSource =
        sourceFilter === "all" || source === sourceFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [safeLeads, searchTerm, statusFilter, sourceFilter]);

  // ------------------------------------------
  // FORM HELPERS
  // ------------------------------------------
  const openAddLead = () => {
    setEditingLead(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "new",
      source: "manual",
      score: 60,
      notes: "",
    });
    setShowFormModal(true);
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      address: lead.address || "",
      status: (lead.status as any) || "new",
      source: lead.source || "manual",
      score: lead.score ?? 60,
      notes: lead.notes || "",
    });
    setShowFormModal(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "score"
          ? Number(value)
          : (value as string),
    }));
  };

  const saveLead = async () => {
    if (!profile) {
      toast.error("No profile loaded.");
      return;
    }

    const ownerId = (profile as any).company_id || profile.id;

    if (!ownerId) {
      toast.error("Missing owner id.");
      return;
    }

    const payload: any = {
      ...formData,
      // These lines won’t break if your schema only uses one of them:
      company_id: (profile as any).company_id ?? null,
      user_id: profile.id,
    };

    setSaving(true);
    try {
      if (editingLead) {
        const { data, error } = await supabaseService.updateLead(
          editingLead.id,
          payload
        );

        if (error) throw error;
        const updated = Array.isArray(data) ? data[0] : data;

        setLeads((prev) =>
          prev.map((l) => (l.id === editingLead.id ? (updated as Lead) : l))
        );
        toast.success("Lead updated");
      } else {
        const { data, error } = await supabaseService.createLead(payload);

        if (error) throw error;
        const created = Array.isArray(data) ? data[0] : data;

        setLeads((prev) => [(created as Lead), ...prev]);
        toast.success("Lead created");
      }

      setShowFormModal(false);
      setEditingLead(null);
    } catch (err) {
      console.error("[LeadManagement] saveLead error:", err);
      toast.error("Error saving lead");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteLead = (lead: Lead) => {
    setLeadToDelete(lead);
    setShowDeleteConfirm(true);
  };

  const deleteLead = async () => {
    if (!leadToDelete) return;

    try {
      await supabaseService.deleteLead(leadToDelete.id);
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      toast.success("Lead deleted");
    } catch (err) {
      console.error("[LeadManagement] deleteLead error:", err);
      toast.error("Error deleting lead");
    } finally {
      setShowDeleteConfirm(false);
      setLeadToDelete(null);
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openDetails = (lead: Lead) => {
    setDetailsLead(lead);
    setShowDetailsModal(true);
  };

  // ------------------------------------------
  // RENDER
  // ------------------------------------------
  if (loading) {
    return (
      <LoadingSpinner
        size="lg"
        text="Loading leads..."
        className="h-64"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Lead Management
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Track every homeowner, follow-up, and deal in your roofing CRM pipeline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={openAddLead}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Total Leads</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-xl font-bold">{stats.total}</div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">New</span>
            <Plus className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-blue-700">
            {stats.new}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Contacted</span>
            <Phone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-700">
            {stats.contacted}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Qualified</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700">
            {stats.qualified}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Won</span>
            <Trophy className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-green-700">
            {stats.won}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Lost</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-red-700">
            {stats.lost}
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-none outline-none text-sm bg-transparent"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as StatusFilter)
            }
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="website">Website</option>
            <option value="facebook">Facebook</option>
            <option value="google_ads">Google Ads</option>
            <option value="referral">Referral</option>
          </select>
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={
                      filteredLeads.length > 0 &&
                      selectedLeads.length === filteredLeads.length
                    }
                    onChange={(e) =>
                      setSelectedLeads(
                        e.target.checked ? filteredLeads.map((l) => l.id) : []
                      )
                    }
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Lead
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Contact
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Address
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Source
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">
                  Score
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500 text-sm"
                  >
                    No leads found. Try adjusting filters or importing from CSV.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const name = lead.name || "Unnamed Lead";
                  const company = "Residential";
                  const phone = lead.phone || "";
                  const email = lead.email || "";
                  const address = lead.address || "";
                  const status = (lead.status || "new").toString();
                  const source = (lead.source || "manual").toString();
                  const score = lead.score ?? 0;

                  return (
                    <tr
                      key={lead.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => toggleSelectLead(lead.id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">
                          {name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {company}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1 text-xs">
                          {phone && (
                            <div className="flex items-center gap-1 text-gray-700">
                              <Phone className="w-3 h-3" />
                              <span>{phone}</span>
                            </div>
                          )}
                          {email && (
                            <div className="flex items-center gap-1 text-gray-700">
                              <Mail className="w-3 h-3" />
                              <span>{email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 text-gray-400" />
                          <span>{address || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full ${
                            status === "new"
                              ? "bg-blue-50 text-blue-700"
                              : status === "contacted"
                              ? "bg-amber-50 text-amber-700"
                              : status === "qualified"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "won"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {source}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-yellow-500" />
                          <span className="font-semibold">{score}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="p-1.5 rounded hover:bg-gray-100"
                            onClick={() => openDetails(lead)}
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-gray-100"
                            onClick={() => openEditLead(lead)}
                          >
                            <Edit3 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-red-50"
                            onClick={() => confirmDeleteLead(lead)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      <BaseModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingLead(null);
        }}
        title={editingLead ? "Edit Lead" : "Add Lead"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveLead();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                name="name"
                value={formData.name || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Homeowner name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                name="email"
                value={formData.email || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="name@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                name="phone"
                value={formData.phone || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="(555) 555-5555"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                name="address"
                value={formData.address || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Street, City, State"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={(formData.status as string) || "new"}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                name="source"
                value={(formData.source as string) || "manual"}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="website">Website</option>
                <option value="facebook">Facebook</option>
                <option value="google_ads">Google Ads</option>
                <option value="referral">Referral</option>
              </select>
            </div>
           <div>
  <label className="block text-xs font-medium text-gray-700 mb-1">
    Score
  </label>
  <input
    type="number"
    name="score"
    value={formData.score ?? 60}
    onChange={handleFormChange}
    className="w-full border rounded-lg px-3 py-2 text-sm"
    min={0}
    max={100}
  />
</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleFormChange}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Storm details, adjuster notes, insurance info, etc."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowFormModal(false);
                setEditingLead(null);
              }}
              className="px-3 py-2 text-sm border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Lead"}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* DELETE CONFIRM */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={deleteLead}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Lead?"
        message="This action cannot be undone."
      />

      {/* DETAILS MODAL */}
      {detailsLead && (
        <LeadDetailsModal
          isOpen={showDetailsModal}
          lead={detailsLead}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      {/* IMPORT MODAL */}
      <ImportLeadsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={() => {
          // optional: re-fetch leads after import
        }}
      />
    </div>
  );
};

export default LeadManagement;