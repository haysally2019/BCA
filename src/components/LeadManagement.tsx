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
  UserPlus,
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
  assigned_to?: string | null;
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
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [editingLead, setEditingLead] = useState<SaaSLead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<SaaSLead | null>(null);
  const [detailsLead, setDetailsLead] = useState<SaaSLead | null>(null);
  const [leadToAssign, setLeadToAssign] = useState<SaaSLead | null>(null);
  const [saving, setSaving] = useState(false);

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

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

  // Check if user is manager or admin
  const isManagerOrAdmin = profile?.user_role === "manager" || profile?.user_role === "admin";

  // LOAD LEADS
  useEffect(() => {
    const load = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        // RLS policies automatically filter based on role
        // Admins see all, managers see company leads, reps see their own
        const result = await supabaseService.getLeads();
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

  // LOAD TEAM MEMBERS (for assignment dropdown)
  useEffect(() => {
    const loadTeam = async () => {
      if (!profile || !isManagerOrAdmin) return;

      try {
        const companyId = profile.company_id || profile.user_id;
        const members = await supabaseService.getTeamMembers(companyId);
        setTeamMembers(members);
      } catch (err) {
        console.error("Error loading team members:", err);
      }
    };

    loadTeam();
  }, [profile, isManagerOrAdmin]);

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

  // OPEN ASSIGN MODAL
  const openAssignModal = (lead: SaaSLead) => {
    setLeadToAssign(lead);
    setSelectedAssignee(lead.assigned_to || "");
    setShowAssignModal(true);
  };

  // ASSIGN LEAD
  const assignLead = async () => {
    if (!leadToAssign) return;

    setSaving(true);
    try {
      const result = await supabaseService.updateLead(leadToAssign.id, {
        assigned_to: selectedAssignee || null,
      });

      if (result.error) throw result.error;

      // Use the updated data from the server to ensure all fields are preserved
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadToAssign.id ? result.data : l
        )
      );

      toast.success("Lead assigned successfully");
      setShowAssignModal(false);
      setLeadToAssign(null);
      setSelectedAssignee("");
    } catch (err) {
      console.error("Error assigning lead:", err);
      toast.error("Error assigning lead");
    } finally {
      setSaving(false);
    }
  };

  // LOADING STATE
  if (loading) {
    return (
      <LoadingSpinner size="lg" text="Loading leads..." className="h-64" />
    );
  }

  // RENDER UI
  return (
    <div className="space-y-4 md:space-y-8 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            Leads Workspace
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Roofing Company Leads
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor your roofing CRM pipeline and keep every prospect moving forward.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>

          <button
            onClick={openAddLead}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black transition"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>
      </div>

      {/* STATS — side scroll on mobile, grid on desktop */}
      <div className="relative -mx-4 md:mx-0">
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 overflow-x-auto pb-3 px-4 md:px-0 scrollbar-hide snap-x snap-mandatory">
          {[
            { label: "Total Leads", value: stats.total, color: "text-slate-900" },
            { label: "New", value: stats.new, color: "text-blue-600" },
            { label: "Contacted", value: stats.contacted, color: "text-amber-600" },
            { label: "Trial Started", value: stats.trialStarted, color: "text-emerald-600" },
            { label: "Closed Won", value: stats.closedWon, color: "text-green-600" },
            { label: "Closed Lost", value: stats.closedLost, color: "text-rose-600" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="min-w-[140px] md:min-w-0 snap-start bg-gradient-to-b from-white/95 to-slate-50/95 rounded-2xl border border-slate-200/80 px-3 py-2.5 md:px-4 md:py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] flex flex-col justify-between"
            >
              <div className="text-[10px] md:text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">
                {stat.label}
              </div>
              <div className={`mt-0.5 md:mt-1 text-xl md:text-2xl font-semibold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-gradient-to-b from-white/95 to-slate-50/95 border border-slate-200/80 rounded-2xl shadow-[0_12px_40px_rgba(15,23,42,0.04)] px-3 md:px-4 py-2.5 md:py-3 flex flex-col md:flex-row gap-2.5 md:gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 shadow-inner flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, owner, email, phone, CRM..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-[0.16em]">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-slate-200 rounded-full px-3 py-1.5 text-xs bg-white text-slate-800 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          >
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="trial_started">Trial Started</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-gradient-to-b from-white/95 to-slate-50/95 border border-slate-200/80 rounded-2xl shadow-[0_16px_45px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/70 backdrop-blur-sm border-b border-slate-200/70">
              <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
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
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-400 text-sm"
                  >
                    No leads match your filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                      />
                    </td>

                    {/* COMPANY */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-900">
                        {lead.company_name || "Unnamed Company"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Roofing Contractor
                      </div>
                      {lead.service_area && (
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {lead.service_area}
                        </div>
                      )}
                    </td>

                    {/* CONTACT */}
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium text-slate-900">
                        {lead.contact_name || "—"}
                      </div>
                      <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                        {lead.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[180px]">
                              {lead.email}
                            </span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* CRM */}
                    <td className="px-4 py-3 align-top text-slate-800 text-sm">
                      {lead.crm_used_now || (
                        <span className="text-slate-400 text-xs">Unknown</span>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium tracking-wide shadow-sm ${
                          lead.status === "new"
                            ? "bg-blue-50 text-blue-700"
                            : lead.status === "contacted"
                            ? "bg-amber-50 text-amber-700"
                            : lead.status === "trial_started"
                            ? "bg-emerald-50 text-emerald-700"
                            : lead.status === "closed_won"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {lead.status
                          ? lead.status.replace("_", " ").toUpperCase()
                          : "NEW"}
                      </span>
                    </td>

                    {/* DEAL VALUE */}
                    <td className="px-4 py-3 align-top text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        ${Number(lead.deal_value ?? 0).toLocaleString()}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3 align-top text-right">
                      <div className="inline-flex items-center gap-1.5 bg-white/80 border border-slate-200 rounded-full px-1.5 py-0.5 shadow-sm">
                        <button
                          onClick={() => openDetails(lead)}
                          className="p-1.5 rounded-full hover:bg-slate-100 transition"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          onClick={() => openEditLead(lead)}
                          className="p-1.5 rounded-full hover:bg-slate-100 transition"
                          title="Edit lead"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => openAssignModal(lead)}
                            className="p-1.5 rounded-full hover:bg-blue-50 transition"
                            title="Assign lead"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={() => confirmDeleteLead(lead)}
                          className="p-1.5 rounded-full hover:bg-rose-50 transition"
                          title="Delete lead"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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

      {/* ADD / EDIT FORM MODAL */}
      <BaseModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingLead ? "Edit Lead" : "Add Roofing Company Lead"}
        size="lg"
      >
        <div className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {[
              ["Company Name", "company_name"],
              ["Contact Name", "contact_name"],
              ["Email", "email"],
              ["Phone", "phone"],
              ["Service Area", "service_area"],
            ].map(([label, name]) => (
              <div key={name}>
                <label className="text-xs md:text-sm font-medium text-slate-600 mb-1 block">
                  {label}
                </label>
                <input
                  type="text"
                  name={name}
                  value={(formData as any)[name]}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm md:text-base text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>
            ))}

            {/* COMPANY SIZE */}
            <div>
              <label className="text-xs md:text-sm font-medium text-slate-600 mb-1 block">
                Company Size
              </label>
              <select
                name="company_size"
                value={formData.company_size}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm md:text-base text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-900/5"
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
            <div>
              <label className="text-xs md:text-sm font-medium text-slate-600 mb-1 block">
                CRM Used Now
              </label>
              <input
                type="text"
                name="crm_used_now"
                value={formData.crm_used_now}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm md:text-base text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            {/* STATUS */}
            <div>
              <label className="text-xs md:text-sm font-medium text-slate-600 mb-1 block">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm md:text-base text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="trial_started">Trial Started</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </div>

            {/* DEAL VALUE */}
            <div>
              <label className="text-xs md:text-sm font-medium text-slate-600 mb-1 block">
                Deal Value
              </label>
              <input
                type="number"
                name="deal_value"
                value={formData.deal_value}
                onChange={handleFormChange}
                min={0}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm md:text-base text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            {/* NOTES */}
            <div className="sm:col-span-2">
              <label className="text-xs md:text-sm font-medium text-slate-600 mb-1 block">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm md:text-base text-slate-900 shadow-inner h-24 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2.5 md:gap-3 pt-3 md:pt-2 border-t border-slate-100 mt-3 md:mt-2">
            <button
              onClick={() => setShowFormModal(false)}
              className="rounded-full bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition order-2 sm:order-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={saveLead}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black transition order-1 sm:order-2"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Lead"}
            </button>
          </div>
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

      {/* ASSIGN LEAD MODAL */}
      <BaseModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Lead"
        width="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Assign <span className="font-semibold">{leadToAssign?.company_name}</span> to a team member:
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name || member.email || member.company_name || 'Unknown User'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={assignLead}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Assigning..." : "Assign Lead"}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default LeadManagement;