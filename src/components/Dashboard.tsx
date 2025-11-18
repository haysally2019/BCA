import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

// TYPES & UTILITIES PRESERVED
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

const Section = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const Tile = ({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
}) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
    <div className="flex items-start justify-between mb-3">
      <p className="text-[11px] tracking-wide text-gray-500 uppercase font-medium">
        {label}
      </p>
      {Icon && <Icon className="w-5 h-5 text-gray-400" />}
    </div>

    <p className="text-3xl font-semibold text-gray-900 mb-1">{value}</p>

    {sub && <p className="text-xs text-gray-500">{sub}</p>}
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
    className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md flex items-center gap-2 transition"
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="rounded-xl bg-white border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
);

const fmtNum = (n: unknown) =>
  typeof n === "number" ? n.toLocaleString() : "0";

const fmtMoney = (n: unknown) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "$0";

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

// ==================================================================

const Dashboard: React.FC = () => {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
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

  // =====================================
  // LOADLEADS
  // =====================================
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

  // =====================================
  // LOAD METRICS
  // =====================================
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

  // =====================================
  // LOAD REFERRALS
  // =====================================
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
      new: "bg-blue-50 text-blue-700 border-blue-200",
      contacted: "bg-amber-50 text-amber-700 border-amber-200",
      qualified: "bg-purple-50 text-purple-700 border-purple-200",
      proposal: "bg-green-50 text-green-700 border-green-200",
      negotiation: "bg-orange-50 text-orange-700 border-orange-200",
      closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      paid: "bg-green-50 text-green-700 border-green-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      unpaid: "bg-red-50 text-red-700 border-red-200",
    };
    return map[s] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  // ERROR SCREEN (light UI)
  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md shadow-lg">
          <h1 className="text-2xl font-semibold text-red-600 mb-3">
            Error Loading Dashboard
          </h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={loadAll}
            className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white px-6 py-3 shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------
  // MAIN RENDER (L3 LIGHT UI)
  // -----------------------------------
  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isManager ? "Team Dashboard" : "Sales Dashboard"}
            </h1>
            <p className="text-gray-500">
              {isManager
                ? "Team-wide performance insights"
                : "Your performance and activity overview"}
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      {!isManager && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction
              icon={Plus}
              label="Add Lead"
              onClick={() => navigate("/leads")}
            />
            <QuickAction
              icon={Phone}
              label="Call Schedule"
              onClick={() => navigate("/leads")}
            />
            <QuickAction
              icon={DollarSign}
              label="Commissions"
              onClick={() => navigate("/commissions")}
            />
            <QuickAction
              icon={Target}
              label="Sales Tools"
              onClick={() => navigate("/sales-tools")}
            />
          </div>
        </div>
      )}

      {/* KPI TILES */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Tile label="Visits" value={fmtNum(totals.visits)} icon={Users} />
        <Tile label="Referrals" value={fmtNum(totals.refs)} icon={TrendingUp} />
        <Tile
          label="Conversion"
          value={`${totals.conv.toFixed(1)}%`}
          sub="Referrals / Visits"
          icon={Target}
        />
        <Tile label="Earnings" value={fmtMoney(totals.earn)} icon={DollarSign} />
        <Tile label="Unpaid" value={fmtMoney(totals.unpaid)} icon={Clock} />
      </div>

      {/* EARNINGS + LEADS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CHART */}
        <Section title="Earnings Over Time">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-500"></div>
            </div>
          ) : series.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              No data available.
            </div>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={11} />
                  <YAxis stroke="#475569" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#111" }}
                    itemStyle={{ color: "#111" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#2563EB" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
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
              className="flex items-center gap-1 text-blue-600 hover:text-blue-500 text-sm"
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          }
        >
          {leadsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-500"></div>
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              No leads yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-gray-900 font-medium">
                        {lead.company_name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {lead.contact_name}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full border font-medium ${getStatusColor(
                        lead.status
                      )}`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {lead.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {lead.phone}
                    </span>

                    {lead.deal_value > 0 && (
                      <span className="flex items-center gap-1 text-green-700 font-medium">
                        <DollarSign className="w-3 h-3" />
                        {fmtMoney(lead.deal_value)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* REFERRALS */}
      <Section
        title="Recent Referrals"
        action={
          <button
            onClick={() => navigate("/commissions")}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-500 text-sm"
          >
            View All <ArrowUpRight className="w-4 h-4" />
          </button>
        }
      >
        {referrals.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            No recent referrals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 tracking-wide">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                {referrals.map((r) => (
                  <tr
                    key={r.referral_id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="p-3 text-gray-700">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <code className="px-2 py-1 bg-gray-100 rounded border border-gray-200 text-gray-700 text-xs">
                        {r.referral_id}
                      </code>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs border font-medium ${getStatusColor(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-green-700 font-medium">
                      {fmtMoney(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* AFFILIATE LINK */}
      {(profile?.affiliate_referral_url?.length ?? 0) > 0 && (
        <Section title="Your Affiliate Link">
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3">
              <code className="flex-1 text-sm bg-white border border-gray-200 px-4 py-2 rounded-xl overflow-x-auto text-gray-800">
                {profile?.affiliate_referral_url}
              </code>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    profile?.affiliate_referral_url || ""
                  );
                  toast.success("Copied to clipboard!");
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition"
              >
                Copy
              </button>

              <a
                href={profile?.affiliate_referral_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 rounded-xl transition shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
};

export default Dashboard;