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

import { supabaseService } from "../lib/supabaseService";
import { useAuthStore } from "../store/authStore";

import BaseModal from "./modals/BaseModal";
import ConfirmationModal from "./modals/ConfirmationModal";
import BulkActionsModal from "./modals/BulkActionsModal";
import LeadDetailsModal from "./modals/LeadDetailsModal";
import ImportLeadsModal from "./modals/ImportLeadsModal";

import {
  FormField,
  validateForm,
  leadValidationSchema,
  type ValidationErrors,
} from "./modals/FormValidation";

import toast from "react-hot-toast";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  status: string;
  score: number;
  estimated_value?: number;
  roof_type?: string;
  notes?: string;
  source: string;
  created_at: string;
}

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "new",
    score: 80,
    estimated_value: "",
    roof_type: "",
    notes: "",
    source: "website",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (profile) loadLeads();
  }, [profile]);

  // ------------------------------------------
  // LOAD LEADS (ALWAYS RETURNS SAFE ARRAY)
  // ------------------------------------------
  const loadLeads = async () => {
    try {
      const res = await supabaseService.getLeads(profile?.id);
      const safe = Array.isArray(res) ? res : [];

      setLeads(safe);
    } catch (err) {
      console.error("Lead load error:", err);
      setLeads([]);
    }
  };

  // ------------------------------------------
  // safeLeads placed BEFORE any usage
  // ------------------------------------------
  const safeLeads: Lead[] = Array.isArray(leads) ? leads : [];

  // ------------------------------------------
  // STATS — Fully protected against crashes
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
  // FILTERED LEADS — Zero crash risk
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-red-100 text-red-800 border-red-200",
      contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
      qualified: "bg-green-100 text-green-800 border-green-200",
      won: "bg-emerald-100 text-emerald-800 border-emerald-200",
      lost: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "website":
        return "🌐";
      case "facebook":
        return "📘";
      case "referral":
        return "👥";
      case "cold_call":
        return "📞";
      case "google_ads":
        return "🔍";
      default:
        return "📋";
    }
  };

  const openAddLead = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "new",
      score: 80,
      estimated_value: "",
      roof_type: "",
      notes: "",
      source: "website",
    });
    setIsEditing(false);
    setErrors({});
    setShowAddModal(true);
  };

  const openEditLead = (lead: Lead) => {
    setFormData({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone,
      address: lead.address || "",
      status: lead.status,
      score: lead.score,
      estimated_value: lead.estimated_value || "",
      roof_type: lead.roof_type || "",
      notes: lead.notes || "",
      source: lead.source,
    });

    setSelectedLead(lead);
    setErrors({});
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm(formData, leadValidationSchema);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setFormLoading(true);

      if (isEditing && selectedLead) {
        const updated = await supabaseService.updateLead(selectedLead.id, {
          ...formData,
          estimated_value: formData.estimated_value
            ? Number(formData.estimated_value)
            : null,
        });

        setLeads((prev) =>
          prev.map((l) => (l.id === selectedLead.id ? updated : l))
        );

        toast.success("Lead updated!");
      } else {
        const created = await supabaseService.createLead(profile?.id, {
          ...formData,
          estimated_value: formData.estimated_value
            ? Number(formData.estimated_value)
            : null,
        });

        setLeads((prev) => [created, ...prev]);

        toast.success("Lead added!");
      }

      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Error saving lead");
    } finally {
      setFormLoading(false);
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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Lead Management</h1>

        <div className="flex gap-3">
          <button
            className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="w-4 h-4 inline" /> Import
          </button>

          <button
            className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800"
            onClick={openAddLead}
          >
            <Plus className="w-4 h-4 inline" /> Add Lead
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total", value: leadStats.total, icon: Users },
          { label: "New", value: leadStats.new, icon: AlertCircle },
          { label: "Contacted", value: leadStats.contacted, icon: Phone },
          { label: "Qualified", value: leadStats.qualified, icon: CheckCircle },
          { label: "Won", value: leadStats.won, icon: Trophy },
          { label: "Lost", value: leadStats.lost, icon: X },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white border p-4 rounded-lg shadow-sm flex items-center gap-3"
            >
              <div className="p-2 bg-gray-100 rounded-lg">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SEARCH + FILTERS */}
      <div className="bg-white p-4 border rounded-lg shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="relative min-w-[250px] flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            value={searchTerm}
            placeholder="Search leads..."
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="facebook">Facebook</option>
            <option value="referral">Referral</option>
            <option value="cold_call">Cold Call</option>
            <option value="google_ads">Google Ads</option>
          </select>
        </div>
      </div>

      {/* LEAD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            className="bg-white border p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 flex items-center justify-center rounded-full">
                  <span className="font-bold text-red-700 text-lg">
                    {lead.name?.charAt(0) || "?"}
                  </span>
                </div>

                <div>
                  <h2 className="font-semibold text-lg">{lead.name}</h2>
                  <p className="text-gray-500 text-sm flex items-center gap-2">
                    {getSourceIcon(lead.source)} {lead.source}
                  </p>
                </div>
              </div>

              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => handleLeadAction(lead.id, "view")}
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-700 flex items-center gap-2">
                📞 {lead.phone}
              </p>

              {lead.email && (
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  📧 {lead.email}
                </p>
              )}

              {lead.address && (
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {lead.address}
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span
                className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(
                  lead.status
                )}`}
              >
                {lead.status}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditLead(lead)}
                  className="p-2 bg-blue-50 text-blue-700 rounded-lg"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleLeadAction(lead.id, "delete")}
                  className="p-2 bg-red-50 text-red-700 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredLeads.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-10">
            No leads found.
          </div>
        )}
      </div>

      {/* MODALS */}
      <BaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={isEditing ? "Edit Lead" : "Add Lead"}
      >
        <form onSubmit={handleAddOrEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleFieldChange}
              error={errors.name}
            />
            <FormField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleFieldChange}
              error={errors.email}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleFieldChange}
              error={errors.phone}
            />
            <FormField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleFieldChange}
              error={errors.address}
            />
          </div>

          <FormField
            label="Notes"
            name="notes"
            type="textarea"
            value={formData.notes}
            onChange={handleFieldChange}
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="bg-gray-100 px-4 py-2 rounded-lg"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              {isEditing ? "Update" : "Add Lead"}
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
        selectedCount={selectedLeads.length}
        onClose={() => setShowBulkModal(false)}
        onExecute={() => {}}
      />
    </div>
  );
};

export default LeadManagement;