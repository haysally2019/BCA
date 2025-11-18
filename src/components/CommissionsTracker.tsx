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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDataStore } from "../store/dataStore";
import { useAuthStore } from "../store/authStore";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";

type Period = "current_quarter" | "last_quarter" | "year";
type StatusFilter = "all" | "pending" | "approved" | "paid";

interface MonthlyDataPoint {
  month: string;
  commissions: number;
  deals: number;
}

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
  rep?: { id?: string | number; company_name?: string } | null;
}

interface CommissionTotals {
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  approvedCommissions: number;
  totalDeals: number;
  avgCommission: number;
}

const getQuarterRange = (period: Period) => {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  let start: Date;
  let end: Date;

  if (period === "current_quarter") {
    start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
    end = new Date(now.getFullYear(), currentQuarter * 3, 0);
  } else if (period === "last_quarter") {
    const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
    const year = currentQuarter === 1 ? now.getFullYear() - 1 : now.getFullYear();
    start = new Date(year, (lastQuarter - 1) * 3, 1);
    end = new Date(year, lastQuarter * 3, 0);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  }

  return { start, end };
};

const CommissionsTracker: React.FC = () => {
  const { profile } = useAuthStore();
  const {
    commissions,
    affiliateCommissions,
    commissionsLoading: loading,
    loadCommissionsData,
  } = useDataStore();

  const [filterPeriod, setFilterPeriod] = useState<Period>("current_quarter");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [syncingMetrics, setSyncingMetrics] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [selectedPayoutReps, setSelectedPayoutReps] = useState<string[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // 🔒 Always use safe arrays to avoid .filter on undefined
  const safeAffiliateCommissions: CommissionLike[] = Array.isArray(affiliateCommissions)
    ? affiliateCommissions
    : [];

  const safeCommissions: CommissionLike[] = Array.isArray(commissions)
    ? commissions
    : [];

  // Initial load
  useEffect(() => {
    if (profile?.id) {
      loadCommissionsData(profile.id).catch((err) => {
        console.error("[CommissionsTracker] load error", err);
      });
    }
  }, [profile?.id, loadCommissionsData]);

  // Sync from AffiliateWP edge function
  const syncAffiliateMetrics = async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      toast.error("Missing Supabase environment keys for AffiliateWP sync.");
      return;
    }

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

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || "Failed to sync metrics");
      }

      if (profile?.id) {
        await loadCommissionsData(profile.id);
      }

      toast.success("AffiliateWP metrics synced", { id: toastId });
    } catch (err) {
      console.error("[CommissionsTracker] sync error", err);
      toast.error("Failed to sync AffiliateWP metrics", { id: toastId });
    } finally {
      setSyncingMetrics(false);
    }
  };

  // Filter by time period
  const filteredByPeriod: CommissionLike[] = useMemo(() => {
    const { start, end } = getQuarterRange(filterPeriod);

    const base = safeCommissions.length ? safeCommissions : safeAffiliateCommissions;
    if (!base.length) return [];

    return base.filter((commission) => {
      const raw = commission.created_at || commission.date;
      if (!raw) return false;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });
  }, [filterPeriod, safeCommissions, safeAffiliateCommissions]);

  // Compute totals safely
  const totals: CommissionTotals = useMemo(() => {
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

    let totalCommissions = 0;
    let paidCommissions = 0;
    let pendingCommissions = 0;
    let approvedCommissions = 0;
    let totalDeals = 0;

    for (const commission of filteredByPeriod) {
      const amount = Number(commission.amount ?? commission.earnings ?? 0) || 0;
      const status = (commission.status || "").toLowerCase();

      totalCommissions += amount;
      if (status === "paid") paidCommissions += amount;
      if (status === "pending") pendingCommissions += amount;
      if (status === "approved") approvedCommissions += amount;

      if (commission.deal_id || commission.deal) {
        totalDeals += 1;
      }
    }

    return {
      totalCommissions,
      paidCommissions,
      pendingCommissions,
      approvedCommissions,
      totalDeals,
      avgCommission: totalDeals ? totalCommissions / totalDeals : 0,
    };
  }, [filteredByPeriod]);

  // Monthly chart data (last 6 months)
  const monthlyData: MonthlyDataPoint[] = useMemo(() => {
    const map = new Map<string, { commissions: number; deals: number }>();

    filteredByPeriod.forEach((commission) => {
      const raw = commission.created_at || commission.date;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const monthKey = d.toLocaleDateString("en-US", { month: "short" });

      const amount = Number(commission.amount ?? commission.earnings ?? 0) || 0;

      const current = map.get(monthKey) || { commissions: 0, deals: 0 };
      current.commissions += amount;
      if (commission.deal_id || commission.deal) current.deals += 1;
      map.set(monthKey, current);
    });

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

  // Status filter on top of period
  const filteredCommissions: CommissionLike[] = useMemo(() => {
    return filteredByPeriod.filter((commission) => {
      const status = (commission.status || "").toLowerCase();
      if (filterStatus === "all") return true;
      return status === filterStatus;
    });
  }, [filteredByPeriod, filterStatus]);

  // Revenue from currently filtered list
  useEffect(() => {
    const total = filteredCommissions.reduce((sum, commission) => {
      const amount = Number(commission.amount ?? commission.earnings ?? 0) || 0;
      return sum + amount;
    }, 0);
    setTotalRevenue(total);
  }, [filteredCommissions]);

  if (loading) {
    return (
      <LoadingSpinner
        size="lg"
        text="Loading commissions..."
        className="h-64"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            Commissions & Affiliate Performance
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            All metrics in this view are driven by AffiliateWP + your CRM commissions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={syncAffiliateMetrics}
            disabled={syncingMetrics}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" />
            {syncingMetrics ? "Syncing..." : "Sync AffiliateWP"}
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Total Commissions</span>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2 text-xl font-bold">
            ${totals.totalCommissions.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Paid Out</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700">
            ${totals.paidCommissions.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-700">
            ${totals.pendingCommissions.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Approved</span>
            <AlertCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-blue-700">
            ${totals.approvedCommissions.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Total Deals</span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-purple-700">
            {totals.totalDeals}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Avg Commission</span>
            <Users className="w-4 h-4 text-gray-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-gray-800">
            ${totals.avgCommission.toFixed(2)}
          </div>
        </div>
      </div>

      {/* CHART + FILTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                Commissions & Deals (Last 6 Months)
              </h2>
              <p className="text-xs text-gray-500">
                Aggregated from AffiliateWP records + CRM deals.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Commissions
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Deals
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis
                  yAxisId="left"
                  fontSize={11}
                  tickFormatter={(val) => `$${val}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  fontSize={11}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  formatter={(value: any, name: any) =>
                    name === "commissions"
                      ? [`$${value}`, "Commissions"]
                      : [value, "Deals"]
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="commissions"
                  name="Commissions"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="deals"
                  name="Deals"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">
              Filters
            </h2>
            <Calendar className="w-4 h-4 text-gray-500" />
          </div>

          <select
            value={filterPeriod}
            onChange={(e) =>
              setFilterPeriod(e.target.value as Period)
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="current_quarter">Current Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="year">Year to Date</option>
          </select>

          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-2">
              Filter commissions by status:
            </p>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as StatusFilter)
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 text-xs text-gray-600">
            <p className="font-semibold mb-1">Total Revenue (Filtered)</p>
            <p className="text-lg font-bold text-gray-900">
              ${totalRevenue.toFixed(2)}
            </p>
            <p className="text-[11px] mt-1 text-gray-500">
              Based on the commissions currently in view.
            </p>
          </div>
        </div>
      </div>

      {/* SIMPLE TABLE VIEW (no crashes) */}
      <div className="bg-white border rounded-lg shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
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
                  const id = String(c.id ?? `${c.description}-${c.order_id}-${c.created_at}`);
                  const rawDate = c.created_at || c.date;
                  const d = rawDate ? new Date(rawDate) : null;

                  return (
                    <tr key={id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {d && !Number.isNaN(d.getTime())
                          ? d.toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {c.description || "Commission"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        ${Number(c.amount ?? c.earnings ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-2 py-1 rounded-full text-[11px] bg-gray-100 text-gray-700">
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