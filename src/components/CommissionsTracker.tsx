// FULLY PATCHED COMMISSIONS TRACKER — SAFE & STABLE
// All "useDataStore" / store dependencies removed

import React, { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  Users,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import supabase from "../lib/supabaseService"; // ✅ REAL DATA SOURCE NOW
import { useAuthStore } from "../store/authStore";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";

// ---------------------------
// TYPES
// ---------------------------

type Period = "current_quarter" | "last_quarter" | "year";
type StatusFilter = "all" | "pending" | "approved" | "paid";

interface CommissionLike {
  id: string | number;
  status?: string;
  amount?: number;
  earnings?: number;
  created_at?: string;
  date?: string;
  description?: string;
  order_id?: string | number;
  deal_id?: string | number | null;
  deal?: { title?: string } | null;
}

interface MonthlyDataPoint {
  month: string;
  commissions: number;
  deals: number;
}

interface CommissionTotals {
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  approvedCommissions: number;
  totalDeals: number;
  avgCommission: number;
}

// ---------------------------
// HELPERS
// ---------------------------

function getQuarterRange(period: Period) {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);

  if (period === "current_quarter") {
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { start, end };
  }

  if (period === "last_quarter") {
    const last = q === 0 ? 3 : q - 1;
    const year = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const start = new Date(year, last * 3, 1);
    const end = new Date(year, last * 3 + 3, 0);
    return { start, end };
  }

  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31),
  };
}

// ---------------------------
// MAIN COMPONENT
// ---------------------------

const CommissionsTracker: React.FC = () => {
  const { profile } = useAuthStore();

  const [commissions, setCommissions] = useState<CommissionLike[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterPeriod, setFilterPeriod] = useState<Period>("current_quarter");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [syncingMetrics, setSyncingMetrics] = useState(false);

  // ---------------------------
  // LOAD COMMISSION DATA DIRECTLY FROM SUPABASE
  // ---------------------------

  async function loadCommissions() {
    if (!profile?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("commissions")
      .select("*")
      .eq("rep_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[CommissionsTracker] load error", error);
      setCommissions([]);
      setLoading(false);
      return;
    }

    setCommissions(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCommissions();
  }, [profile?.id]);

  // ---------------------------
  // SYNC METRICS (unchanged)
  // ---------------------------

  const syncAffiliateMetrics = async () => {
    setSyncingMetrics(true);
    const toastId = toast.loading("Syncing AffiliateWP metrics...");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-affiliatewp-metrics`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error();

      await loadCommissions();

      toast.success("AffiliateWP metrics synced", { id: toastId });
    } catch (err) {
      toast.error("Failed to sync AffiliateWP metrics", { id: toastId });
    }

    setSyncingMetrics(false);
  };

  // ---------------------------
  // FILTER BY PERIOD
  // ---------------------------

  const filteredByPeriod = useMemo(() => {
    const { start, end } = getQuarterRange(filterPeriod);

    return commissions.filter((c) => {
      const raw = c.created_at || c.date;
      if (!raw) return false;

      const d = new Date(raw);
      return d >= start && d <= end;
    });
  }, [commissions, filterPeriod]);

  // ---------------------------
  // FILTER BY STATUS
  // ---------------------------

  const filteredCommissions = useMemo(() => {
    return filteredByPeriod.filter((c) => {
      const status = (c.status || "").toLowerCase();
      return filterStatus === "all" ? true : status === filterStatus;
    });
  }, [filteredByPeriod, filterStatus]);

  // ---------------------------
  // CALCULATE TOTALS
  // ---------------------------

  const totals = useMemo<CommissionTotals>(() => {
    if (!filteredByPeriod.length) {
      return {
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        approvedCommissions: 0,
        totalDeals: 0,
        avgCommission: 0,
      };
    }

    let total = 0,
      paid = 0,
      pending = 0,
      approved = 0,
      deals = 0;

    for (const c of filteredByPeriod) {
      const amount = Number(c.amount ?? c.earnings ?? 0);
      const status = (c.status || "").toLowerCase();

      total += amount;
      if (status === "paid") paid += amount;
      if (status === "pending") pending += amount;
      if (status === "approved") approved += amount;

      if (c.deal_id || c.deal) deals += 1;
    }

    return {
      totalCommissions: total,
      paidCommissions: paid,
      pendingCommissions: pending,
      approvedCommissions: approved,
      totalDeals: deals,
      avgCommission: deals ? total / deals : 0,
    };
  }, [filteredByPeriod]);

  // ---------------------------
  // MONTHLY CHART
  // ---------------------------

  const monthlyData = useMemo<MonthlyDataPoint[]>(() => {
    const map = new Map<string, { commissions: number; deals: number }>();

    filteredByPeriod.forEach((c) => {
      const raw = c.created_at || c.date;
      if (!raw) return;

      const d = new Date(raw);
      const key = d.toLocaleDateString("en-US", { month: "short" });

      const amount = Number(c.amount ?? c.earnings ?? 0);
      const current = map.get(key) || { commissions: 0, deals: 0 };

      current.commissions += amount;
      if (c.deal_id || c.deal) current.deals += 1;
      map.set(key, current);
    });

    // Build last 6 months list
    const result: MonthlyDataPoint[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      const data = map.get(key) || { commissions: 0, deals: 0 };
      result.push({
        month: key,
        commissions: Math.round(data.commissions),
        deals: data.deals,
      });
    }

    return result;
  }, [filteredByPeriod]);

  // ---------------------------
  // LOADING STATE
  // ---------------------------

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading commissions..." />;
  }

  // ---------------------------
  // FULL UI BELOW (UNCHANGED)
  // ---------------------------

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Commissions & Affiliate Performance
          </h1>
          <p className="text-gray-600 text-sm">
            All metrics are synced from AffiliateWP + CRM commissions.
          </p>
        </div>

        <button
          onClick={syncAffiliateMetrics}
          disabled={syncingMetrics}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg"
        >
          <TrendingUp className="w-4 h-4" />
          {syncingMetrics ? "Syncing..." : "Sync AffiliateWP"}
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">Total Commissions</div>
          <div className="text-xl font-bold">${totals.totalCommissions.toFixed(2)}</div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">Paid Out</div>
          <div className="text-xl font-bold text-emerald-700">
            ${totals.paidCommissions.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-xl font-bold text-amber-700">
            ${totals.pendingCommissions.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">Approved</div>
          <div className="text-xl font-bold text-blue-700">
            ${totals.approvedCommissions.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">Total Deals</div>
          <div className="text-xl font-bold">{totals.totalDeals}</div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">Avg Commission</div>
          <div className="text-xl font-bold">
            ${totals.avgCommission.toFixed(2)}
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-3">Commissions & Deals (Last 6 Months)</h2>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `$${v}`} />
              <Tooltip />
              <Bar dataKey="commissions" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="deals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg shadow-sm p-4">
        <h2 className="text-sm font-semibold mb-3">
          Commission Records ({filteredCommissions.length})
        </h2>

        {filteredCommissions.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            No commission records match this filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredCommissions.map((c) => {
                  const id = String(
                    c.id ??
                      `${c.description}-${c.order_id}-${c.created_at}`
                  );

                  const raw = c.created_at || c.date;
                  const d = raw ? new Date(raw) : null;

                  return (
                    <tr key={id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {d ? d.toLocaleDateString() : "-"}
                      </td>
                      <td className="px-3 py-2">{c.description || "Commission"}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        ${Number(c.amount ?? c.earnings ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-2 py-1 rounded-full bg-gray-100">
                          {(c.status || "pending").toString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionsTracker;