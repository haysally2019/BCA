import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  BarChart3,
  ArrowUp
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { supabase } from '../lib/supabaseClient';
import { supabaseService } from '../lib/supabaseService';
import toast from 'react-hot-toast';

const AgencyDashboard: React.FC = () => {
  const { profile, refreshProfile } = useAuthStore();
  const {
    affiliateDashboard,
    dashboardLoading: loading,
    loadDashboardData
  } = useDataStore();
  const [timeRange, setTimeRange] = useState('30d');
  const [totalSalesReps, setTotalSalesReps] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadSalesRepsCount = useCallback(async () => {
    if (!profile) return;

    try {
      const count = await supabaseService.getSalesRepsCount(profile.id);
      setTotalSalesReps(count);
    } catch (error) {
      console.error('Error loading sales reps count:', error);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    loadDashboardData(
      {
        id: profile.id,
        affiliatewp_id: profile.affiliatewp_id,
        affiliatewp_earnings: profile.affiliatewp_earnings,
        affiliatewp_unpaid_earnings: profile.affiliatewp_unpaid_earnings,
        affiliatewp_referrals: profile.affiliatewp_referrals,
        affiliatewp_visits: profile.affiliatewp_visits,
        commission_rate: profile.commission_rate,
        last_metrics_sync: profile.last_metrics_sync,
      },
      timeRange
    );
    void loadSalesRepsCount();
  }, [profile, timeRange, loadDashboardData, loadSalesRepsCount]);

  const handleSync = async () => {
    if (!profile?.affiliatewp_id) {
      toast.error('No AffiliateWP account detected for your organization.');
      return;
    }

    setSyncing(true);
    toast.loading('Syncing AffiliateWP metrics...', { id: 'agency-affiliate-sync' });
    try {
      const { data, error } = await supabase.functions.invoke('fetch-affiliatewp-metrics');
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Sync failed');
      }

      await refreshProfile();
      await loadDashboardData(
        {
          id: profile.id,
          affiliatewp_id: profile.affiliatewp_id,
          affiliatewp_earnings: profile.affiliatewp_earnings,
          affiliatewp_unpaid_earnings: profile.affiliatewp_unpaid_earnings,
          affiliatewp_referrals: profile.affiliatewp_referrals,
          affiliatewp_visits: profile.affiliatewp_visits,
          commission_rate: profile.commission_rate,
          last_metrics_sync: profile.last_metrics_sync,
        },
        timeRange,
        true
      );
      toast.success('Affiliate metrics synced!', { id: 'agency-affiliate-sync' });
    } catch (error: any) {
      console.error('Error syncing AffiliateWP metrics:', error);
      toast.error(error?.message || 'Failed to sync metrics', { id: 'agency-affiliate-sync' });
    } finally {
      setSyncing(false);
    }
  };

  const overview = affiliateDashboard?.overview || {
    totalEarnings: 0,
    paidEarnings: 0,
    unpaidEarnings: 0,
    referrals: 0,
    visits: 0,
    conversionRate: 0,
    commissionRate: 0,
  };

  const performanceData = useMemo(() => {
    return (affiliateDashboard?.performance || []).map((point) => ({
      label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      earnings: point.earnings,
      referrals: point.referrals,
      visits: point.visits,
    }));
  }, [affiliateDashboard?.performance]);

  const referralFeed = affiliateDashboard?.referralFeed ?? [];
  const payoutQueue = affiliateDashboard?.payoutQueue ?? [];

  const lastSync = affiliateDashboard?.syncStatus.lastSync
    ? new Date(affiliateDashboard.syncStatus.lastSync)
    : null;
  const minutesSinceSync = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : null;
  const syncStatusSeverity = minutesSinceSync !== null && minutesSinceSync > 180 ? 'stale' : 'fresh';

  if (loading && !affiliateDashboard) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-academy-blue-600"></div>
      </div>
    );
  }

  if (!profile?.affiliatewp_id) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Affiliate account not linked</h3>
            <p className="text-sm text-gray-600 mt-1">
              Connect your AffiliateWP account to activate agency-level analytics and payout monitoring.
            </p>
            <button
              onClick={handleSync}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-academy-blue-600 text-white text-sm font-medium hover:bg-academy-blue-700"
            >
              <RefreshCw className="w-4 h-4" /> Sync setup status
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total earnings',
      value: `$${overview.totalEarnings.toLocaleString()}`,
      change: `Paid $${overview.paidEarnings.toLocaleString()}`,
      icon: DollarSign,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Pending payouts',
      value: `$${overview.unpaidEarnings.toLocaleString()}`,
      change: `${payoutQueue.length} payouts queued`,
      icon: Clock,
      accent: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Referrals',
      value: overview.referrals.toLocaleString(),
      change: `${overview.conversionRate.toFixed(1)}% conversion`,
      icon: Users,
      accent: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Team members',
      value: totalSalesReps.toString(),
      change: `${overview.visits.toLocaleString()} visits tracked`,
      icon: BarChart3,
      accent: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  const secondaryCards = [
    {
      title: 'Commission rate',
      value: `${overview.commissionRate.toFixed(1)}%`,
      change: 'Weighted average across reps',
      icon: TrendingUp,
    },
    {
      title: 'Pending queue',
      value: payoutQueue.length.toString(),
      change: 'Commissions awaiting review',
      icon: Clock,
    },
    {
      title: 'Last sync',
      value: lastSync ? lastSync.toLocaleString() : 'Never',
      change: minutesSinceSync !== null ? `${minutesSinceSync} minutes ago` : 'Not yet synced',
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Agency performance overview</h1>
            <p className="text-sm text-gray-600">Monitor your affiliate revenue engine and payout pipeline</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync metrics
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div key={card.title} className={`rounded-lg p-4 ${card.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-medium text-gray-500 tracking-wider">{card.title}</p>
                  <p className="text-xl font-semibold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/60 ${card.accent}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                {card.change}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Network performance</h2>
                <p className="text-sm text-gray-600">Aggregate AffiliateWP metrics across the agency</p>
              </div>
            </div>
            {performanceData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" stroke="#6B7280" fontSize={12} tickLine={false} dy={10} />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '0.75rem', borderColor: '#E5E7EB' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'earnings') {
                          return [`$${value.toLocaleString()}`, 'Earnings'];
                        }
                        return [value.toLocaleString(), name === 'referrals' ? 'Referrals' : 'Visits'];
                      }}
                    />
                    <Line type="monotone" dataKey="earnings" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="referrals" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="visits" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-gray-500">
                <span>No performance data available for this period.</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Referral feed</h2>
            {referralFeed.length > 0 ? (
              <div className="space-y-3">
                {referralFeed.slice(0, 10).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{referral.description || 'New referral'}</p>
                      <p className="text-xs text-gray-500">
                        {referral.status?.toUpperCase() || 'PENDING'} · {new Date(referral.created_at || '').toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">${Number(referral.amount || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No referrals have been recorded yet.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sync status</h2>
                <p className="text-sm text-gray-600">AffiliateWP data freshness</p>
              </div>
              <div className={`flex items-center gap-2 text-sm ${syncStatusSeverity === 'stale' ? 'text-amber-600' : 'text-emerald-600'}`}>
                {syncStatusSeverity === 'stale' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                {syncStatusSeverity === 'stale' ? 'Needs attention' : 'Up to date'}
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              {lastSync ? (
                <>
                  <p className="text-sm font-medium text-gray-900">{lastSync.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Synced {minutesSinceSync} minute{minutesSinceSync === 1 ? '' : 's'} ago
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">No sync has been recorded yet.</p>
              )}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-academy-blue-600 text-white text-sm font-medium hover:bg-academy-blue-700 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync now
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout queue</h2>
            {payoutQueue.length > 0 ? (
              <div className="space-y-3">
                {payoutQueue.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="bg-gray-50 rounded-lg px-3 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{entry.customer_name}</p>
                      <span className="text-xs font-semibold uppercase text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                        {entry.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600">${entry.commission_amount.toLocaleString()}</span>
                      <span className="text-gray-500">{new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No pending payouts. Great job staying current!</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Operations summary</h2>
            <div className="grid grid-cols-1 gap-3">
              {secondaryCards.map((card) => (
                <div key={card.title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <card.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                    <p className="text-base text-gray-800">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.change}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyDashboard;
