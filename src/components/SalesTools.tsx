import React, { useEffect, useMemo, useState } from "react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAutoRefetchOnFocus } from "../hooks/useAutoRefetchOnFocus";
import { useAuthStore } from "../store/authStore";

type TemplateRow = {
  id?: string;
  user_id?: string;
  title: string;
  kind: "script" | "email" | "sms" | "proposal";
  content: string;
  updated_at?: string;
};

type SalesToolsContent = {
  id: string;
  content_type: 'email_template' | 'call_script' | 'competitor_feature';
  title: string;
  content: string;
  metadata: any;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    </div>
    {children}
  </div>
);

const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
    {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${props.className || ""
      }`}
  />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`w-full min-h-[120px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${props.className || ""
      }`}
  />
);

const Btn = ({
  children,
  tone = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" }) => {
  const base =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition";
  const styles =
    tone === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200";
  return (
    <button {...rest} className={`${base} ${styles} ${rest.className || ""}`}>
      {children}
    </button>
  );
};

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
    {children}
  </span>
);

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function SalesToolsPage() {
  const tabs = ["Scripts", "Email Templates", "Pricing & Commission", "ROI Calculator", "Affiliate Links"] as const;
  const [tab, setTab] = useState<typeof tabs[number]>("Scripts");

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Sales Tools</h1>
        <p className="text-sm md:text-base text-gray-600">Everything your team needs to pitch, price, and close SaaS deals.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs md:text-sm font-semibold whitespace-nowrap ${tab === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Scripts" && <ScriptsLibrary />}
      {tab === "Email Templates" && <EmailTemplatesLibrary />}
      {tab === "Pricing & Commission" && <PricingCommission />}
      {tab === "ROI Calculator" && <RoiCalculator />}
      {tab === "Affiliate Links" && <AffiliateLinksHelper />}
    </div>
  );
}

function ScriptsLibrary() {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
  const [scripts, setScripts] = useState<SalesToolsContent[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingScript, setEditingScript] = useState<SalesToolsContent | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const role = (profile?.user_role || "").toLowerCase();
    setIsAdmin(role === "admin");
  }, [profile]);

  async function loadScripts() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_tools_content")
      .select("*")
      .eq("content_type", "call_script")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setScripts(data as SalesToolsContent[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadScripts();
  }, [supabase]);

  useAutoRefetchOnFocus(loadScripts);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  };

  const saveScript = async () => {
    if (!supabase || !editingScript) return;

    const { error } = await supabase
      .from("sales_tools_content")
      .update({
        title: editingScript.title,
        content: editingScript.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingScript.id);

    if (!error) {
      setEditingScript(null);
      loadScripts();
      alert("Script updated successfully!");
    } else {
      alert("Error saving script");
    }
  };

  const currentScript = scripts[active];

  if (loading) {
    return (
      <Section title="SaaS Sales Script Library">
        <p className="text-gray-500">Loading scripts...</p>
      </Section>
    );
  }

  return (
    <Section title="SaaS Sales Script Library">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs md:text-sm font-semibold text-gray-700">Call Scripts</h3>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {scripts.map((script, i) => (
              <button
                key={script.id}
                onClick={() => setActive(i)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${active === i ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
              >
                {script.title}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {currentScript ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-800">{currentScript.title}</h4>
                <Pill>SaaS CRM</Pill>
              </div>
              <pre className="whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                {currentScript.content}
              </pre>
              <div className="flex gap-2">
                <Btn onClick={() => copy(currentScript.content)}>Copy Script</Btn>
                {isAdmin && (
                  <Btn
                    tone="ghost"
                    onClick={() => setEditingScript(currentScript)}
                  >
                    Edit Script
                  </Btn>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a script to view.</p>
          )}
        </div>
      </div>

      {isAdmin && editingScript && (
        <div className="mt-6 border-t pt-6">
          <h3 className="font-semibold text-gray-800 mb-4">Edit Script (Admin Only)</h3>
          <div className="space-y-4">
            <Field label="Title">
              <Input
                value={editingScript.title}
                onChange={(e) => setEditingScript({ ...editingScript, title: e.target.value })}
              />
            </Field>
            <Field label="Content">
              <TextArea
                value={editingScript.content}
                onChange={(e) => setEditingScript({ ...editingScript, content: e.target.value })}
                className="min-h-[300px]"
              />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn onClick={saveScript}>Save Changes</Btn>
            <Btn tone="ghost" onClick={() => setEditingScript(null)}>Cancel</Btn>
          </div>
        </div>
      )}
    </Section>
  );
}

function EmailTemplatesLibrary() {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
  const [templates, setTemplates] = useState<SalesToolsContent[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<SalesToolsContent | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const role = (profile?.user_role || "").toLowerCase();
    setIsAdmin(role === "admin");
  }, [profile]);

  async function loadTemplates() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_tools_content")
      .select("*")
      .eq("content_type", "email_template")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setTemplates(data as SalesToolsContent[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTemplates();
  }, [supabase]);

  useAutoRefetchOnFocus(loadTemplates);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  };

  const saveTemplate = async () => {
    if (!supabase || !editingTemplate) return;

    const { error } = await supabase
      .from("sales_tools_content")
      .update({
        title: editingTemplate.title,
        content: editingTemplate.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingTemplate.id);

    if (!error) {
      setEditingTemplate(null);
      loadTemplates();
      alert("Template updated successfully!");
    } else {
      alert("Error saving template");
    }
  };

  const currentTemplate = templates[active];

  if (loading) {
    return (
      <Section title="SaaS Email Templates">
        <p className="text-gray-500">Loading templates...</p>
      </Section>
    );
  }

  return (
    <Section title="SaaS Email Templates">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs md:text-sm font-semibold text-gray-700">Templates</h3>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.map((template, i) => (
              <button
                key={template.id}
                onClick={() => setActive(i)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${active === i ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {currentTemplate ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-800">{currentTemplate.title}</h4>
                <Pill>SaaS CRM</Pill>
              </div>
              <pre className="whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                {currentTemplate.content}
              </pre>
              <div className="flex gap-2">
                <Btn onClick={() => copy(currentTemplate.content)}>Copy Template</Btn>
                {isAdmin && (
                  <Btn
                    tone="ghost"
                    onClick={() => setEditingTemplate(currentTemplate)}
                  >
                    Edit Template
                  </Btn>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a template to view.</p>
          )}
        </div>
      </div>

      {isAdmin && editingTemplate && (
        <div className="mt-6 border-t pt-6">
          <h3 className="font-semibold text-gray-800 mb-4">Edit Email Template (Admin Only)</h3>
          <div className="space-y-4">
            <Field label="Title">
              <Input
                value={editingTemplate.title}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
              />
            </Field>
            <Field label="Content">
              <TextArea
                value={editingTemplate.content}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                className="min-h-[300px]"
              />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn onClick={saveTemplate}>Save Changes</Btn>
            <Btn tone="ghost" onClick={() => setEditingTemplate(null)}>Cancel</Btn>
          </div>
        </div>
      )}
    </Section>
  );
}

function PricingCommission() {
  const [base, setBase] = useState(299);
  const [extraPerUser, setExtraPerUser] = useState(49);
  const [users, setUsers] = useState(5);
  const [setupFee, setSetupFee] = useState(0);
  const [repRate, setRepRate] = useState(0.2);
  const [commissionType, setCommissionType] = useState<"one_time" | "monthly">("one_time");

  const mrr = useMemo(() => {
    const extras = Math.max(users - 1, 0) * extraPerUser;
    return base + extras;
  }, [base, extraPerUser, users]);

  const arr = mrr * 12;

  const repCommission = useMemo(() => {
    if (commissionType === "one_time") {
      return (setupFee || arr) * repRate;
    }
    return mrr * repRate;
  }, [commissionType, mrr, arr, repRate, setupFee]);

  return (
    <Section title="SaaS Pricing & Commission Calculator">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Field label="Base Price ($/mo)">
            <Input type="number" value={base} onChange={(e) => setBase(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Per Additional User ($/mo)">
            <Input
              type="number"
              value={extraPerUser}
              onChange={(e) => setExtraPerUser(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Total Users">
            <Input type="number" value={users} onChange={(e) => setUsers(Number(e.target.value) || 1)} />
          </Field>
          <Field label="Setup Fee (optional)">
            <Input type="number" value={setupFee} onChange={(e) => setSetupFee(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Rep Commission Rate">
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={Math.round(repRate * 100)}
                onChange={(e) => setRepRate((Number(e.target.value) || 0) / 100)}
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          </Field>
          <Field label="Commission Type">
            <div className="flex gap-2">
              <Btn
                tone={commissionType === "one_time" ? "primary" : "ghost"}
                onClick={() => setCommissionType("one_time")}
              >
                One-time
              </Btn>
              <Btn
                tone={commissionType === "monthly" ? "primary" : "ghost"}
                onClick={() => setCommissionType("monthly")}
              >
                Monthly
              </Btn>
            </div>
          </Field>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Tile label="Monthly Recurring Revenue" value={money(mrr)} />
            <Tile label="Annual Recurring Revenue" value={money(arr)} />
            <Tile
              label={`Rep Commission (${commissionType === "one_time" ? "one-time" : "monthly"})`}
              value={money(repCommission)}
            />
          </div>
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">Pricing Pitch:</p>
            <p>Your total investment is <b>{money(mrr)}/month</b> for {users} users. That's <b>{money(arr)}</b> in annual value.</p>
            <p className="mt-2">As your team grows, each additional user is only <b>{money(extraPerUser)}/month</b>.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function RoiCalculator() {
  const [leadsPerMonth, setLeadsPerMonth] = useState(100);
  const [closeRate, setCloseRate] = useState(0.15);
  const [avgDealValue, setAvgDealValue] = useState(5000);
  const [uplift, setUplift] = useState(0.25);
  const [mrrCost, setMrrCost] = useState(299);

  const currentRevenue = leadsPerMonth * closeRate * avgDealValue;
  const upliftRevenue = currentRevenue * uplift;
  const netDelta = upliftRevenue - mrrCost;
  const dealsNeeded = Math.ceil(mrrCost / (avgDealValue * closeRate));

  return (
    <Section title="SaaS ROI Calculator">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Field label="Leads / Month">
            <Input type="number" value={leadsPerMonth} onChange={(e) => setLeadsPerMonth(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Close Rate (%)">
            <Input
              type="number"
              value={Math.round(closeRate * 100)}
              onChange={(e) => setCloseRate((Number(e.target.value) || 0) / 100)}
            />
          </Field>
          <Field label="Average Deal Value ($)">
            <Input type="number" value={avgDealValue} onChange={(e) => setAvgDealValue(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Expected Uplift from CRM (%)">
            <Input
              type="number"
              value={Math.round(uplift * 100)}
              onChange={(e) => setUplift((Number(e.target.value) || 0) / 100)}
            />
          </Field>
          <Field label="CRM Cost ($/mo)">
            <Input type="number" value={mrrCost} onChange={(e) => setMrrCost(Number(e.target.value) || 0)} />
          </Field>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Tile label="Current Monthly Revenue" value={money(currentRevenue)} />
            <Tile label="Additional Revenue From CRM" value={money(upliftRevenue)} />
            <Tile label="Net Monthly Gain" value={money(netDelta)} />
            <Tile label="Annual Net Gain" value={money(netDelta * 12)} />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">ROI Pitch Line:</p>
            <p>"Our CRM pays for itself if it helps you close just <b>{dealsNeeded} additional deal{dealsNeeded > 1 ? 's' : ''}</b> per month."</p>
            <p className="mt-2">"That's a potential <b>{money(netDelta * 12)}</b> annual gain in your business."</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function AffiliateLinksHelper() {
  const { profile } = useAuthStore();
  const [siteUrl, setSiteUrl] = useState("https://yourcrm.com");
  const [landingPath, setLandingPath] = useState("/signup");

  const affiliateId = profile?.affiliatewp_id?.toString() || "";

  const link = useMemo(() => {
    const u = new URL(siteUrl.replace(/\/+$/, "") + landingPath);
    if (affiliateId) u.searchParams.set("ref", affiliateId);
    return u.toString();
  }, [siteUrl, landingPath, affiliateId]);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    alert("Link copied");
  };

  return (
    <Section title="Affiliate Link Builder">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Site URL">
          <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://yourcrm.com" />
        </Field>
        <Field label="Landing Path">
          <Input value={landingPath} onChange={(e) => setLandingPath(e.target.value)} placeholder="/signup" />
        </Field>
      </div>

      {affiliateId ? (
        <>
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Your Tracking Link</p>
            <div className="flex items-center gap-2">
              <code className="text-sm text-gray-800 break-all flex-1">{link}</code>
            </div>
            <div className="mt-3">
              <Btn onClick={copy}>Copy Link</Btn>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-1">Your Affiliate ID: {affiliateId}</p>
            <p>Share this link with prospects. All conversions will be credited to your account.</p>
          </div>
        </>
      ) : (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-900">
          Your affiliate account is being set up. Your tracking link will be available once your AffiliateWP account is active.
        </div>
      )}
    </Section>
  );
}
