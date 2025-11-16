// src/components/modals/LeadDetailsModal.tsx
import React from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Building2,
  ClipboardList,
  X,
} from "lucide-react";
import BaseModal from "./BaseModal";

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
  deal_value?: number | null;
  notes?: string | null;
  created_at?: string | null;
}

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: SaaSLead | null;
}

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
      </div>
    </BaseModal>
  );
};

export default LeadDetailsModal;