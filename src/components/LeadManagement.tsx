import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  MapPin,
  Star,
  Users,
  DollarSign,
  Tag,
  Upload,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  CreditCard as Edit3,
  Trash2,
  Eye,
  Phone,
  Mail,
  ArrowRight,
  ThumbsUp,
  FileText,
  Trophy,
  X,
  RefreshCw,
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
  company_id: string;
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
  updated_at: string;
}

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
  avgScore: number;
  totalValue: number;
}

type ViewMode = "grid" | "list";

const LeadManagement: React.FC = () => {
  const { profile } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(
    null
  );

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
    if (profile) {
      loadLeads();
    }
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".relative")) {
        setStatusDropdownOpen(null);
      }
    };

    if (statusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [statusDropdownOpen]);

  const loadLeads = async () => {
    if (!profile) return;

    try {
      const companyLeads = await supabaseService.getLeads(profile.id);
      setLeads(companyLeads);
    } catch (error) {
      console.error("Error loading leads:", error);
      toast.error("Error loading leads");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-red-100 text-red-800 border-red-200",
      contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
      qualified: "bg-green-100 text-green-800 border-green-200",
      won: "bg-emerald-100 text-emerald-800 border-emerald-200",
      lost: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || colors.new;
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getQuickActions = (status: string) => {
    switch (status) {
      case "new":
        return [
          {
            label: "Mark Contacted",
            status: "contacted",
            icon: Phone,
            color: "bg-blue-600 hover:bg-blue-700",
          },
          {
            label: "Qualify Lead",
            status: "qualified",
            icon: ThumbsUp,
            color: "bg-green-600 hover:bg-green-700",
          },
        ];
      case "contacted":
        return [
          {
            label: "Qualify Lead",
            status: "qualified",
            icon: ThumbsUp,
            color: "bg-green-600 hover:bg-green-700",
          },
          {
            label: "Mark Won",
            status: "won",
            icon: Trophy,
            color: "bg-emerald-600 hover:bg-emerald-700",
          },
        ];
      case "qualified":
        return [
          {
            label: "Mark Won",
            status: "won",
            icon: Trophy,
            color: "bg-emerald-600 hover:bg-emerald-700",
          },
          {
            label: "Mark Lost",
            status: "lost",
            icon: X,
            color: "bg-gray-600 hover:bg-gray-700",
          },
        ];
      case "won":
        return [];
      case "lost":
        return [
          {
            label: "Reopen Lead",
            status: "new",
            icon: ArrowRight,
            color: "bg-blue-600 hover:bg-blue-700",
          },
        ];
      default:
        return [];
    }
  };

  const filteredLeads = leads
    .filter((lead) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        lead.name.toLowerCase().includes(search) ||
        (lead.email && lead.email.toLowerCase().includes(search)) ||
        lead.phone.includes(searchTerm) ||
        (lead.address && lead.address.toLowerCase().includes(search));
      const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
      const matchesSource = filterSource === "all" || lead.source === filterSource;
      return matchesSearch && matchesStatus && matchesSource;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "score":
          return b.score - a.score;
        case "value":
          return (b.estimated_value || 0) - (a.estimated_value || 0);
        case "created_at":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

  const leadStats: LeadStats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    won: leads.filter((l) => l.status === "won").length,
    lost: leads.filter((l) => l.status === "lost").length,
    avgScore:
      leads.length > 0
        ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
        : 0,
    totalValue: leads.reduce(
      (sum, l) => sum + (l.estimated_value || 0),
      0
    ),
  };

  const resetForm = () => {
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
    setErrors({});
    setIsEditing(false);
    setSelectedLead(null);
  };

  const openAddLead = () => {
    resetForm();
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
    setIsEditing(true);
    setSelectedLead(lead);
    setErrors({});
    setShowAddModal(true);
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleAddOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm(
      formData,
      leadValidationSchema
    );
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    if (!profile) {
      toast.error("Profile not loaded. Please refresh and try again.");
      return;
    }

    try {
      setFormLoading(true);

      if (isEditing && selectedLead) {
        const updatedLead = await supabaseService.updateLead(selectedLead.id, {
          ...formData,
          estimated_value: formData.estimated_value
            ? Number(formData.estimated_value)
            : null,
        });
        setLeads((prev) =>
          prev.map((l) => (l.id === selectedLead.id ? updatedLead : l))
        );
        toast.success("Lead updated successfully!");
      } else {
        const newLead = await supabaseService.createLead(profile.id, {
          ...formData,
          estimated_value: formData.estimated_value
            ? Number(formData.estimated_value)
            : null,
        });
        setLeads((prev) => [newLead, ...prev]);
        toast.success("Lead added successfully!");
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast.error("Failed to save lead");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateLeadStatus = async (
    leadId: string,
    updates: Partial<Lead> | string
  ) => {
    if (!profile) {
      toast.error("Please log in to update leads");
      return;
    }

    const updateData =
      typeof updates === "string" ? { status: updates } : updates;

    try {
      const updatedLead = await supabaseService.updateLead(leadId, updateData);
      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? updatedLead : lead))
      );

      const statusText = updateData.status
        ? updateData.status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())
        : "updated";
      toast.success(`Lead status changed to ${statusText}!`);
    } catch (error: any) {
      console.error("Error updating lead:", error);
      if (error.message?.includes("permission") || error.message?.includes("policy")) {
        toast.error("Permission denied. Please contact your administrator.");
      } else {
        toast.error(`Failed to update lead: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedLeads.length === 0) {
      toast.error("No leads selected");
      return;
    }
    setShowBulkModal(true);
  };

  const executeBulkAction = async (action: string, data?: any) => {
    if (selectedLeads.length === 0) {
      toast.error("No leads selected");
      return;
    }

    try {
      switch (action) {
        case "delete": {
          for (const leadId of selectedLeads) {
            await supabaseService.deleteLead(leadId);
          }
          setLeads((prev) =>
            prev.filter((lead) => !selectedLeads.includes(lead.id))
          );
          setSelectedLeads([]);
          toast.success(`${selectedLeads.length} leads deleted`);
          break;
        }
        case "export": {
          handleExportLeads();
          break;
        }
        case "assign": {
          for (const leadId of selectedLeads) {
            await supabaseService.updateLead(leadId, {
              status: data?.status || "contacted",
              assigned_rep_id: data?.rep_id || profile?.user_id,
            });
          }
          setLeads((prev) =>
            prev.map((lead) =>
              selectedLeads.includes(lead.id)
                ? {
                    ...lead,
                    status: data?.status || "contacted",
                  }
                : lead
            )
          );
          setSelectedLeads([]);
          toast.success(`${selectedLeads.length} leads updated`);
          break;
        }
        case "update_status": {
          if (!data?.status) break;
          for (const leadId of selectedLeads) {
            await supabaseService.updateLead(leadId, { status: data.status });
          }
          setLeads((prev) =>
            prev.map((lead) =>
              selectedLeads.includes(lead.id)
                ? { ...lead, status: data.status }
                : lead
            )
          );
          setSelectedLeads([]);
          toast.success(`${selectedLeads.length} leads updated`);
          break;
        }
        case "send_email": {
          toast.success(`Email sent to ${selectedLeads.length} leads`);
          setSelectedLeads([]);
          break;
        }
        case "send_sms": {
          toast.success(`SMS sent to ${selectedLeads.length} leads`);
          setSelectedLeads([]);
          break;
        }
      }
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  const handleExportLeads = () => {
    const exportData =
      selectedLeads.length > 0
        ? leads.filter((lead) => selectedLeads.includes(lead.id))
        : filteredLeads;

    const csv = [
      [
        "Name",
        "Email",
        "Phone",
        "Address",
        "Status",
        "Score",
        "Estimated Value",
        "Source",
        "Created Date",
      ].join(","),
      ...exportData.map((lead) =>
        [
          lead.name,
          lead.email || "",
          lead.phone,
          lead.address || "",
          lead.status,
          lead.score,
          lead.estimated_value || "",
          lead.source,
          new Date(lead.created_at).toLocaleDateString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(`${exportData.length} leads exported`);
    setSelectedLeads([]);
  };

  const handleImportLeads = async (
    leadsData: any[]
  ): Promise<{
    success: number;
    failed: number;
    duplicates: number;
    dbDuplicates: number;
  }> => {
    if (!profile) {
      toast.error("Profile not loaded. Please refresh the page and try again.");
      throw new Error("Profile not loaded");
    }

    if (!leadsData || leadsData.length === 0) {
      toast.error("No leads data provided");
      throw new Error("No leads data provided");
    }

    try {
      const result = await supabaseService.bulkCreateLeads(profile.id, leadsData);

      if (result.success.length > 0) {
        setLeads((prev) => [...result.success, ...prev]);
        toast.success(
          `Successfully imported ${result.success.length} lead${
            result.success.length > 1 ? "s" : ""
          }`
        );
      }

      if (result.duplicates.length > 0) {
        toast.error(
          `${result.duplicates.length} duplicate${
            result.duplicates.length > 1 ? "s" : ""
          } skipped (already exist in database)`,
          { duration: 4000 }
        );
      }

      if (result.failed.length > 0) {
        toast.error(
          `${result.failed.length} lead${
            result.failed.length > 1 ? "s" : ""
          } failed to import`,
          { duration: 4000 }
        );
      }

      await loadLeads();

      return {
        success: result.success.length,
        failed: result.failed.length,
        duplicates: 0,
        dbDuplicates: result.duplicates.length,
      };
    } catch (error: any) {
      console.error("Import error:", error);
      const errorMessage =
        error.message || "Unknown error occurred during import";

      if (
        errorMessage.includes("permission") ||
        errorMessage.includes("policy")
      ) {
        const permError: any = new Error(
          "Permission denied. Please check your account permissions and try again."
        );
        permError.importResults = error.importResults;
        throw permError;
      }

      if (error.importResults) {
        throw error;
      }

      throw new Error(errorMessage);
    }
  };

  const handleLeadAction = async (leadId: string, action: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    try {
      switch (action) {
        case "schedule":
          toast.success(`Appointment scheduled with ${lead.name}`);
          await handleUpdateLeadStatus(leadId, "qualified");
          break;
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
        case "call":
          toast.success(`Calling ${lead.name} at ${lead.phone}`);
          await handleUpdateLeadStatus(leadId, "contacted");
          break;
        case "email":
          if (lead.email) {
            window.location.href = `mailto:${lead.email}?subject=Roofing Services Inquiry&body=Hi ${
              lead.name
            },\n\nThank you for your interest in our roofing services...`;
            await handleUpdateLeadStatus(leadId, "contacted");
          } else {
            toast.error("No email address available");
          }
          break;
        case "won":
          await handleUpdateLeadStatus(leadId, "won");
          toast.success(`${lead.name} marked as WON!`);
          break;
        case "lost":
          await handleUpdateLeadStatus(leadId, "lost");
          toast.info(`${lead.name} marked as lost`);
          break;
      }
    } catch (error) {
      console.error("Error performing lead action:", error);
      toast.error("Failed to perform action");
    }
  };

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;

    try {
      await supabaseService.deleteLead(leadToDelete.id);
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      setLeadToDelete(null);
      setShowDeleteConfirm(false);
      toast.success("Lead deleted successfully");
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  const toggleLeadSelection = (leadId: string, checked: boolean) => {
    setSelectedLeads((prev) =>
      checked ? [...prev, leadId] : prev.filter((id) => id !== leadId)
    );
  };

  const allSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((lead) => selectedLeads.includes(lead.id));

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map((l) => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Lead Management
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-0.5 sm:mt-1">
            Manage and track your roofing leads efficiently.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            type="button"
            className="bg-gray-100 text-gray-700 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg flex items-center space-x-1.5 hover:bg-gray-200 transition-colors text-xs sm:text-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Import Leads</span>
          </button>
          <button
            onClick={openAddLead}
            className="bg-red-700 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg flex items-center space-x-1.5 hover:bg-red-800 transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
        {[
          { title: "Total Leads", value: leadStats.total, icon: Users, color: "bg-blue-500" },
          { title: "New", value: leadStats.new, icon: AlertCircle, color: "bg-red-500" },
          { title: "Contacted", value: leadStats.contacted, icon: CheckCircle, color: "bg-yellow-500" },
          { title: "Qualified", value: leadStats.qualified, icon: CheckCircle, color: "bg-green-500" },
          { title: "Won", value: leadStats.won, icon: Trophy, color: "bg-emerald-500" },
          { title: "Lost", value: leadStats.lost, icon: X, color: "bg-gray-500" },
          { title: "Avg Score", value: leadStats.avgScore, icon: Star, color: "bg-purple-500" },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg p-2 sm:p-3 lg:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-1 sm:mb-0">
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 ${stat.color} rounded-lg flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-white" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600 font-medium leading-tight">
                  {stat.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg p-2.5 sm:p-4 lg:p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="relative flex-1 w-full sm:min-w-64">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700 transition-all duration-200 touch-manipulation"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 hidden sm:block" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-red-700 focus:border-red-700 transition-all duration-200 touch-manipulation"
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
                className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-red-700 focus:border-red-700 transition-all duration-200 touch-manipulation"
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

          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-red-700 focus:border-red-700 transition-all duration-200 touch-manipulation"
            >
              <option value="created_at">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="score">Sort by Score</option>
              <option value="value">Sort by Value</option>
            </select>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 sm:p-2 rounded touch-manipulation ${
                  viewMode === "grid" ? "bg-white shadow-sm" : ""
                }`}
              >
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 grid grid-cols-2 gap-0.5">
                  <div className="bg-gray-400 rounded-sm" />
                  <div className="bg-gray-400 rounded-sm" />
                  <div className="bg-gray-400 rounded-sm" />
                  <div className="bg-gray-400 rounded-sm" />
                </div>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 sm:p-2 rounded touch-manipulation ${
                  viewMode === "list" ? "bg-white shadow-sm" : ""
                }`}
              >
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex flex-col space-y-1">
                  <div className="bg-gray-400 h-0.5 rounded" />
                  <div className="bg-gray-400 h-0.5 rounded" />
                  <div className="bg-gray-400 h-0.5 rounded" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {selectedLeads.length > 0 && (
          <div className="mt-3 p-2.5 sm:p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-xs sm:text-sm text-blue-700">
              {selectedLeads.length} lead
              {selectedLeads.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction("assign")}
                className="text-xs sm:text-sm bg-blue-600 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded hover:bg-blue-700 touch-manipulation"
              >
                Bulk Actions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leads Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={(e) =>
                      toggleLeadSelection(lead.id, e.target.checked)
                    }
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 flex-shrink-0"
                  />
                  <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-semibold text-base sm:text-lg">
                      {lead.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                      {lead.name}
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs sm:text-sm text-gray-500">
                      <span>{getSourceIcon(lead.source)}</span>
                      <span className="capitalize truncate">
                        {lead.source.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <div
                    className={`flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${getScoreColor(
                      lead.score
                    )}`}
                  >
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="text-xs font-medium">{lead.score}</span>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600 touch-manipulation">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-2.5 mb-3 sm:mb-4">
                <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                  <span>📞</span>
                  <span className="truncate">{lead.phone}</span>
                </div>
                {lead.email && (
                  <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                    <span>📧</span>
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{lead.address}</span>
                  </div>
                )}
                {lead.roof_type && (
                  <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                    <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{lead.roof_type}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        lead.status
                      )}`}
                    >
                      {lead.status
                        .replace("_", " ")
                        .replace(/^\w/, (c) => c.toUpperCase())}
                    </span>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setStatusDropdownOpen(
                            statusDropdownOpen === lead.id ? null : lead.id
                          )
                        }
                        className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                        title="Update Stage"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span className="hidden sm:inline">Update</span>
                      </button>
                      {statusDropdownOpen === lead.id && (
                        <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <div className="py-1">
                            {["new", "contacted", "qualified", "won", "lost"].map(
                              (status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    handleUpdateLeadStatus(lead.id, status);
                                    setStatusDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  {status
                                    .replace("_", " ")
                                    .replace(/^\w/, (c) => c.toUpperCase())}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-0.5 sm:space-x-1 text-xs sm:text-sm text-gray-600">
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-medium">
                      ${lead.estimated_value?.toLocaleString() || "0"}
                    </span>
                  </div>
                </div>

                {lead.notes && (
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 bg-gray-50 p-2 rounded leading-relaxed">
                    {lead.notes}
                  </p>
                )}

                {getQuickActions(lead.status).length > 0 && (
                  <div className="mb-3 sm:mb-4">
                    <p className="text-xs text-gray-500 mb-1.5">
                      Quick actions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {getQuickActions(lead.status).map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.label}
                            onClick={() =>
                              handleUpdateLeadStatus(lead.id, action.status)
                            }
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs text-white ${action.color} transition-colors`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{action.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => handleLeadAction(lead.id, "call")}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleLeadAction(lead.id, "email")}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleLeadAction(lead.id, "schedule")}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors text-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => handleLeadAction(lead.id, "view")}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleLeadAction(lead.id, "edit")}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-blue-200 text-xs text-blue-700 hover:bg-blue-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleLeadAction(lead.id, "delete")}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-red-200 text-xs text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="col-span-full text-center text-gray-500 text-sm py-6">
              No leads match your current filters.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-2 sm:p-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </th>
                <th className="p-2 sm:p-3 text-left">Lead</th>
                <th className="p-2 sm:p-3 text-left">Status</th>
                <th className="p-2 sm:p-3 text-left">Source</th>
                <th className="p-2 sm:p-3 text-left hidden md:table-cell">
                  Contact
                </th>
                <th className="p-2 sm:p-3 text-left hidden lg:table-cell">
                  Address
                </th>
                <th className="p-2 sm:p-3 text-right">Value</th>
                <th className="p-2 sm:p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-2 sm:p-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) =>
                        toggleLeadSelection(lead.id, e.target.checked)
                      }
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </td>
                  <td className="p-2 sm:p-3 align-middle">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-600 font-semibold">
                          {lead.name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {lead.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {lead.email || lead.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 align-middle">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        lead.status
                      )}`}
                    >
                      {lead.status
                        .replace("_", " ")
                        .replace(/^\w/, (c) => c.toUpperCase())}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 align-middle">
                    <div className="flex items-center space-x-1 text-xs text-gray-600">
                      <span>{getSourceIcon(lead.source)}</span>
                      <span className="capitalize">
                        {lead.source.replace("_", " ")}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 align-middle hidden md:table-cell">
                    <div className="text-xs text-gray-700">
                      {lead.phone}
                    </div>
                    {lead.email && (
                      <div className="text-xs text-gray-500 truncate">
                        {lead.email}
                      </div>
                    )}
                  </td>
                  <td className="p-2 sm:p-3 align-middle hidden lg:table-cell">
                    <div className="text-xs text-gray-600 truncate max-w-xs">
                      {lead.address || "-"}
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 align-middle text-right">
                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                      ${lead.estimated_value?.toLocaleString() || "0"}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 align-middle text-right">
                    <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                      <button
                        onClick={() => handleLeadAction(lead.id, "view")}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleLeadAction(lead.id, "edit")}
                        className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleLeadAction(lead.id, "delete")}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-4 text-center text-gray-500 text-sm"
                  >
                    No leads match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Lead Modal */}
      <BaseModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title={isEditing ? "Edit Lead" : "Add New Lead"}
      >
        <form onSubmit={handleAddOrEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(name, value) => handleFieldChange(name, value)}
              error={errors.name}
              placeholder="John Doe"
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(name, value) => handleFieldChange(name, value)}
              error={errors.email}
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={(name, value) => handleFieldChange(name, value)}
              error={errors.phone}
              placeholder="(555) 123-4567"
            />
            <FormField
              label="Address"
              name="address"
              type="text"
              value={formData.address}
              onChange={(name, value) => handleFieldChange(name, value)}
              error={errors.address}
              placeholder="123 Main St, City"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={(name, value) => handleFieldChange(name, value)}
              options={[
                { value: "new", label: "New" },
                { value: "contacted", label: "Contacted" },
                { value: "qualified", label: "Qualified" },
                { value: "won", label: "Won" },
                { value: "lost", label: "Lost" },
              ]}
            />
            <FormField
              label="Score"
              name="score"
              type="number"
              value={formData.score}
              onChange={(name, value) => handleFieldChange(name, Number(value))}
              error={errors.score}
              min={0}
              max={100}
            />
            <FormField
              label="Estimated Value"
              name="estimated_value"
              type="number"
              value={formData.estimated_value}
              onChange={(name, value) => handleFieldChange(name, value)}
              error={errors.estimated_value}
              placeholder="15000"
              min={0}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Source"
              name="source"
              type="select"
              value={formData.source}
              onChange={(name, value) => handleFieldChange(name, value)}
              options={[
                { value: "website", label: "Website" },
                { value: "facebook", label: "Facebook" },
                { value: "referral", label: "Referral" },
                { value: "cold_call", label: "Cold Call" },
                { value: "google_ads", label: "Google Ads" },
              ]}
            />
            <FormField
              label="Roof Type"
              name="roof_type"
              type="select"
              value={formData.roof_type}
              onChange={(name, value) => handleFieldChange(name, value)}
              options={[
                { value: "Asphalt Shingles", label: "Asphalt Shingles" },
                { value: "Metal Roofing", label: "Metal Roofing" },
                { value: "Tile", label: "Tile" },
                { value: "Slate", label: "Slate" },
                { value: "Wood Shingles", label: "Wood Shingles" },
                { value: "Flat Roof", label: "Flat Roof" },
              ]}
              placeholder="Select roof type"
            />
          </div>

          <FormField
            label="Notes"
            name="notes"
            type="textarea"
            value={formData.notes}
            onChange={(name, value) => handleFieldChange(name, value)}
            placeholder="Additional notes about the lead..."
            rows={3}
          />

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              disabled={formLoading}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 bg-red-700 text-white py-2 px-4 rounded-lg hover:bg-red-800 transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              {formLoading
                ? "Saving..."
                : isEditing
                ? "Update Lead"
                : "Add Lead"}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Delete Confirm */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Lead"
        message={`Are you sure you want to delete ${
          leadToDelete?.name || "this lead"
        }? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDanger
        onConfirm={handleDeleteLead}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setLeadToDelete(null);
        }}
      />

      {/* Bulk Actions */}
      <BulkActionsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onExecute={executeBulkAction}
        selectedCount={selectedLeads.length}
      />

      {/* Details Modal */}
      {selectedLead && (
        <LeadDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          lead={selectedLead}
          onStatusChange={(status) =>
            handleUpdateLeadStatus(selectedLead.id, status)
          }
        />
      )}

      {/* Import Leads */}
      <ImportLeadsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportLeads}
      />
    </div>
  );
};

export default LeadManagement;