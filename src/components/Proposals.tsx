import React, { useState, useEffect } from "react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAuthStore } from "../store/authStore";
import {
  FileText,
  Send,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { SendProposalModal, ProposalDetailsModal } from "./modals";

type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected";

type Proposal = {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  package_name: string;
  monthly_investment: number;
  annual_value: number;
  amount: number;
  proposal_content: string;
  affiliate_link: string;
  sent_via: string;
  status: ProposalStatus;
  sent_at?: string;
  viewed_at?: string;
  responded_at?: string;
  created_at: string;
  created_by: string;
  rep_name?: string;
};

const Proposals: React.FC = () => {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  const isManager = ["admin", "manager", "owner"].includes(
    profile?.user_role?.toLowerCase() || ""
  );

  useEffect(() => {
    fetchProposals();
  }, [statusFilter]);

  const fetchProposals = async () => {
    if (!supabase || !profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from("proposals")
        .select(
          `
          *,
          leads!proposals_lead_id_fkey (
            contact_name,
            email,
            company_name
          ),
          profiles!proposals_created_by_fkey (
            full_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (!isManager) {
        query = query.eq("created_by", profile.user_id);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted =
        data?.map((p: any) => ({
          id: p.id,
          lead_id: p.lead_id,
          lead_name: p.contact_name || p.leads?.contact_name || "Unknown",
          lead_email: p.contact_email || p.leads?.email || "",
          company_name: p.company_name || p.leads?.company_name || "",
          contact_name: p.contact_name || "",
          contact_email: p.contact_email || "",
          contact_phone: p.contact_phone || "",
          package_name: p.package_name || "",
          monthly_investment: p.monthly_investment || 0,
          annual_value: p.annual_value || 0,
          amount: p.amount || p.annual_value || 0,
          proposal_content: p.proposal_content || "",
          affiliate_link: p.affiliate_link || "",
          sent_via: p.sent_via || "email",
          status: p.status || "sent",
          sent_at: p.sent_at,
          viewed_at: p.viewed_at,
          responded_at: p.responded_at,
          created_at: p.created_at,
          created_by: p.created_by,
          rep_name: p.profiles?.full_name || "Unknown",
        })) || [];

      setProposals(formatted);
    } catch (error: any) {
      console.error("Error fetching proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  const handleViewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowDetailsModal(true);
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case "draft":
        return <Clock className="w-4 h-4 text-gray-500" />;
      case "sent":
        return <Send className="w-4 h-4 text-blue-500" />;
      case "viewed":
        return <Eye className="w-4 h-4 text-purple-500" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ProposalStatus) => {
    const baseClasses = "px-2.5 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "draft":
        return `${baseClasses} bg-gray-100 text-gray-700`;
      case "sent":
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case "viewed":
        return `${baseClasses} bg-purple-100 text-purple-700`;
      case "accepted":
        return `${baseClasses} bg-green-100 text-green-700`;
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-700`;
    }
  };

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch =
      proposal.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.lead_email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const stats = {
    total: proposals.length,
    sent: proposals.filter((p) => p.status === "sent").length,
    viewed: proposals.filter((p) => p.status === "viewed").length,
    accepted: proposals.filter((p) => p.status === "accepted").length,
    totalValue: proposals
      .filter((p) => p.status === "accepted")
      .reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage your sales proposals
          </p>
        </div>
        <button
          onClick={() => {
            setShowSendModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Proposal
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.total}
              </p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {stats.sent}
              </p>
            </div>
            <Send className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Viewed</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {stats.viewed}
              </p>
            </div>
            <Eye className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.accepted}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${stats.totalValue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
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
                placeholder="Search proposals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ProposalStatus | "all")
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No proposals found</p>
            <p className="text-sm">
              {searchTerm
                ? "Try adjusting your search"
                : "Create your first proposal to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead / Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  {isManager && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {proposal.lead_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {proposal.company_name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(proposal.status)}
                        <span className={getStatusBadge(proposal.status)}>
                          {proposal.status.charAt(0).toUpperCase() +
                            proposal.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        ${proposal.amount.toLocaleString()}
                      </p>
                    </td>
                    {isManager && (
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {proposal.rep_name}
                        </p>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(proposal.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewProposal(proposal)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSendModal && (
        <SendProposalModal
          isOpen={showSendModal}
          onClose={() => {
            setShowSendModal(false);
            setSelectedLead(null);
          }}
          lead={selectedLead}
          onProposalSent={() => {
            fetchProposals();
            setShowSendModal(false);
            setSelectedLead(null);
          }}
        />
      )}

      {showDetailsModal && (
        <ProposalDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProposal(null);
          }}
          proposal={selectedProposal}
        />
      )}
    </div>
  );
};

export default Proposals;
