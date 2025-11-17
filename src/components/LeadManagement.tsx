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

      const ownerId = (profile as any).company_id || profile.user_id;

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
      user_id: profile.user_id,
      company_id: profile.company_id || profile.user_id,
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
  <div className="space-y-8">

    {/* HEADER */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-8 h-8 text-blue-600" />
          Roofing Company Leads
        </h1>
        <p className="text-gray-600 text-sm">
          Manage roofing company prospects your team is actively selling to.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium 
          border border-gray-300 rounded-xl bg-white hover:bg-gray-50 shadow-sm transition"
        >
          <Upload className="w-4 h-4" />
          Import CSV
        </button>

        <button
          onClick={openAddLead}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium 
          bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>
    </div>

    {/* STATS */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[
        { label: "Total Leads", value: stats.total, color: "text-gray-800" },
        { label: "New", value: stats.new, color: "text-blue-600" },
        { label: "Contacted", value: stats.contacted, color: "text-amber-600" },
        { label: "Trial Started", value: stats.trialStarted, color: "text-emerald-600" },
        { label: "Closed Won", value: stats.closedWon, color: "text-green-600" },
        { label: "Closed Lost", value: stats.closedLost, color: "text-red-600" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md 
          transition cursor-default"
        >
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
            {stat.label}
          </div>
          <div className={`mt-1 text-2xl font-bold ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>

    {/* FILTER BAR */}
    <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row 
    gap-4 md:items-center md:justify-between">

      {/* SEARCH */}
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 
      bg-gray-50 shadow-inner flex-1">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search: company, owner, email, phone, CRM..."
          className="w-full bg-transparent text-sm outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* STATUS FILTER */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white shadow-sm"
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
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-gray-600 text-xs uppercase tracking-wider">
              <th className="px-4 py-3">
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
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-left font-medium">Contact</th>
              <th className="px-4 py-3 text-left font-medium">Current CRM</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Deal Value</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No leads match your filters.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b last:border-0 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleSelectLead(lead.id)}
                    />
                  </td>

                  {/* COMPANY */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {lead.company_name || "Unnamed Company"}
                    </div>
                    <div className="text-[11px] text-gray-500">Roofing Contractor</div>
                  </td>

                  {/* CONTACT */}
                  <td className="px-4 py-3 space-y-1">
                    <div className="font-medium text-gray-800 text-sm">
                      {lead.contact_name || "—"}
                    </div>
                    <div className="text-[11px] text-gray-600 space-y-0.5">
                      {lead.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* CRM */}
                  <td className="px-4 py-3 text-gray-700">
                    {lead.crm_used_now || "Unknown"}
                  </td>

                  {/* STATUS */}
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm
                      ${
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
                      {lead.status?.replace("_", " ").toUpperCase()}
                    </span>
                  </td>

                  {/* VALUE */}
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ${Number(lead.deal_value ?? 0).toLocaleString()}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openDetails(lead)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                      >
                        <Eye className="w-4 h-4 text-gray-700" />
                      </button>

                      <button
                        onClick={() => openEditLead(lead)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                      >
                        <Edit3 className="w-4 h-4 text-gray-700" />
                      </button>

                      <button
                        onClick={() => confirmDeleteLead(lead)}
                        className="p-2 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
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

    {/* MODALS */}
    <BaseModal
      isOpen={showFormModal}
      onClose={() => setShowFormModal(false)}
      title={editingLead ? "Edit Lead" : "Add Roofing Company Lead"}
      width="max-w-2xl"
    >
      {/* Form Body */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* unchanged — only added rounded-xl, better spacing */}
        {[
          ["Company Name", "company_name"],
          ["Contact Name", "contact_name"],
          ["Email", "email"],
          ["Phone", "phone"],
          ["Service Area", "service_area"],
        ].map(([label, name]) => (
          <div key={name}>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
            <input
              type="text"
              name={name}
              value={(formData as any)[name]}
              onChange={handleFormChange}
              className="border border-gray-300 rounded-xl px-3 py-2 w-full text-sm"
            />
          </div>
        ))}

        {/* COMPANY SIZE */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Company Size</label>
          <select
            name="company_size"
            value={formData.company_size}
            onChange={handleFormChange}
            className="border border-gray-300 rounded-xl px-3 py-2 w-full text-sm"
          >
            <option value="">Select...</option>
            <option value="1-3">1–3 Employees</option>
            <option value="4-10">4–10 Employees</option>
            <option value="11-30">11–30 Employees</option>
            <option value="31-100">31–100 Employees</option>
            <option value="100+">100+ Employees</option>
          </select>
        </div>

        {/* CRM */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">CRM Used Now</label>
          <input
            type="text"
            name="crm_used_now"
            value={formData.crm_used_now}
            onChange={handleFormChange}
            className="border border-gray-300 rounded-xl px-3 py-2 w-full text-sm"
          />
        </div>

        {/* STATUS */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            className="border border-gray-300 rounded-xl px-3 py-2 w-full text-sm"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="trial_started">Trial Started</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
        </div>

        {/* VALUE */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Deal Value</label>
          <input
            type="number"
            name="deal_value"
            value={formData.deal_value}
            min={0}
            onChange={handleFormChange}
            className="border border-gray-300 rounded-xl px-3 py-2 w-full text-sm"
          />
        </div>

        {/* NOTES */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            className="border border-gray-300 rounded-xl px-3 py-2 w-full h-24 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => setShowFormModal(false)}
          className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300 transition"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          onClick={saveLead}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Lead"}
        </button>
      </div>
    </BaseModal>

    {/* DETAILS */}
    <LeadDetailsModal
      isOpen={showDetailsModal}
      onClose={() => setShowDetailsModal(false)}
      lead={detailsLead}
    />

    {/* CONFIRM DELETE */}
    <ConfirmationModal
      isOpen={showDeleteConfirm}
      title="Delete Lead"
      message="Are you sure you want to delete this lead?"
      onConfirm={deleteLead}
      onCancel={() => setShowDeleteConfirm(false)}
    />

    {/* IMPORT */}
    <ImportLeadsModal
      isOpen={showImportModal}
      onClose={() => setShowImportModal(false)}
    />
  </div>