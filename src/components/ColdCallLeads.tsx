import React, { useState, useEffect } from "react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAuthStore } from "../store/authStore";
import {
  Phone,
  Mail,
  Building2,
  MapPin,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

type Lead = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
};

const ColdCallLeads: React.FC = () => {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    if (!supabase || !profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from("leads")
        .select(
          `
          *,
          profiles:assigned_to (
            full_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted =
        data?.map((lead: any) => ({
          id: lead.id,
          company_name: lead.company_name || "",
          contact_name: lead.contact_name || "",
          email: lead.email || "",
          phone: lead.phone || "",
          address: lead.address || "",
          city: lead.city || "",
          state: lead.state || "",
          zip_code: lead.zip_code || "",
          notes: lead.notes || "",
          status: lead.status || "new",
          created_at: lead.created_at,
          assigned_to: lead.assigned_to,
          assigned_to_name: lead.profiles?.full_name || "Unassigned",
        })) || [];

      setLeads(formatted);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const handleCallClick = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmailClick = (email: string) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2.5 py-1 rounded-full text-xs font-medium";
    switch (status.toLowerCase()) {
      case "new":
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case "contacted":
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      case "qualified":
        return `${baseClasses} bg-green-100 text-green-700`;
      case "proposal":
        return `${baseClasses} bg-purple-100 text-purple-700`;
      case "closed":
        return `${baseClasses} bg-gray-100 text-gray-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "contacted":
        return <Phone className="w-4 h-4 text-yellow-500" />;
      case "qualified":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "closed":
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cold Call Leads</h1>
          <p className="text-sm text-gray-600 mt-1">
            View and contact available leads
          </p>
        </div>
        <button
          onClick={fetchLeads}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.total}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">New</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {stats.new}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contacted</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {stats.contacted}
              </p>
            </div>
            <Phone className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Qualified</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.qualified}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal Sent</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Building2 className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm">
              {searchTerm
                ? "Try adjusting your search"
                : "Leads will appear here once added"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedLead(lead)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {lead.company_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {lead.contact_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(lead.status)}
                        <span className={getStatusBadge(lead.status)}>
                          {lead.status.charAt(0).toUpperCase() +
                            lead.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {(lead.city || lead.state) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {[lead.city, lead.state].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>
                          Added{" "}
                          {formatDistanceToNow(new Date(lead.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    {lead.notes && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {lead.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2 lg:ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCallClick(lead.phone);
                      }}
                      disabled={!lead.phone}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEmailClick(lead.email);
                      }}
                      disabled={!lead.email}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedLead && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedLead.company_name}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {selectedLead.contact_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedLead.status)}
                  <span className={getStatusBadge(selectedLead.status)}>
                    {selectedLead.status.charAt(0).toUpperCase() +
                      selectedLead.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {selectedLead.phone && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">
                          {selectedLead.phone}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCallClick(selectedLead.phone)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Call
                      </button>
                    </div>
                  )}
                  {selectedLead.email && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">
                          {selectedLead.email}
                        </span>
                      </div>
                      <button
                        onClick={() => handleEmailClick(selectedLead.email)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Email
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(selectedLead.address ||
                selectedLead.city ||
                selectedLead.state) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Location
                  </h3>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="text-gray-900">
                      {selectedLead.address && (
                        <p>{selectedLead.address}</p>
                      )}
                      <p>
                        {[
                          selectedLead.city,
                          selectedLead.state,
                          selectedLead.zip_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedLead.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Notes
                  </h3>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedLead.notes}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Lead Details
                </h3>
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedLead.assigned_to_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {formatDistanceToNow(new Date(selectedLead.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColdCallLeads;
