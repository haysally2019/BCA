import React, { useState, useEffect, useMemo } from "react";
import { X, Send, Mail, MessageSquare, Copy, FileText, DollarSign, Package } from "lucide-react";
import { useSupabase } from "../../context/SupabaseProvider";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

type Lead = {
  id: string;
  company_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  status: string;
};

type SendProposalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onProposalSent: () => void;
};

const PROPOSAL_TEMPLATE = `Dear {{contact_name}},

Thank you for taking the time to speak with me about {{company_name}}'s sales process. Based on our conversation, I believe our CRM platform is a perfect fit for your needs.

WHAT YOU GET:
• {{package_name}}
• Complete sales pipeline management
• Lead tracking and automation
• Team collaboration tools
• Advanced reporting and analytics
• Priority customer support

INVESTMENT:
• {{monthly_investment}}/month
• Annual Value: {{annual_value}}
• No setup fees
• Cancel anytime

NEXT STEPS:
1. Review this proposal
2. Schedule a quick call to answer any questions
3. Get started within 24 hours of approval

Ready to transform your sales process? Get started here:
{{affiliate_link}}

Best regards,
{{rep_name}}`;

export function SendProposalModal({ isOpen, onClose, lead, onProposalSent }: SendProposalModalProps) {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();

  const [packageName, setPackageName] = useState("Standard Plan");
  const [monthlyInvestment, setMonthlyInvestment] = useState(299);
  const [sendVia, setSendVia] = useState<"email" | "sms" | "both">("email");
  const [loading, setLoading] = useState(false);
  const [customTemplate, setCustomTemplate] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCustomTemplate(PROPOSAL_TEMPLATE);
      setPackageName("Standard Plan");
      setMonthlyInvestment(299);
      setShowPreview(true);

      if (lead) {
        setSelectedLead(lead);
        setSendVia(lead.email ? "email" : lead.phone ? "sms" : "email");
      } else {
        setSelectedLead(null);
        fetchLeads();
      }
    }
  }, [isOpen, lead]);

  const fetchLeads = async () => {
    if (!supabase || !profile) return;

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, company_name, contact_name, email, phone, status")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  const handleLeadSelect = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      setSendVia(lead.email ? "email" : lead.phone ? "sms" : "email");
    }
  };

  const affiliateLink = useMemo(() => {
    if (!profile?.affiliatewp_id) return "https://yourcrm.com/signup";
    return `https://yourcrm.com/signup?ref=${profile.affiliatewp_id}`;
  }, [profile]);

  const filledProposal = useMemo(() => {
    const activeLead = selectedLead || lead;
    if (!activeLead) return "";

    let result = customTemplate;
    const replacements: Record<string, string> = {
      "{{contact_name}}": activeLead.contact_name || "",
      "{{company_name}}": activeLead.company_name || "",
      "{{package_name}}": packageName,
      "{{monthly_investment}}": `$${monthlyInvestment}`,
      "{{annual_value}}": `$${monthlyInvestment * 12}`,
      "{{affiliate_link}}": affiliateLink,
      "{{rep_name}}": profile?.full_name || profile?.email || "Your Sales Rep",
    };

    for (const [key, value] of Object.entries(replacements)) {
      result = result.replaceAll(key, value);
    }

    return result;
  }, [customTemplate, selectedLead, lead, packageName, monthlyInvestment, affiliateLink, profile]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(
      (l) =>
        l.company_name?.toLowerCase().includes(term) ||
        l.contact_name?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term)
    );
  }, [leads, searchTerm]);

  const handleSend = async () => {
    const activeLead = selectedLead || lead;
    if (!activeLead || !supabase || !profile) return;

    setLoading(true);
    try {
      const annualValue = monthlyInvestment * 12;
      const proposalData = {
        lead_id: activeLead.id,
        created_by: profile.user_id,
        company_name: activeLead.company_name,
        contact_name: activeLead.contact_name,
        contact_email: activeLead.email || null,
        contact_phone: activeLead.phone || null,
        package_name: packageName,
        monthly_investment: monthlyInvestment,
        annual_value: annualValue,
        amount: annualValue,
        proposal_content: filledProposal,
        affiliate_link: affiliateLink,
        sent_via: sendVia,
        sent_at: new Date().toISOString(),
        status: 'sent',
      };

      const { error } = await supabase
        .from("proposals")
        .insert(proposalData);

      if (error) throw error;

      await supabase
        .from("leads")
        .update({ status: "proposal_sent" })
        .eq("id", activeLead.id);

      toast.success(`Proposal sent successfully via ${sendVia}!`);
      onProposalSent();
      onClose();
    } catch (error) {
      console.error("Error sending proposal:", error);
      toast.error("Failed to send proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(filledProposal);
      toast.success("Proposal copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy proposal");
    }
  };

  if (!isOpen) return null;

  const activeLead = selectedLead || lead;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Create Proposal
            </h2>
            {activeLead && (
              <p className="text-sm text-gray-600 mt-1">
                {activeLead.company_name} · {activeLead.contact_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Column - Form */}
          <div className="w-full lg:w-1/2 overflow-y-auto p-6 space-y-6 bg-gray-50">

            {/* Lead Selection */}
            {!lead && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Select Lead
                </label>
                <input
                  type="text"
                  placeholder="Search by company or contact name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3"
                />
                <select
                  value={selectedLead?.id || ""}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">-- Select a lead --</option>
                  {filteredLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} - {l.contact_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Package Details */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Package Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Package Name
                  </label>
                  <select
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option>Standard Plan</option>
                    <option>Professional Plan</option>
                    <option>Enterprise Plan</option>
                    <option>Custom Package</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Monthly Investment ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={monthlyInvestment}
                      onChange={(e) => setMonthlyInvestment(Number(e.target.value) || 0)}
                      className="w-full pl-10 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Annual Value: <span className="font-semibold text-gray-900">${(monthlyInvestment * 12).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Send Via */}
            {activeLead && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Send Via
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {activeLead.email && (
                    <button
                      onClick={() => setSendVia("email")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        sendVia === "email"
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Mail className={`w-5 h-5 ${sendVia === "email" ? "text-blue-600" : "text-gray-400"}`} />
                      <span className={`text-xs font-medium ${sendVia === "email" ? "text-blue-900" : "text-gray-600"}`}>
                        Email
                      </span>
                    </button>
                  )}
                  {activeLead.phone && (
                    <button
                      onClick={() => setSendVia("sms")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        sendVia === "sms"
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <MessageSquare className={`w-5 h-5 ${sendVia === "sms" ? "text-blue-600" : "text-gray-400"}`} />
                      <span className={`text-xs font-medium ${sendVia === "sms" ? "text-blue-900" : "text-gray-600"}`}>
                        SMS
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Template Editor */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Proposal Template
                </label>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
              </div>
              <textarea
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                className="w-full h-48 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono resize-none"
                placeholder="Edit your proposal template..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Available: {`{{contact_name}}, {{company_name}}, {{package_name}}, {{monthly_investment}}, {{annual_value}}, {{affiliate_link}}, {{rep_name}}`}
              </p>
            </div>

            {!profile?.affiliatewp_id && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                <strong>Note:</strong> Your affiliate tracking link is being set up. The proposal will include a generic signup link until your affiliate account is active.
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="hidden lg:block w-1/2 overflow-y-auto p-6 bg-white border-l border-gray-200">
            <div className="sticky top-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 min-h-[400px]">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                  {filledProposal || "Select a lead and fill in the details to see the preview..."}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="lg:hidden flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !activeLead || (!activeLead.email && !activeLead.phone)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Proposal
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
