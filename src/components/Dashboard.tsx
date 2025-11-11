import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAuthStore } from "../store/authStore";
import { useAutoRefetchOnFocus } from "../hooks/useAutoRefetchOnFocus";

/* ---------- Minimal UI primitives ---------- */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
    {children}
  </div>
);

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {sub ? <p className="text-xs text-gray-500 mt-1">{sub}</p> : null}
  </div>
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
  />
);

const Button = ({
  children,
  tone = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" }) => {
  const base = "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition";
  const style = tone === "primary" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200";
  return (
    <button {...rest} className={`${base} ${style} ${rest.className || ""}`}>
      {children}
    </button>
  );
};

/* ---------- Chart (Recharts) ---------- */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ---------- Helpers ---------- */
const fmtNum = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString() : "0";
const fmtMoney = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "$0";
const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const rolesManager = new Set(["owner", "admin", "manager"]);

/* ---------- Types ---------- */
type MetricsRow = {
  date: string;            // yyyy-mm-dd
  visits: number | null;
  referrals: number | null;
  earnings: number | null;
  unpaid_earnings: number | null;
  affiliatewp_id?: string; // for manager aggregations
};

/* ===========================================================
 * Dashboard
 * ===========================================================
 */
export default function Dashboard() {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const role = (profile?.user_role || "").toLowerCase();
  const isManager = rolesManager.has(role);

  // Data for the view
  const [series, setSeries] = useState<MetricsRow[]>([]); // Either personal series or aggregated team series
  const [latest, setLatest] = useState<MetricsRow | null>(null);
  const [affiliateId, setAffiliateId] = useState<string>(""); // rep's own AffiliateWP ID (if rep)

  /* ---------- Loaders ---------- */

  // fetch the current user's affiliatewp_id (rep view)
  const fetchAffiliateIdForUser = useCallback(async () => {
    if (!supabase || !profile?.id) return "";
    const { data, error } = await supabase
      .from("affiliates")
      .select("affiliatewp_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) {
      console.warn("affiliates lookup error:", error.message);
      return "";
    }
    return (data?.affiliatewp_id as string) || "";
  }, [supabase, profile?.id]);

  // fetch metrics for one affiliate over range
  const fetchSeriesForAffiliate = useCallback(
    async (affId: string, days: number) => {
      if (!affId) return [] as MetricsRow[];
      const since = toISODate(new Date(Date.now() - days * 86400000));
      const { data, error } = await supabase
        .from("affiliate_metrics_daily")
        .select("date, visits, referrals, earnings, unpaid_earnings")
        .eq("affiliatewp_id", affId)
        .gte("date", since)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as MetricsRow[];
    },
    [supabase]
  );

  // fetch metrics for all affiliates (manager) and aggregate by date
  const fetchSeriesForAll = useCallback(
    async (days: number) => {
      const since = toISODate(new Date(Date.now() - days * 86400000));

      // load all affiliate ids
      const affRes = await supabase.from("affiliates").select("affiliatewp_id");
      if (affRes.error) throw affRes.error;
      const ids = (affRes.data || []).map((r: any) => r.affiliatewp_id).filter(Boolean);
      if (!ids.length) return [] as MetricsRow[];

      // chunk IN() queries if needed (keep it simple here)
      const { data, error } = await supabase
        .from("affiliate_metrics_daily")
        .select("affiliatewp_id, date, visits, referrals, earnings, unpaid_earnings")
        .in("affiliatewp_id", ids)
        .gte("date", since);

      if (error) throw error;
      const rows = (data || []) as MetricsRow[];

      // aggregate by date
      const map = new Map<string, MetricsRow>();
      for (const r of rows) {
        const key = r.date;
        const prev = map.get(key) || { date: key, visits: 0, referrals: 0, earnings: 0, unpaid_earnings: 0 };
        map.set(key, {
          date: key,
          visits: (prev.visits || 0) + (r.visits || 0),
          referrals: (prev.referrals || 0) + (r.referrals || 0),
          earnings: (prev.earnings || 0) + (r.earnings || 0),
          unpaid_earnings: (prev.unpaid_earnings || 0) + (r.unpaid_earnings || 0),
        });
      }
      const agg = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
      return agg;
    },
    [supabase]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);

      if (isManager) {
        const team = await fetchSeriesForAll(range);
        setSeries(team);
        setLatest(team.length ? team[team.length - 1] : null);
      } else {
        const affId = await fetchAffiliateIdForUser();
        setAffiliateId(affId);
        const mine = await fetchSeriesForAffiliate(affId, range);
        setSeries(mine);
        setLatest(mine.length ? mine[mine.length - 1] : null);
      }
    } catch (e: any) {
      console.error(e);
      setErr(e.message || "Failed to load metrics");
      setSeries([]);
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, [isManager, range, fetchAffiliateIdForUser, fetchSeriesForAffiliate, fetchSeriesForAll]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefetchOnFocus(load);

  /* ---------- Derivations ---------- */
  const totals = useMemo(() => {
    let visits = 0,
      referrals = 0,
      earnings = 0,
      unpaid = 0;
    for (const r of series) {
      visits += r.visits || 0;
      referrals += r.referrals || 0;
      earnings += r.earnings || 0;
      unpaid += r.unpaid_earnings || 0;
    }
    const conv = visits > 0 ? (referrals / visits) * 100 : 0;
    return { visits, referrals, earnings, unpaid, conv };
  }, [series]);

  /* ---------- UI ---------- */
  if (err) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error loading dashboard</h1>
        <p className="text-gray-700">{err}</p>
        <Button tone="ghost" onClick={load} className="mt-3">Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isManager ? "Team Dashboard" : "My Dashboard"}
          </h1>
          <p className="text-gray-600">
            {isManager
              ? "Rollup across all affiliates (AffiliateWP)."
              : "Your personal AffiliateWP performance."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Range</label>
          <Select
            value={String(range)}
            onChange={(e) => setRange(Number(e.target.value) as 7 | 30 | 90)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Button tone="ghost" onClick={load}>Refresh</Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Visits" value={fmtNum(totals.visits)} />
        <Tile label="Referrals" value={fmtNum(totals.referrals)} />
        <Tile label="Conversion" value={`${totals.conv.toFixed(1)}%`} sub="Referrals / Visits" />
        <Tile label="Earnings" value={fmtMoney(totals.earnings)} />
        <Tile label="Unpaid" value={fmtMoney(totals.unpaid)} />
      </div>

      {/* Chart */}
      <Section title="Earnings Over Time">
        {loading ? (
          <p className="text-gray-500">Loading chart…</p>
        ) : series.length === 0 ? (
          <p className="text-gray-500">No data in this range.</p>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Line type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Latest Day Snapshot */}
      <Section title="Most Recent Day">
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : latest ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Visits</th>
                  <th className="text-left p-2">Referrals</th>
                  <th className="text-left p-2">Earnings</th>
                  <th className="text-left p-2">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">{latest.date}</td>
                  <td className="p-2">{fmtNum(latest.visits || 0)}</td>
                  <td className="p-2">{fmtNum(latest.referrals || 0)}</td>
                  <td className="p-2">{fmtMoney(latest.earnings || 0)}</td>
                  <td className="p-2">{fmtMoney(latest.unpaid_earnings || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No recent day available.</p>
        )}
      </Section>

      {/* Rep helpful panel */}
      {!isManager && affiliateId ? (
        <Section title="My Affiliate Link (quick access)">
          <p className="text-sm text-gray-600 mb-2">
            Share your link to receive credit on signups.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <code className="text-sm break-all">
              {`https://bluecollaracademy.info/signup?ref=${affiliateId}`}
            </code>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
