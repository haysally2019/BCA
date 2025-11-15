import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabase } from "../context/SupabaseProvider";
import { useAuthStore } from "../store/authStore";
import { useAutoRefetchOnFocus } from "../hooks/useAutoRefetchOnFocus";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/* ---------- UI helpers ---------- */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
    <h2 className="text-lg font-bold text-gray-800 mb-4">{title}</h2>
    {children}
  </div>
);

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...p}
    className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
  />
);

const Btn = ({
  children,
  tone = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" }) => {
  const base = "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition";
  const style =
    tone === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200";
  return (
    <button {...rest} className={`${base} ${style} ${rest.className || ""}`}>
      {children}
    </button>
  );
};

/* ---------- utils ---------- */
const fmtNum = (n: any) => (typeof n === "number" ? n.toLocaleString() : "0");
const fmtMoney = (n: any) =>
  typeof n === "number" ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "$0";
const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const rolesManager = new Set(["owner", "admin", "manager"]);

/* ---------- types ---------- */
type MetricsRow = {
  date: string;
  visits: number | null;
  referrals: number | null;
  earnings: number | null;
  unpaid_earnings: number | null;
  affiliatewp_id?: string;
};

/* ===========================================================
 * AffiliateWP Dashboard
 * =========================================================== */
export default function Dashboard() {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();

  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<MetricsRow[]>([]);
  const [latest, setLatest] = useState<MetricsRow | null>(null);
  const [affiliateId, setAffiliateId] = useState("");

  const role = (profile?.user_role || "").toLowerCase();
  const isManager = rolesManager.has(role);

  /* ---------- Loaders ---------- */

  // Get current user's AffiliateWP ID (for rep view)
  const getAffiliateId = useCallback(async () => {
    if (!profile?.id) return "";
    const { data, error } = await supabase
      .from("affiliates")
      .select("affiliatewp_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) {
      console.warn("Affiliate ID error:", error.message);
      return "";
    }
    return data?.affiliatewp_id || "";
  }, [supabase, profile?.id]);

  // Metrics for a single affiliate
  const getMetricsForAffiliate = useCallback(
    async (id: string, days: number) => {
      if (!id) return [];
      const since = toISODate(new Date(Date.now() - days * 86400000));
      const { data, error } = await supabase
        .from("affiliate_metrics_daily")
        .select("date, visits, referrals, earnings, unpaid_earnings")
        .eq("affiliatewp_id", id)
        .gte("date", since)
        .order("date", { ascending: true });

      if (error) throw error;
      return (data || []) as MetricsRow[];
    },
    [supabase]
  );

  // Metrics across all affiliates (manager view)
  const getMetricsForAll = useCallback(
    async (days: number) => {
      const since = toISODate(new Date(Date.now() - days * 86400000));

      // load all affiliate ids
      const aff = await supabase.from("affiliates").select("affiliatewp_id");
      if (aff.error) throw aff.error;
      const ids = aff.data.map((a: any) => a.affiliatewp_id).filter(Boolean);
      if (!ids.length) return [];

      const { data, error } = await supabase
        .from("affiliate_metrics_daily")
        .select("affiliatewp_id, date, visits, referrals, earnings, unpaid_earnings")
        .in("affiliatewp_id", ids)
        .gte("date", since);

      if (error) throw error;

      const map = new Map<string, MetricsRow>();
      (data || []).forEach((r: MetricsRow) => {
        const k = r.date;
        const p = map.get(k) || {
          date: k,
          visits: 0,
          referrals: 0,
          earnings: 0,
          unpaid_earnings: 0,
        };
        map.set(k, {
          date: k,
          visits: (p.visits || 0) + (r.visits || 0),
          referrals: (p.referrals || 0) + (r.referrals || 0),
          earnings: (p.earnings || 0) + (r.earnings || 0),
          unpaid_earnings: (p.unpaid_earnings || 0) + (r.unpaid_earnings || 0),
        });
      });

      return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
    },
    [supabase]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isManager) {
        const team = await getMetricsForAll(range);
        setSeries(team);
        setLatest(team.length ? team[team.length - 1] : null);
      } else {
        const id = await getAffiliateId();
        setAffiliateId(id);
        const mine = await getMetricsForAffiliate(id, range);
        setSeries(mine);
        setLatest(mine.length ? mine[mine.length - 1] : null);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load metrics");
      setSeries([]);
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, [isManager, range, getAffiliateId, getMetricsForAffiliate, getMetricsForAll]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefetchOnFocus(load);

  /* ---------- Derived totals ---------- */
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

    const conv = visits > 0 ? (refs / visits) * 100 : 0;
    return { visits, refs, earn, unpaid, conv };
  }, [series]);

  /* ---------- UI ---------- */
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error loading dashboard</h1>
        <p className="text-gray-700">{error}</p>
        <Btn tone="ghost" onClick={load} className="mt-3">
          Retry
        </Btn>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isManager ? "Team Dashboard" : "My Dashboard"}
          </h1>
          <p className="text-gray-600">
            {isManager
              ? "All affiliates (team totals) synced from AffiliateWP."
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
          <Btn tone="ghost" onClick={load}>
            Refresh
          </Btn>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Visits" value={fmtNum(totals.visits)} />
        <Tile label="Referrals" value={fmtNum(totals.refs)} />
        <Tile label="Conversion" value={`${totals.conv.toFixed(1)}%`} sub="Referrals / Visits" />
        <Tile label="Earnings" value={fmtMoney(totals.earn)} />
        <Tile label="Unpaid" value={fmtMoney(totals.unpaid)} />
      </div>

      {/* Earnings chart */}
      <Section title="Earnings Over Time">
        {loading ? (
          <p className="text-gray-500">Loading chart…</p>
        ) : series.length === 0 ? (
          <p className="text-gray-500">No data for this range.</p>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Latest day snapshot */}
      <Section title="Most Recent Day">
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : latest ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Visits</th>
                  <th className="p-2 text-left">Referrals</th>
                  <th className="p-2 text-left">Earnings</th>
                  <th className="p-2 text-left">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">{latest.date}</td>
                  <td className="p-2">{fmtNum(latest.visits)}</td>
                  <td className="p-2">{fmtNum(latest.referrals)}</td>
                  <td className="p-2">{fmtMoney(latest.earnings)}</td>
                  <td className="p-2">{fmtMoney(latest.unpaid_earnings)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No data available.</p>
        )}
      </Section>

      {/* Rep quick link */}
      {!isManager && affiliateId && (
        <Section title="My Affiliate Link">
          <p className="text-sm text-gray-600 mb-2">Share your referral link for credit.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <code className="text-sm break-all">
              {`https://bluecollaracademy.info/signup?ref=${affiliateId}`}
            </code>
          </div>
        </Section>
      )}
    </div>
  );
}
