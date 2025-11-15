import React, { useState, useEffect } from "react";
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
  X,
  CheckCircle,
  AlertCircle,
  Users
} from "lucide-react";
import { supabaseService, type Lead } from "../lib/supabaseService";
import { useAuthStore } from "../store/authStore";
import LoadingSpinner from "./LoadingSpinner";
import BaseModal from "./modals/BaseModal";
import ConfirmationModal from "./modals/ConfirmationModal";
import LeadDetailsModal from "./modals/LeadDetailsModal";
import ImportLeadsModal from "./modals/ImportLeadsModal";
import BulkActionsModal from "./modals/BulkActionsModal";
import toast from "react-hot-toast";

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
  const [filterStatus, setFilterStatus] = useState<"all" | Lead["status"]>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Lead>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "new",
    source: "manual",
    score: 50,
    notes: "",
  });

  useEffect(() => {
    if (!profile?.company_id) return;

    const load = async () => {
      try {
        const result = await supabaseService.getLeads(profile.company_id!);
        setLeads(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Error loading leads:", err);
        toast.error("Error loading leads");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile?.company_id]);

  // ------------------------------------------
  // SAFE LEADS ARRAY
  // ------------------------------------------
  const safeLeads: Lead[] = Array.isArray(leads) ? leads : [];

  // ------------------------------------------
  // STATS
  // ------------------------------------------
  const leadStats: LeadStats = {
    total: safeLeads.length,
    new: safeLeads.filter((l) => l.status === "new").length,
    contacted: safeLeads.filter((l) => l.status === "contacted").length,
    qualified: safeLeads.filter((l) => l.status === "qualified").length,
    won: safeLeads.filter((l) => l.status === "won").length,
    lost: safeLeads.filter((l) => l.status === "lost").length,
    avgScore:
      safeLeads.length === 0
        ? 0
        : Math.round(
            safeLeads.reduce((sum, l) => sum + (l.score || 0), 0) /
              safeLeads.length
          ),
  };

  // ------------------------------------------
  // FILTERED LEADS
  // ------------------------------------------
  const filteredLeads = safeLeads.filter((lead) => {
    const search = searchTerm.toLowerCase();

    const name = (lead.name || "").toLowerCase();
    const phone = lead.phone || "";
    const email = (lead.email || "").toLowerCase();
    const address = (lead.address || "").toLowerCase();

    const matchesSearch =
      name.includes(search) ||
      phone.includes(searchTerm) ||
      email.includes(search) ||
      address.includes(search);

    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchesSource = filterSource === "all" || lead.source === filterSource;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const toggleLeadSelection = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((leadId) => leadId !== id) : [...prev, id]
    );
  };

  const openAddLead = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "new",
      source: "manual",
      score: 50,
      notes: "",
    });
    setEditingLead(null);
    setShowAddModal(true);
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      address: lead.address || "",
      status: lead.status || "new",
      source: lead.source || "manual",
      score: lead.score || 50,
      notes: lead.notes || "",
    });
    setShowEditModal(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveLead = async () => {
    if (!profile?.company_id) return;

    setSaving(true);
    try {
      if (editingLead) {
        const { data, error } = await supabaseService.updateLead(editingLead.id, {
          ...formData,
          company_id: profile.company_id,
        });

        if (error) throw error;

        const updated = data as Lead;
        setLeads((prev) =>
          prev.map((l) => (l.id === updated.id ? updated : l))
        );

        toast.success("Lead updated");
        setShowEditModal(false);
      } else {
        const { data, error } = await supabaseService.createLead({
          ...formData,
          company_id: profile.company_id,
        });

        if (error) throw error;

        const created = data as Lead;
        setLeads((prev) => [created, ...prev]);

        toast.success("Lead created");
        setShowAddModal(false);
      }
    } catch (err) {
      console.error("Error saving lead:", err);
      toast.error("Error saving lead");
    } finally {
      setSaving(false);
    }
  };

  const handleLeadAction = (id: string, action: string) => {
    const lead = safeLeads.find((l) => l.id === id);
    if (!lead) return;

    switch (action) {
      case "view":
        setSelectedLead(lead);
        setShowDetailsModal(true);
        break;
      case "edit":
        openEditLead(lead);
        break;
      case "delete":
        setLeadToDelete(lead);
        setShowDeleteConfirm(true);
        break;
      default:
        break;
    }
  };

  const deleteLead = async () => {
    if (!leadToDelete) return;

    try {
      await supabaseService.deleteLead(leadToDelete.id);
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));

      toast.success("Lead deleted");
    } catch (err) {
      toast.error("Error deleting lead");
    } finally {
      setShowDeleteConfirm(false);
      setLeadToDelete(null);
    }
  };

  const handleBulkAction = async (action: string, data?: any) => {
    // You can flesh this out later (assign/tag/email), but for now it’s safe/no-op.
    console.log("Bulk action triggered:", action, data);
  };

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Lead Management</h1>

        <div className="flex gap-3">
          <button
            className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="w-4 h-4" />
            Import Leads
          </button>

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            onClick={openAddLead}
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
          <div className="mt-2 text-xl font-bold">{leadStats.total}</div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">New</span>
            <Plus className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-blue-700">
            {leadStats.new}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Contacted</span>
            <Phone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-700">
            {leadStats.contacted}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Qualified</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700">
            {leadStats.qualified}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Won</span>
            <Trophy className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-green-700">
            {leadStats.won}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Lost</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-red-700">
            {leadStats.lost}
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-none outline-none text-sm"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as any)
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
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="website">Website</option>
            <option value="facebook">Facebook</option>
            <option value="google_ads">Google Ads</option>
            <option value="referral">Referral</option>
          </select>

          {selectedLeads.length > 0 && (
            <button
              className="border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
              onClick={() => setShowBulkModal(true)}
            >
              <Users className="w-4 h-4" />
              Bulk actions ({selectedLeads.length})
            </button>
          )}
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={
                      selectedLeads.length > 0 &&
                      selectedLeads.length === filteredLeads.length
                    }
                    onChange={(e) =>
                      setSelectedLeads(
                        e.target.checked ? filteredLeads.map((l) => l.id) : []
                      )
                    }
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                  Lead
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                  Contact
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                  Address
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                  Source
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                  Score
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
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
                    No leads found. Try adjusting your filters or import a CSV.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">
                        {lead.name || "Unnamed Lead"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {lead.company || "Residential"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col text-xs gap-1">
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Phone className="w-3 h-3" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Mail className="w-3 h-3" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 text-gray-400" />
                        <span>{lead.address || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full ${
                          lead.status === "new"
                            ? "bg-blue-50 text-blue-700"
                            : lead.status === "contacted"
                            ? "bg-amber-50 text-amber-700"
                            : lead.status === "qualified"
                            ? "bg-emerald-50 text-emerald-700"
                            : lead.status === "won"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {lead.status || "new"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {lead.source || "manual"}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span className="font-semibold">
                          {lead.score ?? 0}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="p-1.5 rounded hover:bg-gray-100"
                          onClick={() => handleLeadAction(lead.id, "view")}
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-gray-100"
                          onClick={() => handleLeadAction(lead.id, "edit")}
                        >
                          <Edit3 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-red-50"
                          onClick={() => handleLeadAction(lead.id, "delete")}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT LEAD MODAL */}
      <BaseModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
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
                value={formData.status || "new"}
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
                value={formData.source || "manual"}
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
                value={formData.score ?? 50}
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
              placeholder="Storm damage details, adjuster notes, etc."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
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

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={deleteLead}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Lead?"
        message="This action cannot be undone."
      />

      {selectedLead && (
        <LeadDetailsModal
          isOpen={showDetailsModal}
          lead={selectedLead}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      <ImportLeadsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={() => {}}
      />

      <BulkActionsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedItems={selectedLeads}
        itemType="leads"
        items={safeLeads}
        onBulkAction={handleBulkAction}
      />
    </div>
  );
};

export default LeadManagement;