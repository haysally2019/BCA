import React from "react";
import { X, Mail, MessageSquare, Calendar, DollarSign, Package, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

type ProposalDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal | null;
};

export function ProposalDetailsModal({
  isOpen,
  onClose,
  proposal,
}: ProposalDetailsModalProps) {
  if (!isOpen || !proposal) return null;

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "sent":
        return "bg-blue-100 text-blue-700";
      case "viewed":
        return "bg-purple-100 text-purple-700";
      case "accepted":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Proposal Details</h2>
              <p className="text-sm text-gray-600 mt-1">
                {proposal.company_name}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                proposal.status
              )}`}
            >
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {proposal.contact_name}
                    </p>
                    <p className="text-xs text-gray-500">Contact Name</p>
                  </div>
                </div>
                {proposal.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {proposal.contact_email}
                      </p>
                      <p className="text-xs text-gray-500">Email</p>
                    </div>
                  </div>
                )}
                {proposal.contact_phone && (
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {proposal.contact_phone}
                      </p>
                      <p className="text-xs text-gray-500">Phone</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Proposal Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {proposal.package_name}
                    </p>
                    <p className="text-xs text-gray-500">Package</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      ${proposal.monthly_investment}/month
                    </p>
                    <p className="text-xs text-gray-500">
                      Annual: ${proposal.annual_value.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDistanceToNow(new Date(proposal.sent_at || proposal.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="text-xs text-gray-500">Sent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Proposal Content
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                {proposal.proposal_content}
              </pre>
            </div>
          </div>

          {proposal.affiliate_link && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Tracking Link
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <a
                  href={proposal.affiliate_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  {proposal.affiliate_link}
                </a>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Timeline
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900 font-medium">
                  {new Date(proposal.created_at).toLocaleDateString()} at{" "}
                  {new Date(proposal.created_at).toLocaleTimeString()}
                </span>
              </div>
              {proposal.sent_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Sent</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(proposal.sent_at).toLocaleDateString()} at{" "}
                    {new Date(proposal.sent_at).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {proposal.viewed_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Viewed</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(proposal.viewed_at).toLocaleDateString()} at{" "}
                    {new Date(proposal.viewed_at).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {proposal.responded_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Responded</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(proposal.responded_at).toLocaleDateString()} at{" "}
                    {new Date(proposal.responded_at).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
