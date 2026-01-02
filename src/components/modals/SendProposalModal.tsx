import React, { useState, useEffect, useMemo } from "react";
import { X, Send, MessageSquare, Mail, Copy } from "lucide-react";
import { useSupabase } from "../../context/SupabaseProvider";
import { useAuthStore } from "../../store/authStore";

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

  useEffect(() => {
    if (isOpen) {
      setCustomTemplate(PROPOSAL_TEMPLATE);
      setPackageName("Standard Plan");
      setMonthlyInvestment(299);

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

      alert(`Proposal sent successfully via ${sendVia}!`);
      onProposalSent();
      onClose();
    } catch (error) {
      console.error("Error sending proposal:", error);
      alert("Failed to send proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(filledProposal);
      alert("Proposal copied to clipboard!");
    } catch (error) {
      alert("Failed to copy proposal");
    }
  };

  if (!isOpen) return null;

  const activeLead = selectedLead || lead;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Send Proposal</h2>
            {activeLead && (
              <p className="text-sm text-gray-600 mt-1">
                {activeLead.company_name} - {activeLead.contact_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!lead && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Lead
              </label>
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2"
              />
              <select
                value={selectedLead?.id || ""}
                onChange={(e) => handleLeadSelect(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Select a lead --</option>
                {filteredLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.company_name} - {l.contact_name} ({l.status})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Name
              </label>
              <select
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option>Standard Plan</option>
                <option>Professional Plan</option>
                <option>Enterprise Plan</option>
                <option>Custom Package</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Investment ($)
              </label>
              <input
                type="number"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Value: ${(monthlyInvestment * 12).toLocaleString()}
            </label>
          </div>

          {activeLead && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Via
              </label>
              <div className="flex gap-3">
                {activeLead.email && (
                  <button
                    onClick={() => setSendVia("email")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                      sendVia === "email"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                )}
                {activeLead.phone && (
                  <button
                    onClick={() => setSendVia("sms")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                      sendVia === "sms"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    SMS
                  </button>
                )}
                {activeLead.email && activeLead.phone && (
                  <button
                    onClick={() => setSendVia("both")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                      sendVia === "both"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <MessageSquare className="w-4 h-4" />
                    Both
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Proposal Template
              </label>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <textarea
              value={customTemplate}
              onChange={(e) => setCustomTemplate(e.target.value)}
              className="w-full h-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              placeholder="Edit your proposal template..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Available variables: {`{{contact_name}}, {{company_name}}, {{package_name}}, {{monthly_investment}}, {{annual_value}}, {{affiliate_link}}, {{rep_name}}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                {filledProposal}
              </pre>
            </div>
          </div>

          {!profile?.affiliatewp_id && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
              Note: Your affiliate tracking link is being set up. The proposal will include a generic signup link until your affiliate account is active.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !activeLead || (!activeLead.email && !activeLead.phone)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {loading ? "Sending..." : "Send Proposal"}
          </button>
        </div>
      </div>
    </div>
  );
}
