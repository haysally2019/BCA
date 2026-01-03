import React, { useEffect, useState } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Building2,
  ClipboardList,
  X,
  FileText,
  Calendar,
  Send,
  Package,
  TrendingUp,
} from "lucide-react";
import BaseModal from "./BaseModal";
import { useSupabase } from "../../context/SupabaseProvider";
import { formatDistanceToNow } from "date-fns";

export type SaaSStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
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
  deal_value?: number | null;
  notes?: string | null;
  created_at?: string | null;
}

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: SaaSLead | null;
}

type Proposal = {
  id: string;
  package_name: string;
  monthly_investment: number;
  annual_value: number;
  sent_via: string;
  sent_at: string;
  proposal_content: string;
  status: string;
};

const getStatusBadge = (statusRaw: SaaSLead["status"]) => {
  const status = (statusRaw || "new").toString() as SaaSStatus;

  switch (status) {
    case "new":
      return {
        label: "New Lead",
        className: "bg-blue-100 text-blue-800 border-blue-200",
      };
    case "contacted":
      return {
        label: "Contacted",
        className: "bg-amber-100 text-amber-800 border-amber-200",
      };
    case "qualified":
      return {
        label: "Qualified",
        className: "bg-teal-100 text-teal-800 border-teal-200",
      };
    case "proposal_sent":
      return {
        label: "Proposal Sent",
        className: "bg-purple-100 text-purple-800 border-purple-200",
      };
    case "negotiation":
      return {
        label: "Negotiation",
        className: "bg-orange-100 text-orange-800 border-orange-200",
      };
    case "trial_started":
      return {
        label: "Trial Started",
        className: "bg-emerald-100 text-emerald-800 border-emerald-200",
      };
    case "closed_won":
      return {
        label: "Closed Won",
        className: "bg-green-100 text-green-800 border-green-200",
      };
    case "closed_lost":
      return {
        label: "Closed Lost",
        className: "bg-red-100 text-red-800 border-red-200",
      };
    default:
      return {
        label: statusRaw || "New Lead",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      };
  }
};

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const { supabase } = useSupabase();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lead?.id && supabase) {
      loadProposals();
    }
  }, [isOpen, lead?.id, supabase]);

  const loadProposals = async () => {
    if (!lead?.id || !supabase) return;

    setLoadingProposals(true);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("lead_id", lead.id)
        .order("sent_at", { ascending: false });

      if (!error && data) {
        setProposals(data as Proposal[]);
      }
    } catch (error) {
      console.error("Error loading proposals:", error);
    } finally {
      setLoadingProposals(false);
    }
  };

  if (!lead) return null;

  const companyName = lead.company_name || "Unnamed Roofing Company";
  const contactName = lead.contact_name || "—";
  const email = lead.email || "";
  const phone = lead.phone || "";
  const serviceArea = lead.service_area || "N/A";
  const companySize = lead.company_size || "N/A";
  const crmNow = lead.crm_used_now || "Unknown / None";
  const dealValue = lead.deal_value ?? 0;
  const notes = lead.notes || "";
  const createdAt = lead.created_at
    ? new Date(lead.created_at).toLocaleString()
    : "N/A";

  const statusMeta = getStatusBadge(lead.status);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="2xl"
    >
      <div className="space-y-6">
        {/* Header Section with gradient */}
        <div className="relative -mt-6 -mx-6 px-6 py-6 bg-gradient-to-br from-blue-50 via-slate-50 to-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {companyName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Roofing Contractor Target
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/80 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Contact Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Decision Maker
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {contactName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Owner / General Manager
                  </p>
                </div>

                <div className="space-y-3">
                  {phone && (
                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-200">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{phone}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-200">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 break-all">{email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-200">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{serviceArea}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Info Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Company Info
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Company Size</span>
                  <span className="text-sm font-semibold text-gray-900">{companySize}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Current CRM</span>
                  <span className="text-sm font-semibold text-gray-900">{crmNow}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-gray-600">Added</span>
                  <span className="text-xs text-gray-700">{createdAt}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Deal & Notes */}
          <div className="lg:col-span-2 space-y-4">
            {/* Deal Value Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shadow-md">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Expected Deal Value
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      ${dealValue.toLocaleString()}
                    </p>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-green-600/30" />
              </div>
              <p className="text-xs text-gray-600 mt-4">
                Estimated monthly or annual value if this roofing company converts to Blue Collar Academy CRM.
              </p>
            </div>

            {/* Notes Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Notes & Context
                </h3>
              </div>
              {notes ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {notes}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 border border-dashed border-gray-300 text-center">
                  <ClipboardList className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No notes yet. Edit this lead to add pain points, objections, and call notes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Proposals Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Proposal History
              </h3>
            </div>
            {proposals.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {proposals.length} {proposals.length === 1 ? 'Proposal' : 'Proposals'}
              </span>
            )}
          </div>

          {loadingProposals ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-700">No proposals sent yet</p>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                Click the "Send Proposal" button in the leads table to create and send your first proposal to this company.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal, index) => (
                <div
                  key={proposal.id}
                  className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-900">
                              {proposal.package_name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Proposal #{proposals.length - index}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Monthly</p>
                            <p className="text-sm font-bold text-gray-900">
                              ${proposal.monthly_investment}/mo
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Annual</p>
                            <p className="text-sm font-bold text-gray-900">
                              ${proposal.annual_value.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Sent Via</p>
                            <p className="text-sm font-semibold text-gray-900 capitalize">
                              {proposal.sent_via}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Sent</p>
                            <p className="text-xs font-medium text-gray-900">
                              {formatDistanceToNow(new Date(proposal.sent_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(proposal.sent_at).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          setExpandedProposal(
                            expandedProposal === proposal.id ? null : proposal.id
                          )
                        }
                        className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {expandedProposal === proposal.id ? "Hide" : "View"}
                      </button>
                    </div>

                    {expandedProposal === proposal.id && (
                      <div className="mt-5 pt-5 border-t border-gray-200">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                          Full Proposal Content:
                        </p>
                        <div className="bg-white rounded-xl p-5 border border-gray-200 max-h-80 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                            {proposal.proposal_content}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default LeadDetailsModal;
