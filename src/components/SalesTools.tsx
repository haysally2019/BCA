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

const defaultScripts: { title: string; content: string }[] = [
  {
    title: "Cold Call – Roofing CRM Pitch",
    content: `Hey {{first_name}}, this is {{rep_name}} with {{company}}. Quick 30 seconds —
we help roofing teams close more jobs with a CRM built specifically for storm and retail roofing.
It auto-logs calls/texts, tracks adjusters, and keeps commissions clean.
If I could show you a live demo where claims and retail pipelines are pre-built for roofing, would you give me 15 minutes this week?`,
  },
  {
    title: "Discovery – Pain Points",
    content: `Walk me through your current process:
1) Leads come from where? (door-knock, referrals, Facebook, HomeAdvisor)
2) How do you track inspections, adjuster meetings, supplements?
3) How do you pay commissions and reconcile when insurance totals change?
4) What's breaking down most often and costing you jobs/time?`,
  },
  {
    title: "Demo – Value Hooks",
    content: `- Prebuilt roofing pipelines (storm + retail)
- AI receptionist & auto-SMS follow-up
- Assign adjusters, log photos, store scopes
- Real commission tracking (per rep, per job)
- Affiliate-ready links for your canvassers & partners`,
  },
  {
    title: "Close – Two Options",
    content: `We have two ways to start:
• Starter: $200/mo + $30 per additional user
• Pro: includes automation + AI receptionist
Which plan fits you best if we can get your team live this week?`,
  },
  {
    title: "Objections – 'We already use XYZ'",
    content: `Totally fair — lots of roofers start on generic CRMs. The reason they switch is roofing is workflow-heavy:
inspections → adjuster → build → supplement → final.
We turn that into out-of-the-box stages, with commission math and AffiliateWP for partner tracking.`,
  },
];

export default function SalesToolsPage() {
  const tabs = ["Scripts", "Pricing & Commission", "ROI Calculator", "BCA Proposals", "Affiliate Links"] as const;
  const [tab, setTab] = useState<typeof tabs[number]>("Scripts");

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Sales Tools</h1>
        <p className="text-sm md:text-base text-gray-600">Everything your team needs to pitch, price, and close.</p>
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
      {tab === "Pricing & Commission" && <PricingCommission />}
      {tab === "ROI Calculator" && <RoiCalculator />}
      {tab === "BCA Proposals" && <BCAProposalGenerator />}
      {tab === "Affiliate Links" && <AffiliateLinksHelper />}
    </div>
  );
}

function ScriptsLibrary() {
  const { supabase } = useSupabase() || {};
  const { user } = useAuthStore();
  const [custom, setCustom] = useState<TemplateRow[]>([]);
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState<{ title: string; content: string } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function loadCustom() {
    if (!supabase || !user?.id) return;
    const { data, error } = await supabase
      .from("sales_templates")
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", "script")
      .order("updated_at", { ascending: false });
    if (!error) setCustom((data as TemplateRow[]) || []);
  }

  useEffect(() => {
    loadCustom();
  }, [user?.id]);

  useAutoRefetchOnFocus(loadCustom);

  const scripts = useMemo(() => {
    const base = defaultScripts;
    const extra = custom.map((c) => ({ title: c.title, content: c.content }));
    return [...base, ...extra];
  }, [custom]);

  const s = scripts[active];

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  };

  const saveNew = async () => {
    if (!supabase || !user?.id || !editing) return;
    const row: TemplateRow = {
      user_id: user.id,
      title: editing.title.trim() || "Untitled Script",
      kind: "script",
      content: editing.content,
    } as any;
    const { error } = await supabase.from("sales_templates").insert(row);
    if (!error) {
      setEditing(null);
      loadCustom();
    }
  };

  return (
    <Section title="Script Library">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs md:text-sm font-semibold text-gray-700">Templates</h3>
            <Btn tone="ghost" onClick={() => setEditing({ title: "", content: "" })} className="text-xs">+ New</Btn>
          </div>
          <div className="space-y-2 max-h-[300px] lg:max-h-none overflow-y-auto lg:overflow-visible">
            {scripts.map((item, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${active === i ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {s ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-800">{s.title}</h4>
                <Pill>Roofing CRM</Pill>
              </div>
              <pre className="whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                {s.content}
              </pre>
              <div className="flex gap-2">
                <Btn onClick={() => copy(s.content)}>Copy</Btn>
                <Btn
                  tone="ghost"
                  onClick={() => setEditing({ title: s.title, content: s.content })}
                >
                  Edit as New
                </Btn>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a script to view.</p>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-6 border-t pt-6">
          <h3 className="font-semibold text-gray-800 mb-4">Create Custom Script</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Title">
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Door-knock opener, Demo close, etc."
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Content">
                <TextArea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Type or paste your script..."
                />
              </Field>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn onClick={saveNew}>Save</Btn>
            <Btn tone="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
          </div>
        </div>
      )}
    </Section>
  );
}

function PricingCommission() {
  const [base, setBase] = useState(200);
  const [extraPerUser, setExtraPerUser] = useState(30);
  const [users, setUsers] = useState(3);
  const [setupFee, setSetupFee] = useState(0);
  const [repRate, setRepRate] = useState(0.4);
  const [commissionType, setCommissionType] = useState<"one_time" | "monthly">("one_time");

  const mrr = useMemo(() => {
    const extras = Math.max(users - 1, 0) * extraPerUser;
    return base + extras;
  }, [base, extraPerUser, users]);

  const arr = mrr * 12;

  const repCommission = useMemo(() => {
    if (commissionType === "one_time") {
      return (setupFee || mrr) * repRate;
    }
    return mrr * repRate;
  }, [commissionType, mrr, repRate, setupFee]);

  return (
    <Section title="Pricing & Commission Calculator">
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
            Tip: Your pitch can anchor on <b>{money(mrr)}</b> MRR and <b>{money(arr)}</b> ARR. If they add
            canvassers later, it's just <b>{money(extraPerUser)}</b> per user.
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
  const [leadsPerMonth, setLeadsPerMonth] = useState(120);
  const [closeRate, setCloseRate] = useState(0.25);
  const [avgJob, setAvgJob] = useState(15000);
  const [uplift, setUplift] = useState(0.12);
  const [mrrCost, setMrrCost] = useState(260);

  const monthlyRevenue = leadsPerMonth * closeRate * avgJob;
  const upliftRevenue = monthlyRevenue * uplift;
  const netDelta = upliftRevenue - mrrCost;

  return (
    <Section title="ROI Calculator">
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
          <Field label="Average Job Value ($)">
            <Input type="number" value={avgJob} onChange={(e) => setAvgJob(Number(e.target.value) || 0)} />
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
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Tile label="Monthly Revenue (Current)" value={money(monthlyRevenue)} />
          <Tile label="Added Revenue From CRM" value={money(upliftRevenue)} />
          <Tile label="Net Lift After CRM Cost" value={money(netDelta)} />
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            Pitch line: "With an average job of {money(avgJob)}, the CRM pays for itself if it helps you close
            just <b>{Math.ceil(mrrCost / (avgJob * closeRate)) || 1}</b> extra job(s) per month."
          </div>
        </div>
      </div>
    </Section>
  );
}

function BCAProposalGenerator() {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
  const [client, setClient] = useState({ company: "", contact: "", email: "", phone: "" });
  const [packageOption, setPackageOption] = useState("Standard CRM Package");
  const [investment, setInvestment] = useState(200);
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTemplate() {
    try {
      if (!supabase) throw new Error("Supabase not initialized");
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("sales_material")
        .select("content")
        .eq("category", "bca_proposal_template")
        .maybeSingle();

      if (error) throw error;
      if (data?.content) {
        setTemplate(data.content);
      } else {
        setTemplate("No template configured yet. Managers can create one below.");
      }
    } catch (err: any) {
      console.error("Error loading template:", err);
      setError(err.message || "Unknown error");
      setTemplate("Error loading template.");
    } finally {
      setLoading(false);
    }
  }

  async function saveTemplate() {
    if (!supabase || !profile?.id) return alert("Supabase not ready");
    try {
      await supabase.from("sales_material").upsert({
        category: "bca_proposal_template",
        content: template,
        updated_by: profile.id,
      });
      alert("BCA Proposal template saved!");
    } catch (err) {
      console.error(err);
      alert("Error saving template.");
    }
  }

  useEffect(() => {
    const role = (profile?.user_role || "").toLowerCase();
    setIsManager(["owner", "admin", "manager"].includes(role));
    loadTemplate();
  }, [profile]);

  useAutoRefetchOnFocus(loadTemplate);

  const placeholders: Record<string, string> = {
    "{{client_company}}": client.company,
    "{{client_contact}}": client.contact,
    "{{client_email}}": client.email,
    "{{client_phone}}": client.phone,
    "{{package_name}}": packageOption,
    "{{investment}}": `$${investment}`,
  };

  const filledTemplate = useMemo(() => {
    let result = template || "";
    for (const [key, val] of Object.entries(placeholders)) {
      result = result.replaceAll(key, val || "");
    }
    return result;
  }, [template, client, packageOption, investment]);

  const copyProposal = async () => {
    try {
      await navigator.clipboard.writeText(filledTemplate);
      alert("Proposal copied to clipboard!");
    } catch {
      alert("Copy failed; please select and copy manually.");
    }
  };

  if (error) {
    return (
      <Section title="Blue Collar Academy Proposals">
        <div className="p-6">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error loading proposals</h1>
          <p className="text-gray-700">{error}</p>
          <Btn tone="ghost" onClick={loadTemplate} className="mt-4">
            Retry
          </Btn>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Blue Collar Academy Proposals">
      <p className="text-sm text-gray-600 mb-4">
        Generate proposals for roofing companies interested in Blue Collar Academy or the Roofing CRM.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 mb-1">Client Info</h4>
          <Field label="Company Name">
            <Input
              value={client.company}
              onChange={(e) => setClient({ ...client, company: e.target.value })}
              placeholder="ABC Roofing Co."
            />
          </Field>
          <Field label="Contact Name">
            <Input
              value={client.contact}
              onChange={(e) => setClient({ ...client, contact: e.target.value })}
              placeholder="John Doe"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={client.email}
              onChange={(e) => setClient({ ...client, email: e.target.value })}
              placeholder="john@abcroofing.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={client.phone}
              onChange={(e) => setClient({ ...client, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </Field>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 mb-1">Package Details</h4>
          <Field label="Package Option">
            <select
              value={packageOption}
              onChange={(e) => setPackageOption(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Standard CRM Package</option>
              <option>Premium CRM + Academy Access</option>
              <option>Enterprise Solution</option>
              <option>Custom Package</option>
            </select>
          </Field>
          <Field label="Monthly Investment ($)">
            <Input
              type="number"
              value={investment}
              onChange={(e) => setInvestment(Number(e.target.value) || 0)}
            />
          </Field>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Annual Value</p>
            <p className="text-2xl font-bold text-gray-900">{money(investment * 12)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 mb-1">Available Placeholders</h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 space-y-1">
            <p><code>{'{{client_company}}'}</code> - Company name</p>
            <p><code>{'{{client_contact}}'}</code> - Contact name</p>
            <p><code>{'{{client_email}}'}</code> - Email address</p>
            <p><code>{'{{client_phone}}'}</code> - Phone number</p>
            <p><code>{'{{package_name}}'}</code> - Package option</p>
            <p><code>{'{{investment}}'}</code> - Monthly investment</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="font-semibold text-gray-800 mb-2">Proposal Preview</h4>
        {loading ? (
          <p className="text-sm text-gray-500">Loading template...</p>
        ) : (
          <>
            <pre className="whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 min-h-[300px]">
              {filledTemplate}
            </pre>
            <div className="mt-3">
              <Btn onClick={copyProposal}>Copy Proposal</Btn>
            </div>
          </>
        )}
      </div>

      {isManager && (
        <div className="mt-8 border-t pt-6">
          <h4 className="font-semibold text-gray-800 mb-3">Edit BCA Template (Manager Only)</h4>
          <p className="text-sm text-gray-600 mb-3">
            Use placeholders like {'{{client_company}}'}, {'{{client_contact}}'}, {'{{package_name}}'}, etc.
          </p>
          <TextArea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Enter your BCA proposal template here..."
            className="min-h-[250px]"
          />
          <div className="mt-3">
            <Btn onClick={saveTemplate}>Save BCA Template</Btn>
          </div>
        </div>
      )}
    </Section>
  );
}

function AffiliateLinksHelper() {
  const [siteUrl, setSiteUrl] = useState("https://yourcrm.com");
  const [affiliateId, setAffiliateId] = useState("");
  const [landingPath, setLandingPath] = useState("/signup");

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Site URL">
          <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://yourcrm.com" />
        </Field>
        <Field label="Landing Path">
          <Input value={landingPath} onChange={(e) => setLandingPath(e.target.value)} placeholder="/signup" />
        </Field>
        <Field label="Affiliate ID (AffiliateWP)">
          <Input value={affiliateId} onChange={(e) => setAffiliateId(e.target.value)} placeholder="123" />
        </Field>
      </div>
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">Tracking Link</p>
        <div className="flex items-center gap-2">
          <code className="text-sm text-gray-800 break-all">{link}</code>
        </div>
        <div className="mt-3">
          <Btn onClick={copy}>Copy Link</Btn>
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Use this for canvassers, partners, or reps. Conversions credit to the affiliate ID in AffiliateWP.
      </div>
    </Section>
  );
}
