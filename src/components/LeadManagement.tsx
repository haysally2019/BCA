import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Upload,
  Edit3,
  Trash2,
  Eye,
  Phone,
  Mail,
  Building2,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuthStore } from "../store/authStore";
import { supabaseService } from "../lib/supabaseService";
import LoadingSpinner from "./LoadingSpinner";
import BaseModal from "./modals/BaseModal";
import ConfirmationModal from "./modals/ConfirmationModal";
import LeadDetailsModal from "./modals/LeadDetailsModal";
import ImportLeadsModal from "./modals/ImportLeadsModal";

export type SaaSStatus =
  | "new"
  | "contacted"
  | "trial_started"
  | "closed_won"
  | "closed_lost";

export interface SaaSLead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  service_area: string | null;
  company_size: string | null;
  crm_used_now: string | null;
  status: SaaSStatus | null;
  deal_value: number | null;
  notes: string | null;
  created_at?: string | null;
  user_id?: string | null;
  company_id?: string | null;
}

type StatusFilter = "all" | SaaSStatus;

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  trialStarted: number;
  closedWon: number;
  closedLost: number;
  totalPipeline: number;
  avgDealValue: number;
}

const LeadManagement: React.FC = () => {
  const { profile } = useAuthStore();

  const [leads, setLeads] = useState<SaaSLead[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [editingLead, setEditingLead] = useState<SaaSLead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<SaaSLead | null>(null);
  const [detailsLead, setDetailsLead] = useState<SaaSLead | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    service_area: "",
    company_size: "",
    crm_used_now: "",
    status: "new",
    deal_value: 0,
    notes: "",
  });

  // LOAD LEADS
  useEffect(() => {
    const load = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      const ownerId = (profile as any).company_id || profile.id;

      try {
        const result = await supabaseService.getLeads(ownerId as string);
        const safe = Array.isArray(result) ? (result as SaaSLead[]) : [];
        setLeads(safe);
      } catch (err) {
        toast.error("Error loading leads");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile]);

  const safeLeads = Array.isArray(leads) ? leads : [];

  // STATS
  const stats: LeadStats = useMemo(() => {
    if (!safeLeads.length) {
      return {
        total: 0,
        new: 0,
        contacted: 0,
        trialStarted: 0,
        closedWon: 0,
        closedLost: 0,
        totalPipeline: 0,
        avgDealValue: 0,
      };
    }

    let newCount = 0;
    let contacted = 0;
    let trialStarted = 0;
    let closedWon = 0;
    let closedLost = 0;
    let pipelineTotal = 0;

    let dealValueSum = 0;
    let dealCount = 0;

    safeLeads.forEach((lead) => {
      const status = lead.status ?? "new";
      const dealValue = lead.deal_value ?? 0;

      switch (status) {
        case "new":
          newCount++;
          break;
        case "contacted":
          contacted++;
          break;
        case "trial_started":
          trialStarted++;
          break;
        case "closed_won":
          closedWon++;
          break;
        case "closed_lost":
          closedLost++;
          break;
      }

      if (status !== "closed_lost") {
        pipelineTotal += dealValue;
      }

      if (dealValue > 0) {
        dealValueSum += dealValue;
        dealCount++;
      }
    });

    return {
      total: safeLeads.length,
      new: newCount,
      contacted,
      trialStarted,
      closedWon,
      closedLost,
      totalPipeline: pipelineTotal,
      avgDealValue: dealCount ? Math.round(dealValueSum / dealCount) : 0,
    };
  }, [safeLeads]);

  // FILTERED LEADS
  const filteredLeads = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return safeLeads.filter((lead) => {
      const matchesSearch =
        lead.company_name?.toLowerCase().includes(term) ||
        lead.contact_name?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.phone?.includes(searchTerm) ||
        lead.service_area?.toLowerCase().includes(term) ||
        lead.crm_used_now?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [safeLeads, searchTerm, statusFilter]);
  // SELECT HANDLERS
  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // OPEN ADD LEAD
  const openAddLead = () => {
    setEditingLead(null);
    setFormData({
      company_name: "",
      contact_name: "",
      email: "",
      phone: "",
      service_area: "",
      company_size: "",
      crm_used_now: "",
      status: "new",
      deal_value: 0,
      notes: "",
    });
    setShowFormModal(true);
  };

  // OPEN EDIT LEAD
  const openEditLead = (lead: SaaSLead) => {
    setEditingLead(lead);
    setFormData({
      company_name: lead.company_name ?? "",
      contact_name: lead.contact_name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      service_area: lead.service_area ?? "",
      company_size: lead.company_size ?? "",
      crm_used_now: lead.crm_used_now ?? "",
      status: lead.status ?? "new",
      deal_value: lead.deal_value ?? 0,
      notes: lead.notes ?? "",
    });
    setShowFormModal(true);
  };

  // HANDLE FORM CHANGES
  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "deal_value" ? Number(value) : value,
    }));
  };

  // SAVE LEAD
  const saveLead = async () => {
    if (!profile) {
      toast.error("No profile found.");
      return;
    }

    const payload = {
      company_name: formData.company_name,
      contact_name: formData.contact_name,
      email: formData.email,
      phone: formData.phone,
      service_area: formData.service_area,
      company_size: formData.company_size,
      crm_used_now: formData.crm_used_now,
      status: formData.status,
      deal_value: formData.deal_value,
      notes: formData.notes,
      user_id: profile.id,
      company_id: profile.company_id || profile.id,
    };

    setSaving(true);

    try {
      if (editingLead) {
        const result = await supabaseService.updateLead(editingLead.id, payload);
        if (result.error) throw result.error;

        setLeads((prev) =>
          prev.map((l) => (l.id === editingLead.id ? result.data : l))
        );
        toast.success("Lead updated.");
      } else {
        const result = await supabaseService.createLead(payload);
        if (result.error) throw result.error;

        setLeads((prev) => [result.data, ...prev]);
        toast.success("Lead added.");
      }

      setShowFormModal(false);
      setEditingLead(null);
    } catch (err) {
      console.error("[LeadManagement] saveLead error:", err);
      toast.error("Error saving lead.");
    } finally {
      setSaving(false);
    }
  };

  // DELETE
  const confirmDeleteLead = (lead: SaaSLead) => {
    setLeadToDelete(lead);
    setShowDeleteConfirm(true);
  };

  const deleteLead = async () => {
    if (!leadToDelete) return;

    try {
      await supabaseService.deleteLead(leadToDelete.id);
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      toast.success("Lead deleted.");
    } catch (err) {
      toast.error("Error deleting lead.");
    } finally {
      setShowDeleteConfirm(false);
      setLeadToDelete(null);
    }
  };

  // OPEN DETAILS
  const openDetails = (lead: SaaSLead) => {
    setDetailsLead(lead);
    setShowDetailsModal(true);
  };

  // LOADING STATE
  if (loading) {
    return (
      <LoadingSpinner size="lg" text="Loading leads..." className="h-64" />
    );
  }

  // RENDER UI
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Roofing Company Leads
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Track roofing company owners your reps are selling the CRM to.
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <span className="text-xs text-gray-500">Total</span>
          <div className="text-xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <span className="text-xs text-gray-500">New</span>
          <div className="text-xl font-bold text-blue-600">{stats.new}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <span className="text-xs text-gray-500">Contacted</span>
          <div className="text-xl font-bold text-amber-600">
            {stats.contacted}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <span className="text-xs text-gray-500">Trial Started</span>
          <div className="text-xl font-bold text-emerald-600">
            {stats.trialStarted}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <span className="text-xs text-gray-500">Won</span>
          <div className="text-xl font-bold text-green-600">
            {stats.closedWon}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <span className="text-xs text-gray-500">Lost</span>
          <div className="text-xl font-bold text-red-600">
            {stats.closedLost}
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 w-full md:w-1/3">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company, owner, email, phone, CRM..."
            className="w-full border-none bg-transparent text-sm outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="trial_started">Trial Started</option>
          <option value="closed_won">Closed Won</option>
          <option value="closed_lost">Closed Lost</option>
        </select>
      </div>

      {/* TABLE */}
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
                        e.target.checked
                          ? filteredLeads.map((l) => l.id)
                          : []
                      )
                    }
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">
                  Roofing Company
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">
                  Contact
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">
                  CRM Used
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Deal Value
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No leads found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  return (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => toggleSelectLead(lead.id)}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <div className="font-semibold text-gray-900">
                          {lead.company_name || "No company name"}
                        </div>
                        <div className="text-[11px] text-gray-500">Roofing Company</div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-900">
                          {lead.contact_name || "—"}
                        </div>
                        <div className="flex flex-col text-[11px] text-gray-600">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-xs text-gray-700">
                        {lead.crm_used_now || "Unknown"}
                      </td>

                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full ${
                            lead.status === "new"
                              ? "bg-blue-50 text-blue-700"
                              : lead.status === "contacted"
                              ? "bg-amber-50 text-amber-700"
                              : lead.status === "trial_started"
                              ? "bg-emerald-50 text-emerald-700"
                              : lead.status === "closed_won"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {String(lead.status)
                            .replace("_", " ")
                            .replace("trial", "Trial")
                            .replace("closed", "Closed")
                            .replace("won", "Won")
                            .replace("lost", "Lost")}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right text-xs">
                        <span className="font-semibold">
                          ${Number(lead.deal_value ?? 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openDetails(lead)}
                            className="p-1.5 hover:bg-gray-100 rounded"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => openEditLead(lead)}
                            className="p-1.5 hover:bg-gray-100 rounded"
                          >
                            <Edit3 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => confirmDeleteLead(lead)}
                            className="p-1.5 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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
      {/* ADD / EDIT FORM MODAL */}
      <BaseModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingLead ? "Edit Lead" : "Add Roofing Company Lead"}
        width="max-w-2xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* COMPANY NAME */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Company Name</label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {/* CONTACT NAME */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Contact Name</label>
            <input
              type="text"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {/* EMAIL */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {/* PHONE */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {/* SERVICE AREA */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Service Area</label>
            <input
              type="text"
              name="service_area"
              value={formData.service_area}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {/* COMPANY SIZE */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Company Size</label>
            <select
              name="company_size"
              value={formData.company_size}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">Select...</option>
              <option value="1-3">1–3 Employees</option>
              <option value="4-10">4–10 Employees</option>
              <option value="11-30">11–30 Employees</option>
              <option value="31-100">31–100 Employees</option>
              <option value="100+">100+ Employees</option>
            </select>
          </div>

          {/* CURRENT CRM */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">CRM Used Now</label>
            <input
              type="text"
              name="crm_used_now"
              value={formData.crm_used_now}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {/* STATUS */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="trial_started">Trial Started</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </div>

          {/* DEAL VALUE */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Deal Value</label>
            <input
              type="number"
              name="deal_value"
              value={formData.deal_value}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2"
              min={0}
            />
          </div>

          {/* NOTES */}
          <div className="col-span-1 sm:col-span-2 flex flex-col">
            <label className="text-xs font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              className="border rounded-lg px-3 py-2 h-24"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setShowFormModal(false)}
            className="px-3 py-2 bg-gray-200 text-sm rounded-lg"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            onClick={saveLead}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Lead"}
          </button>
        </div>
      </BaseModal>

      {/* DETAILS MODAL */}
      <LeadDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        lead={detailsLead}
      />

      {/* DELETE CONFIRM MODAL */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Lead"
        message="Are you sure you want to delete this lead?"
        onConfirm={deleteLead}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* IMPORT LEADS */}
      <ImportLeadsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
};

export default LeadManagement;
