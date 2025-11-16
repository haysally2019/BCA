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
import { supabaseService, type Lead } from "../lib/supabaseService";
import LoadingSpinner from "./LoadingSpinner";
import BaseModal from "./modals/BaseModal";
import ConfirmationModal from "./modals/ConfirmationModal";
import LeadDetailsModal from "./modals/LeadDetailsModal";
import ImportLeadsModal from "./modals/ImportLeadsModal";
import toast from "react-hot-toast";

type StatusFilter =
  | "all"
  | "new"
  | "contacted"
  | "qualified"
  | "trial_started"
  | "won"
  | "lost";

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  trials: number;
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

  const [formData, setFormData] = useState<Partial<Lead & { company?: string }>>({
    // Company you’re selling to
    company: "",
    // Main decision maker / owner
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "new",
    source: "outbound",
    score: 70,
    notes: "",
  });

  // ---------------------------------------------------
  // LOAD LEADS SAFELY (no infinite spinner)
  // ---------------------------------------------------
  useEffect(() => {
    const load = async () => {
      if (!profile) {
        console.log("[LeadManagement] No profile loaded, skipping lead fetch.");
        setLoading(false);
        return;
      }

      // We’ll accept either company_id or just profile.id as the owner key
      const ownerId = (profile as any).company_id || profile.id;

      if (!ownerId) {
        console.log("[LeadManagement] Missing owner id (company_id / id).");
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

  // Always work on a safe array
  const safeLeads: Lead[] = useMemo(
    () => (Array.isArray(leads) ? leads : []),
    [leads]
  );

  // ---------------------------------------------------
  // STATS: SaaS pipeline for roofing companies
  // ---------------------------------------------------
  const stats: LeadStats = useMemo(() => {
    if (!safeLeads.length) {
      return {
        total: 0,
        new: 0,
        contacted: 0,
        qualified: 0,
        trials: 0,
        won: 0,
        lost: 0,
        avgScore: 0,
      };
    }

    let newCount = 0;
    let contacted = 0;
    let qualified = 0;
    let trials = 0;
    let won = 0;
    let lost = 0;
    let scoreSum = 0;

    safeLeads.forEach((lead) => {
      const status = (lead.status || "new").toString().toLowerCase();

      if (status === "new") newCount++;
      else if (status === "contacted") contacted++;
      else if (status === "qualified") qualified++;
      else if (status === "trial_started") trials++;
      else if (status === "won") won++;
      else if (status === "lost") lost++;

      scoreSum += (lead as any).score ?? 0;
    });

    const total = safeLeads.length;
    return {
      total,
      new: newCount,
      contacted,
      qualified,
      trials,
      won,
      lost,
      avgScore: total ? Math.round(scoreSum / total) : 0,
    };
  }, [safeLeads]);

  // ---------------------------------------------------
  // FILTERED LEADS (roofing companies)
  // ---------------------------------------------------
  const filteredLeads = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return safeLeads.filter((lead) => {
      const company =
        ((lead as any).company ||
          (lead as any).company_name ||
          "") as string;
      const contact = (lead.name || "") as string;
      const phone = (lead.phone || "") as string;
      const email = (lead.email || "") as string;
      const address = (lead.address || "") as string;
      const status = (lead.status || "").toString().toLowerCase();
      const source = (lead.source || "").toString().toLowerCase();

      const matchesSearch =
        !term ||
        company.toLowerCase().includes(term) ||
        contact.toLowerCase().includes(term) ||
        phone.includes(searchTerm) ||
        email.toLowerCase().includes(term) ||
        address.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();

      const matchesSource =
        sourceFilter === "all" || source === sourceFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [safeLeads, searchTerm, statusFilter, sourceFilter]);

  // ---------------------------------------------------
  // FORM HELPERS
  // ---------------------------------------------------
  const openAddLead = () => {
    setEditingLead(null);
    setFormData({
      company: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "new",
      source: "outbound",
      score: 70,
      notes: "",
    });
    setShowFormModal(true);
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      company: ((lead as any).company || (lead as any).company_name || "") as
        | string
        | undefined,
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      address: lead.address || "",
      status: (lead.status as any) || "new",
      source: lead.source || "outbound",
      score: (lead as any).score ?? 70,
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

    // Only send fields we know exist / are safe on your leads table
    const payload: any = {
      company: formData.company ?? "",
      name: formData.name ?? "",
      email: formData.email ?? "",
      phone: formData.phone ?? "",
      address: formData.address ?? "",
      status: formData.status ?? "new",
      source: formData.source ?? "outbound",
      score: formData.score ?? 70,
      notes: formData.notes ?? "",
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
        toast.success("Prospect updated");
      } else {
        const { data, error } = await supabaseService.createLead(payload);
        if (error) throw error;

        const created = Array.isArray(data) ? data[0] : data;
        setLeads((prev) => [(created as Lead), ...prev]);
        toast.success("New roofing company added to pipeline");
      }

      setShowFormModal(false);
      setEditingLead(null);
    } catch (err) {
      console.error("[LeadManagement] saveLead error:", err);
      toast.error("Error saving prospect");
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
      toast.success("Prospect deleted");
    } catch (err) {
      console.error("[LeadManagement] deleteLead error:", err);
      toast.error("Error deleting prospect");
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

  const handleLeadUpdateFromDetails = (
    leadId: string,
    updates: Partial<Lead>
  ) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, ...updates } : l
      )
    );
  };

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------
  if (loading) {
    return (
      <LoadingSpinner
        size="lg"
        text="Loading prospects..."
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
            Roofing CRM Sales Pipeline
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Track roofing company owners from first contact to free trial and closed deal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            Import Roofing Companies
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
            <span className="text-xs text-gray-500">Trials Started</span>
            <Trophy className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-indigo-700">
            {stats.trials}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Closed Won / Lost</span>
            <AlertCircle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-xs">
            <span className="font-bold text-green-700 mr-2">
              {stats.won} Won
            </span>
            <span className="font-bold text-red-700">
              {stats.lost} Lost
            </span>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search roofing companies or contacts..."
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
            <option value="all">All Stages</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="trial_started">Trial Started</option>
            <option value="won">Closed Won</option>
            <option value="lost">Closed Lost</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Sources</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
            <option value="referral">Referral</option>
            <option value="facebook">Facebook</option>
            <option value="google_ads">Google Ads</option>
            <option value="event">Event / Conference</option>
          </select>
        </div>
      </div>

      {/* LEADS TABLE (Roofing companies) */}
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
                          ? filteredLeads.map((l) => l.id as string)
                          : []
                      )
                    }
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Roofing Company
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Owner / Contact
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Location
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Stage
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">
                  Source
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">
                  Fit Score
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
                    No roofing companies found. Add one or import from CSV.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const company =
                    ((lead as any).company ||
                      (lead as any).company_name ||
                      "Roofing Company") as string;
                  const contact = (lead.name || "Contact Person") as string;
                  const phone = (lead.phone || "") as string;
                  const email = (lead.email || "") as string;
                  const address = (lead.address || "") as string;
                  const rawStatus = (lead.status || "new")
                    .toString()
                    .toLowerCase();
                  const source = (lead.source || "outbound")
                    .toString()
                    .toLowerCase();
                  const score = (lead as any).score ?? 0;

                  const stageLabel =
                    rawStatus === "trial_started"
                      ? "Trial Started"
                      : rawStatus === "won"
                      ? "Closed Won"
                      : rawStatus === "lost"
                      ? "Closed Lost"
                      : rawStatus === "qualified"
                      ? "Qualified"
                      : rawStatus === "contacted"
                      ? "Contacted"
                      : "New";

                  return (
                    <tr
                      key={lead.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id as string)}
                          onChange={() =>
                            toggleSelectLead(lead.id as string)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">
                          {company}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">
                          {contact}
                        </div>
                        <div className="flex flex-col gap-1 text-[11px] text-gray-600">
                          {phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{phone}</span>
                            </div>
                          )}
                          {email && (
                            <div className="flex items-center gap-1">
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
                            rawStatus === "trial_started"
                              ? "bg-indigo-50 text-indigo-700"
                              : rawStatus === "won"
                              ? "bg-green-50 text-green-700"
                              : rawStatus === "lost"
                              ? "bg-red-50 text-red-700"
                              : rawStatus === "qualified"
                              ? "bg-emerald-50 text-emerald-700"
                              : rawStatus === "contacted"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {stageLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {source.charAt(0).toUpperCase() + source.slice(1)}
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
        title={editingLead ? "Edit Roofing Company" : "Add Roofing Company"}
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
                name="company"
                value={formData.company || ""}
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
                name="name"
                value={formData.name || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Contact person"
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
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Service Area / Address
              </label>
              <input
                name="address"
                value={formData.address || ""}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="City, state, or HQ address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Stage
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
                <option value="trial_started">Trial Started</option>
                <option value="won">Closed Won</option>
                <option value="lost">Closed Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                name="source"
                value={(formData.source as string) || "outbound"}
                onChange={handleFormChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
                <option value="referral">Referral</option>
                <option value="facebook">Facebook</option>
                <option value="google_ads">Google Ads</option>
                <option value="event">Event / Conference</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fit Score
              </label>
              <input
                type="number"
                name="score"
                value={formData.score ?? 70}
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
              placeholder="Current CRM, # of reps, pricing convo, objections, etc."
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
              {saving ? "Saving..." : "Save Company"}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* DELETE CONFIRM */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={deleteLead}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Company?"
        message="This will remove this roofing company from your pipeline."
      />

      {/* DETAILS MODAL */}
      {detailsLead && (
        <LeadDetailsModal
          isOpen={showDetailsModal}
          lead={detailsLead}
          onClose={() => setShowDetailsModal(false)}
          onUpdate={handleLeadUpdateFromDetails}
        />
      )}

      {/* IMPORT MODAL – stubbed safely */}
      <ImportLeadsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (imported) => {
          // You can later wire this into a real bulk import.
          toast.success(`Imported ${imported.length} roofing companies (placeholder).`);
          return {
            success: imported.length,
            failed: 0,
            duplicates: 0,
            dbDuplicates: 0,
          };
        }}
      />
    </div>
  );
};

export default LeadManagement;