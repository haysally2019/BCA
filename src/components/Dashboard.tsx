import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Phone,
  Mail,
  ExternalLink,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
  Copy,
  Link as LinkIcon,
} from "lucide-react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

// TYPES
type MetricsRow = {
  date: string;
  visits: number | null;
  referrals: number | null;
  earnings: number | null;
  unpaid_earnings: number | null;
};

type ReferralRow = {
  affiliate_id: number;
  referral_id: string;
  status: string;
  amount: number;
  description: string | null;
  origin_url: string | null;
  order_id: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  deal_value: number;
};

const rolesManager = new Set(["owner", "admin", "manager"]);

// HELPER COMPONENTS
const Section = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {action}
    </div>
    <div className="p-6 flex-1">{children}</div>
  </div>
);

const Tile = ({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
  trend?: string;
}) => (
  <div className="group bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-academy-blue-200 transition-all duration-200">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-slate-100 rounded-lg group-hover:bg-academy-blue-50 transition-colors">
        {Icon && <Icon className="w-5 h-5 text-slate-600 group-hover:text-academy-blue-600" />}
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>

    <div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{value}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 border-l border-slate-300 pl-2">{sub}</p>}
      </div>
    </div>
  </div>
);

const QuickAction = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-slate-200 hover:border-academy-blue-300 hover:bg-academy-blue-50/50 rounded-xl text-slate-600 hover:text-academy-blue-700 transition-all duration-200 group h-full"
  >
    <div className="p-3 bg-slate-100 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all">
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select
      {...props}
      className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500 block w-full px-4 py-2.5 pr-8 cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
    />
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
      <ChevronRight className="w-4 h-4 rotate-90" />
    </div>
  </div>
);

const fmtNum = (n: unknown) =>
  typeof n === "number" ? n.toLocaleString() : "0";

const fmtMoney = (n: unknown) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "$0";

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

// ==================================================================
// MAIN DASHBOARD COMPONENT
// ==================================================================

const Dashboard: React.FC = () => {
  const { supabase } = useSupabase();
  const { profile, refreshProfile } = useAuthStore();
  const navigate = useNavigate();

  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [series, setSeries] = useState<MetricsRow[]>([]);
  const [latest, setLatest] = useState<MetricsRow | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);

  const role = (profile?.user_role || "").toLowerCase();
  const isManager = rolesManager.has(role);
  const affiliateId = profile?.affiliatewp_id ?? null;

  useEffect(() => {
    refreshProfile();
  }, []);

  // LOAD LEADS
  const loadLeads = useCallback(async () => {
    try {
      setLeadsLoading(true);
      const { data } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentLeads(data || []);
    } finally {
      setLeadsLoading(false);
    }
  }, [supabase]);

  // LOAD METRICS
  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const since = toISODate(new Date(Date.now() - range * 86400000));

      if (isManager) {
        const { data } = await supabase
          .from("affiliate_metrics_daily")
          .select("date, visits, referrals, earnings, unpaid_earnings")
          .gte("date", since);

        const map = new Map<string, MetricsRow>();

        (data || []).forEach((r: any) => {
          const prev = map.get(r.date) || {
            date: r.date,
            visits: 0,
            referrals: 0,
            earnings: 0,
            unpaid_earnings: 0,
          };

          map.set(r.date, {
            date: r.date,
            visits: (prev.visits || 0) + (r.visits || 0),
            referrals: (prev.referrals || 0) + (r.referrals || 0),
            earnings: (prev.earnings || 0) + (r.earnings || 0),
            unpaid_earnings:
              (prev.unpaid_earnings || 0) + (r.unpaid_earnings || 0),
          });
        });

        const rows = Array.from(map.values()).sort((a, b) =>
          a.date < b.date ? -1 : 1
        );

        setSeries(rows);
        setLatest(rows[rows.length - 1] || null);
      } else {
        if (!affiliateId) {
          setSeries([]);
          setLatest(null);
          return;
        }

        const { data } = await supabase
          .from("affiliate_metrics_daily")
          .select("date, visits, referrals, earnings, unpaid_earnings")
          .eq("affiliate_id", affiliateId)
          .gte("date", since)
          .order("date", { ascending: true });

        setSeries(data || []);
        setLatest(data?.[data.length - 1] || null);
      }
    } catch (e: any) {
      setError(e.message);
      setSeries([]);
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, range, isManager, affiliateId]);

  // LOAD REFERRALS
  const loadReferrals = useCallback(async () => {
    if (!isManager && !affiliateId) return setReferrals([]);

    const query = supabase
      .from("affiliate_referrals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data } = isManager
      ? await query
      : await query.eq("affiliate_id", affiliateId!);

    setReferrals(data || []);
  }, [supabase, isManager, affiliateId]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadMetrics(), loadReferrals(), loadLeads()]);
  }, [loadMetrics, loadReferrals, loadLeads]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const totals = useMemo(() => {
    let visits = 0,
      refs = 0,
      earn = 0,
      unpaid = 0;

    series.forEach((r) => {
      visits += r.visits || 0;
      refs += r.referrals || 0;
      earn += r.earnings || 0;
      unpaid += r.unpaid_earnings || 0;
    });

    return {
      visits,
      refs,
      earn,
      unpaid,
      conv: visits ? (refs / visits) * 100 : 0,
    };
  }, [series]);

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = {
      new: "bg-academy-blue-50 text-academy-blue-700 border-academy-blue-200 ring-academy-blue-600/20",
      contacted: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
      qualified: "bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20",
      proposal: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-600/20",
      negotiation: "bg-orange-50 text-orange-700 border-orange-200 ring-orange-600/20",
      closed: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
      paid: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
      pending: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
      unpaid: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20",
    };
    return map[s] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  if (error) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="bg-white border border-rose-200 rounded-xl p-8 max-w-md shadow-lg text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Error Loading Dashboard</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={loadAll} className="w-full rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-6 py-2.5 shadow-sm transition-colors font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1600px] mx-auto">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isManager ? "Team Overview" : "Sales Dashboard"}
          </h1>
          <p className="text-slate-500 mt-1">
            {isManager
              ? "Monitor team performance and commission payouts."
              : "Track your sales performance and recent activity."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={String(range)}
            onChange={(e) => setRange(Number(e.target.value) as 7 | 30 | 90)}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </Select>

          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* AFFILIATE LINK */}
      <div className="bg-gradient-to-r from-academy-blue-900 to-academy-blue-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                  <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-academy-blue-300" />
                    Your Affiliate Link
                  </h3>
                  <p className="text-academy-blue-100 text-sm">Share this link to track referrals automatically.</p>
              </div>
              
              {profile?.affiliate_url ? (
                <div className="flex items-center gap-2 w-full md:w-auto bg-white/10 p-1.5 rounded-lg border border-white/10">
                    <code className="flex-1 md:flex-none text-sm px-3 py-1.5 font-mono text-academy-blue-100 truncate max-w-[300px] select-all">
                        {profile.affiliate_url}
                    </code>
                    <div className="h-6 w-px bg-white/20 mx-1"></div>
                     <button
                        onClick={() => {
                        navigator.clipboard.writeText(profile.affiliate_url || "");
                        toast.success("Copied to clipboard!");
                        }}
                        className="p-2 hover:bg-white/20 rounded-md transition text-white"
                        title="Copy Link"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                     <a
                        href={profile.affiliate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/20 rounded-md transition text-white"
                        title="Open Link"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-lg border border-white/10 text-sm">
                  {profile?.affiliatewp_id ? (
                    <span className="text-academy-blue-200">Link unavailable. Contact support.</span>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-academy-blue-400 rounded-full animate-pulse" />
                      <span className="text-academy-blue-100">Generating your tracking link...</span>
                      <button 
                        onClick={async () => {
                          await refreshProfile();
                          toast.success("Refreshed profile data");
                        }}
                        className="ml-2 text-xs underline text-white hover:text-academy-blue-200"
                      >
                        Refresh
                      </button>
                    </>
                  )}
                </div>
              )}
          </div>
      </div>

      {/* KPI TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Tile label="Total Visits" value={fmtNum(totals.visits)} icon={Users} />
        <Tile label="Referrals" value={fmtNum(totals.refs)} icon={TrendingUp} />
        <Tile
          label="Conversion Rate"
          value={`${totals.conv.toFixed(1)}%`}
          sub="Visits to Referrals"
          icon={Target}
        />
        <Tile label="Total Earnings" value={fmtMoney(totals.earn)} icon={DollarSign} />
        <Tile label="Unpaid Balance" value={fmtMoney(totals.unpaid)} icon={Clock} />
      </div>

       {/* QUICK ACTIONS */}
       {!isManager && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
          <h3 className="text-xs md:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 md:mb-4">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <QuickAction
              icon={Plus}
              label="Add New Lead"
              onClick={() => navigate("/leads")}
            />
            <QuickAction
              icon={Phone}
              label="Log Call"
              onClick={() => navigate("/leads")}
            />
             <QuickAction
              icon={Target}
              label="Sales Scripts"
              onClick={() => navigate("/sales-tools")}
            />
            <QuickAction
              icon={DollarSign}
              label="View Commissions"
              onClick={() => navigate("/commissions")}
            />
          </div>
        </div>
      )}

      {/* EARNINGS + LEADS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* CHART */}
        <Section title="Earnings Performance">
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-200 border-b-academy-blue-600"></div>
            </div>
          ) : series.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
              <p>No earnings data for this period.</p>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `$${val}`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      padding: "12px"
                    }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Earnings"]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEarnings)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        {/* RECENT LEADS */}
        <Section
          title="Recent Leads"
          action={
            <button
              onClick={() => navigate("/leads")}
              className="text-sm font-medium text-academy-blue-600 hover:text-academy-blue-700 flex items-center gap-1 transition-colors"
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          }
        >
          {leadsLoading ? (
             <div className="flex items-center justify-center h-[300px]">
             <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-200 border-b-academy-blue-600"></div>
           </div>
          ) : recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
              <p>No leads generated yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="group flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-academy-blue-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-academy-blue-600 group-hover:border-academy-blue-200 transition-colors">
                        <Building2Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {lead.company_name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lead.contact_name}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                         {lead.deal_value > 0 && (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <DollarSign className="w-3 h-3" />
                                {fmtNum(lead.deal_value)}
                            </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ring-1 ring-inset ${getStatusColor(
                          lead.status
                        )}`}
                      >
                        {lead.status}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-2">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* REFERRALS */}
      <Section
        title="Recent Referral Commissions"
        action={
          <button
            onClick={() => navigate("/commissions")}
            className="text-sm font-medium text-academy-blue-600 hover:text-academy-blue-700 flex items-center gap-1 transition-colors"
          >
            View All <ArrowUpRight className="w-4 h-4" />
          </button>
        }
      >
        {referrals.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-12 text-slate-400">
             <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
            <p>No referral activity recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((r) => (
                  <tr
                    key={r.referral_id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <code className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-600 text-xs font-mono">
                        #{r.referral_id}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                        {r.description || "Standard Commission"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          r.status
                        )}`}
                      >
                        {r.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                      {fmtMoney(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
};

// Custom Icon Component
function Building2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

export default Dashboard;