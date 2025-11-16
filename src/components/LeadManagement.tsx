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
import { useAuthStore } from "../store/authStore";
import { supabaseService } from "../lib/supabaseService";
import LoadingSpinner from "./LoadingSpinner";
import BaseModal from "./modals/BaseModal";
import ConfirmationModal from "./modals/ConfirmationModal";
import LeadDetailsModal from "./modals/LeadDetailsModal";
import ImportLeadsModal from "./modals/ImportLeadsModal";
import toast from "react-hot-toast";

export type SaaSStatus =
  | "new"
  | "contacted"
  | "trial_started"
  | "closed_won"
  | "closed_lost";

export interface SaaSLead {
  id: string;
  user_id?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  service_area?: string | null;
  company_size?: string | null;
  crm_used_now?: string | null;
  status?: SaaSStatus | string | null;
  deal_value?: number | null; // expected monthly or package value
  notes?: string | null;
  created_at?: string | null;
}

type StatusFilter = "all" | SaaSStatus;

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  trialStarted: number;
  closedWon: number;
  closedLost: number;
  totalPipeline: number; // sum of deal_value for non-lost leads
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
  const [editingLead, setEditingLead] = useState<SaaSLead | null>(null);
  const [saving, setSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<SaaSLead | null>(null);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLead, setDetailsLead] = useState<SaaSLead | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);

  const [formData, setFormData] = useState<Partial<SaaSLead>>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    service_area: "",
    company_size: "",
    crm_used_now: "",
    status: "new",
    deal_value: 500,
    notes: "",
  });

  // ------------------------------------------------
  // LOAD LEADS (no hanging, always sets loading=false)
  // ------------------------------------------------
  useEffect(() => {
    const load = async () => {
      if (!profile) {
        console.log("[LeadManagement] No profile present.");
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
        console.log("[LeadManagement] Fetching SaaS leads for owner:", ownerId);
        const result = await supabaseService.getLeads(ownerId as string);
        const safe = Array.isArray(result) ? (result as SaaSLead[]) : [];
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

  // Always treat leads as a safe array
  const safeLeads: SaaSLead[] = useMemo(
    () => (Array.isArray(leads) ? leads : []),
    [leads]
  );

  // ------------------------------------------------
  // STATS (SaaS selling a roofing CRM)
  // ------------------------------------------------
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
      const status = (lead.status || "new").toString() as SaaSStatus;
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

      // Pipeline = active + won (not lost)
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

  // ------------------------------------------------
  // FILTERED LEADS
  // ------------------------------------------------
  const filteredLeads = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return safeLeads.filter((lead) => {
      const company = (lead.company_name || "").toLowerCase();
      const contact = (lead.contact_name || "").toLowerCase();
      const email = (lead.email || "").toLowerCase();
      const phone = lead.phone || "";
      const area = (lead.service_area || "").toLowerCase();
      const crm = (lead.crm_used_now || "").toLowerCase();
      const status = (lead.status || "").toLowerCase() as SaaSStatus;

      const matchesSearch =
        !term ||
        company.includes(term) ||
        contact.includes(term) ||
        email.includes(term) ||
        phone.includes(searchTerm) ||
        area.includes(term) ||
        crm.includes(term);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [safeLeads, searchTerm, statusFilter]);

  // ------------------------------------------------
  // FORM HELPERS
  // ------------------------------------------------
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
      deal_value: 500,
      notes: "",
    });
    setShowFormModal(true);
  };

  const openEditLead = (lead: SaaSLead) => {
    setEditingLead(lead);
    setFormData({
      company_name: lead.company_name || "",
      contact_name: lead.contact_name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      service_area: lead.service_area || "",
      company_size: lead.company_size || "",
      crm_used_now: lead.crm_used_now || "",
      status: (lead.status as SaaSStatus) || "new",
      deal_value: lead.deal_value ?? 500,
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
    setFormData((prev) => {
      if (name === "deal_value") {
        return { ...prev, [name]: Number(value) || 0 };
      }
      return { ...prev, [name]: value };
    });
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
          prev.map((l) => (l.id === editingLead.id ? (updated as SaaSLead) : l))
        );
        toast.success("Lead updated");
      } else {
        const { data, error } = await supabaseService.createLead(payload);

        if (error) throw error;
        const created = Array.isArray(data) ? data[0] : data;

        setLeads((prev) => [(created as SaaSLead), ...prev]);
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

  const confirmDeleteLead = (lead: SaaSLead) => {
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

  const openDetails = (lead: SaaSLead) => {
    setDetailsLead(lead);
    setShowDetailsModal(true);
  };

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------
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
            <Building2 className="w-7 h-7 text-blue-600" />
            Roofing Company Leads
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Track every roofing company owner your reps are targeting for the roofing CRM.
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
            Add Roofing Company
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Total Companies</span>
            <Building2 className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-xl font-bold">{stats.total}</div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">New Leads</span>
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
            <span className="text-xs text-gray-500">Trial Started</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700">
            {stats.trialStarted}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Closed Won</span>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-green-700">
            {stats.closedWon}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Closed Lost</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-red-700">
            {stats.closedLost}
          </div>
        </div>
      </div>

      {/* PIPELINE SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Active Pipeline Value</span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-xl font-bold">
            ${stats.totalPipeline.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Sum of deal value for all non-lost companies (New, Contacted, Trial, Closed Won).
          </p>
        </div>
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Avg Deal Value</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-xl font-bold">
            ${stats.avgDealValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Based on all leads with a non-zero deal value.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by roofing company, owner, email, phone, CRM..."
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
            <option value="new">New Lead</option>
            <option value="contacted">Contacted</option>
            <option value="trial_started">Trial Started</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
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
                  Roofing Company
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Contact
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Service Area
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Current CRM
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Status
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">
                  Deal Value
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
                    No roofing company leads found. Try adjusting filters or importing a CSV.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const company = lead.company_name || "Unnamed Roofing Company";
                  const contact = lead.contact_name || "—";
                  const email = lead.email || "";
                  const phone = lead.phone || "";
                  const area = lead.service_area || "";
                  const crm = lead.crm_used_now || "Unknown / None";
                  const status = (lead.status || "new").toString() as SaaSStatus;
                  const dealValue = lead.deal_value ?? 0;

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
                          {company}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Roofing Company
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-900">{contact}</div>
                        <div className="flex flex-col gap-1 text-[11px] text-gray-700">
                          {phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {phone}
                            </span>
                          )}
                          {email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 text-gray-400" />
                          <span>{area || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {crm}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full ${
                            status === "new"
                              ? "bg-blue-50 text-blue-700"
                              : status === "contacted"
                              ? "bg-amber-50 text-amber-700"
                              : status === "trial_started"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "closed_won"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {status
                            .replace("_", " ")
                            .replace("trial", "Trial")
                            .replace("closed", "Closed")
                            .replace("won", "Won")
                            .replace("lost", "Lost")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-500" />
                          <span className="font-semibold">
                            ${dealValue.toLocaleString()}
                          </span>
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
        title={
          editingLead
            ? "Edit Roofing Company Lead"
            : "Add Roofing Company Lead"
        }
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
                Roofing Company Name
              </label>
              <input
                name="company_name"
                value={formData.company_name || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Example Roofing & Exteriors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Owner / Decision Maker
              </label>
              <input
                name="contact_name"
                value={formData.contact_name || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Owner or GM name"
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
                placeholder="owner@roofingcompany.com"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Service Area
              </label>
              <input
                name="service_area"
                value={formData.service_area || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Columbus, OH / Multi-state, etc."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Company Size
              </label>
              <input
                name="company_size"
                value={formData.company_size || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="# of sales reps / crews"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Current CRM
              </label>
              <input
                name="crm_used_now"
                value={formData.crm_used_now || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="AccuLynx, JobNimbus, none, etc."
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
                value={(formData.status as SaaSStatus) || "new"}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="new">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="trial_started">Trial Started</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Deal Value (Monthly or Package)
              </label>
              <input
                type="number"
                name="deal_value"
                value={formData.deal_value ?? 500}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                min={0}
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
              placeholder="Pain points, objections, how they found you, etc."
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
        title="Delete Roofing Company Lead?"
        message="This action cannot be undone."
      />

      {/* DETAILS MODAL */}
      {detailsLead && (
        <LeadDetailsModal
          isOpen={showDetailsModal}
          lead={detailsLead as any}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      {/* IMPORT MODAL */}
      <ImportLeadsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={() => {
          // Optionally re-fetch leads after import if you wire it up
        }}
      />
    </div>
  );
};

export default LeadManagement;