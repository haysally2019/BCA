// src/components/modals/LeadDetailsModal.tsx
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
} from "lucide-react";
import BaseModal from "./BaseModal";
import { useSupabase } from "../../context/SupabaseProvider";

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
};

const getStatusBadge = (statusRaw: SaaSLead["status"]) => {
  const status = (statusRaw || "new").toString() as SaaSStatus;

  switch (status) {
    case "new":
      return {
        label: "New Lead",
        className: "bg-blue-50 text-blue-700",
      };
    case "contacted":
      return {
        label: "Contacted",
        className: "bg-amber-50 text-amber-700",
      };
    case "qualified":
      return {
        label: "Qualified",
        className: "bg-indigo-50 text-indigo-700",
      };
    case "proposal_sent":
      return {
        label: "Proposal Sent",
        className: "bg-purple-50 text-purple-700",
      };
    case "negotiation":
      return {
        label: "Negotiation",
        className: "bg-orange-50 text-orange-700",
      };
    case "trial_started":
      return {
        label: "Trial Started",
        className: "bg-emerald-50 text-emerald-700",
      };
    case "closed_won":
      return {
        label: "Closed Won",
        className: "bg-green-50 text-green-700",
      };
    case "closed_lost":
      return {
        label: "Closed Lost",
        className: "bg-red-50 text-red-700",
      };
    default:
      return {
        label: statusRaw || "New Lead",
        className: "bg-gray-50 text-gray-700",
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
      title={`Lead Details – ${companyName}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Top: Company + Status */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {companyName}
              </h3>
              <p className="text-xs text-gray-500">
                Roofing company target for Blue Collar Academy CRM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs text-gray-600 hover:bg-gray-50"
            >
              <X className="w-3 h-3" />
              Close
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Contact + company info */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg border p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Decision Maker
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {contactName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Owner / GM / Key Contact
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-700">
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{phone}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2 break-all">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{serviceArea}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg border p-4 space-y-2 text-xs text-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Company Snapshot
              </h4>
              <div className="flex items-center justify-between">
                <span>Company Size</span>
                <span className="font-medium">{companySize}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Current CRM</span>
                <span className="font-medium">{crmNow}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span>{createdAt}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Deal + notes */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Deal Overview
              </h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-600">
                    Expected Value (monthly or package)
                  </span>
                </div>
                <span className="text-base font-semibold text-gray-900">
                  ${dealValue.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                This is the estimated value if this roofing company converts on
                the Blue Collar Academy CRM offer.
              </p>
            </div>

            <div className="bg-white rounded-lg border p-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                Notes & Context
              </h4>
              {notes ? (
                <p className="text-xs text-gray-700 whitespace-pre-line">
                  {notes}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  No notes yet. Use the main Leads screen to edit this lead and
                  capture pain points, objections, and call notes.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Proposals History Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Proposal History
            </h4>
            {proposals.length > 0 && (
              <span className="text-xs text-gray-500">
                {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} sent
              </span>
            )}
          </div>

          {loadingProposals ? (
            <div className="text-center py-8 text-sm text-gray-500">
              Loading proposals...
            </div>
          ) : proposals.length === 0 ? (
            <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No proposals sent yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Use the "Send Proposal" button in the leads view to create and send a proposal
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="text-sm font-semibold text-gray-900">
                            {proposal.package_name}
                          </h5>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            ${proposal.monthly_investment}/mo
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(proposal.sent_at).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            Sent via {proposal.sent_via}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Annual: ${proposal.annual_value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedProposal(
                          expandedProposal === proposal.id ? null : proposal.id
                        )}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {expandedProposal === proposal.id ? 'Hide' : 'View'}
                      </button>
                    </div>

                    {expandedProposal === proposal.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Proposal Content:</p>
                        <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-xs text-gray-700 font-sans">
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