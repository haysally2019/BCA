import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  Users,
  Calendar
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { supabaseService, Commission } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

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

const CommissionsTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reps' | 'overview'>('reps');
  const [filterPeriod, setFilterPeriod] = useState<'current_quarter' | 'last_quarter' | 'year'>('current_quarter');
  // 🔥 FIX: this was missing but referenced later
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');

  const { profile } = useAuthStore();
  const {
    commissions,
    affiliateCommissions,
    commissionsLoading: loading,
    loadCommissionsData
  } = useDataStore();

  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [syncingMetrics, setSyncingMetrics] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [selectedPayoutReps, setSelectedPayoutReps] = useState<string[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    // Load commissions + reps
    loadCommissionsData(profile.id);
    fetchSalesReps(profile.id);
  }, [profile?.id, loadCommissionsData]);

  const fetchSalesReps = async (companyId: string) => {
    try {
      const reps = await supabaseService.getTeamMembers(companyId);
      setSalesReps(reps || []);
    } catch (error) {
      console.error('Error fetching sales reps:', error);
      toast.error('Failed to load sales reps');
    }
  };

  const syncAffiliateMetrics = async (silent: boolean = false) => {
    setSyncingMetrics(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-affiliatewp-metrics`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync metrics');
      }

      if (!silent) {
        toast.success('AffiliateWP metrics synced successfully');
      }

      if (profile?.id) {
        await loadCommissionsData(profile.id);
      }
    } catch (error) {
      console.error('Error syncing metrics:', error);
      toast.error('Failed to sync AffiliateWP metrics');
    } finally {
      setSyncingMetrics(false);
    }
  };

  const processPayouts = async () => {
    if (!selectedPayoutReps.length) {
      toast.error('Select at least one rep to process payout');
      return;
    }

    setProcessingPayout(true);
    try {
      const result = await supabaseService.processAffiliatePayouts(selectedPayoutReps);

      toast.success(`Successfully processed payouts for ${result.processedCount} reps`);

      if (profile?.id) {
        await loadCommissionsData(profile.id);
      }

      setSelectedPayoutReps([]);
    } catch (error) {
      console.error('Error processing payouts:', error);
      toast.error('Failed to process payouts');
    } finally {
      setProcessingPayout(false);
    }
  };

  const safeAffiliateCommissions = Array.isArray(affiliateCommissions)
    ? affiliateCommissions
    : [];

  const safeCommissions: Commission[] = Array.isArray(commissions)
    ? commissions
    : [];

  const getQuarterRange = (period: 'current_quarter' | 'last_quarter' | 'year') => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    let start: Date;
    let end: Date;

    if (period === 'current_quarter') {
      start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      end = new Date(now.getFullYear(), currentQuarter * 3, 0);
    } else if (period === 'last_quarter') {
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

  const filteredByPeriod = (() => {
    const { start, end } = getQuarterRange(filterPeriod);

    const dataToFilter = safeCommissions.length
      ? safeCommissions
      : safeAffiliateCommissions;

    if (!dataToFilter.length) return [];

    return dataToFilter.filter((commission) => {
      const date = new Date(commission.created_at || commission.date || new Date());
      return date >= start && date <= end;
    });
  })();

  const totals: CommissionTotals = (() => {
    if (!filteredByPeriod.length) {
      return {
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        approvedCommissions: 0,
        totalDeals: 0,
        avgCommission: 0
      };
    }

    let totalCommissions = 0;
    let paidCommissions = 0;
    let pendingCommissions = 0;
    let approvedCommissions = 0;
    let totalDeals = 0;

    filteredByPeriod.forEach((commission: any) => {
      const amount = Number(commission.amount || commission.earnings || 0);
      totalCommissions += amount;

      if (commission.status === 'paid') {
        paidCommissions += amount;
      } else if (commission.status === 'pending') {
        pendingCommissions += amount;
      } else if (commission.status === 'approved') {
        approvedCommissions += amount;
      }

      if (commission.deal_id || commission.deal) {
        totalDeals += 1;
      }
    });

    return {
      totalCommissions,
      paidCommissions,
      pendingCommissions,
      approvedCommissions,
      totalDeals,
      avgCommission: totalDeals ? totalCommissions / totalDeals : 0
    };
  })();

  const monthlyData: MonthlyDataPoint[] = (() => {
    const monthMap = new Map<string, { commissions: number; deals: number }>();

    filteredByPeriod.forEach((commission: any) => {
      const date = new Date(commission.created_at || commission.date || new Date());
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });

      const amount = Number(commission.amount || commission.earnings || 0);

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { commissions: 0, deals: 0 });
      }

      const current = monthMap.get(monthKey)!;
      current.commissions += amount;

      if (commission.deal_id || commission.deal) {
        current.deals += 1;
      }

      monthMap.set(monthKey, current);
    });

    const now = new Date();
    const result: MonthlyDataPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const data = monthMap.get(monthKey) || { commissions: 0, deals: 0 };
      result.push({
        month: monthKey,
        commissions: Math.round(data.commissions),
        deals: data.deals
      });
    }

    return result;
  })();

  // 🔥 FIX: protect .filter() + use filterStatus properly
  const filteredCommissions = safeCommissions.filter((commission) => {
    const matchesStatus =
      filterStatus === 'all' || commission.status === filterStatus;
    return matchesStatus;
  });

  useEffect(() => {
    const calculateRevenue = () => {
      const total = filteredCommissions.reduce((sum, commission) => {
        const amount = Number(commission.amount || commission.earnings || 0);
        return sum + amount;
      }, 0);
      setTotalRevenue(total);
    };

    calculateRevenue();
  }, [filteredCommissions]);

  if (loading) {
    return (
      <LoadingSpinner
        size="lg"
        text="Loading commission data..."
        className="h-64"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Commissions & Affiliate Performance
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Track commissions, payout status, and your reps’ AffiliateWP performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => syncAffiliateMetrics(false)}
            disabled={syncingMetrics}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" />
            {syncingMetrics ? 'Syncing...' : 'Sync AffiliateWP'}
          </button>

          <button
            onClick={processPayouts}
            disabled={processingPayout || !selectedPayoutReps.length}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {processingPayout ? 'Processing...' : 'Process Payouts'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
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

      {/* Charts + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                Commissions & Deals (Last 6 Months)
              </h2>
              <p className="text-xs text-gray-500">
                Performance over time based on AffiliateWP + CRM.
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
                    name === 'commissions' ? [`$${value}`, 'Commissions'] : [value, 'Deals']
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
              Period Filters
            </h2>
            <Calendar className="w-4 h-4 text-gray-500" />
          </div>

          <select
            value={filterPeriod}
            onChange={(e) =>
              setFilterPeriod(e.target.value as 'current_quarter' | 'last_quarter' | 'year')
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
                setFilterStatus(e.target.value as 'all' | 'pending' | 'approved' | 'paid')
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
              Based on commissions currently in view.
            </p>
          </div>
        </div>
      </div>

      {/* Rep / Overview Tabs */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="border-b px-4 pt-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('reps')}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'reps'
                  ? 'border-academy-blue-600 text-academy-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Rep Commissions
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-academy-blue-600 text-academy-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Affiliate Overview
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'reps' ? (
            <div className="space-y-4">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                        Rep
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                        Commissions
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                        Deals
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                        Select
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommissions.map((commission) => (
                      <tr key={commission.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {commission.rep?.company_name || 'Rep'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {commission.deal?.title || 'Affiliate Sale'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          ${Number(commission.amount || commission.earnings || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {commission.deal_id || commission.deal ? 1 : 0}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                              commission.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : commission.status === 'approved'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {commission.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="checkbox"
                            checked={selectedPayoutReps.includes(
                              String(commission.rep?.id || '')
                            )}
                            onChange={(e) => {
                              const id = String(commission.rep?.id || '');
                              setSelectedPayoutReps((prev) =>
                                e.target.checked
                                  ? [...new Set([...prev, id])]
                                  : prev.filter((x) => x !== id)
                              );
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredCommissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="border rounded-lg p-3 flex flex-col gap-2"
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {commission.rep?.company_name || 'Rep'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {commission.deal?.title || 'Affiliate Sale'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          ${Number(commission.amount || commission.earnings || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {commission.deal_id || commission.deal ? '1 deal' : 'No deal'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                          commission.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : commission.status === 'approved'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {commission.status || 'pending'}
                      </span>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={selectedPayoutReps.includes(
                            String(commission.rep?.id || '')
                          )}
                          onChange={(e) => {
                            const id = String(commission.rep?.id || '');
                            setSelectedPayoutReps((prev) =>
                              e.target.checked
                                ? [...new Set([...prev, id])]
                                : prev.filter((x) => x !== id)
                            );
                          }}
                        />
                        <span>Select for payout</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  AffiliateWP Performance Summary
                </h3>
                <p className="text-xs text-gray-600">
                  This section summarizes AffiliateWP-side performance, including unpaid
                  earnings and referral activity for your reps.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Affiliate Records</span>
                  <span className="font-medium">
                    {safeAffiliateCommissions.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Revenue from AffiliateWP</span>
                  <span className="font-semibold">
                    $
                    {safeAffiliateCommissions
                      .reduce(
                        (sum: number, c: any) =>
                          sum + Number(c.earnings || c.amount || 0),
                        0
                      )
                      .toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-xs border rounded-lg hover:bg-gray-50"
                onClick={() => syncAffiliateMetrics(false)}
                disabled={syncingMetrics}
              >
                <Download className="w-4 h-4" />
                {syncingMetrics ? 'Refreshing from AffiliateWP...' : 'Refresh Affiliate Data'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommissionsTracker;