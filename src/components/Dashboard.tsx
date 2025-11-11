import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
  Copy,
  CheckCheck,
  RefreshCw,
  ArrowUp
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface PerformanceDatum {
  label: string;
  earnings: number;
  referrals: number;
  visits: number;
  unpaid: number;
}

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { profile, refreshProfile } = useAuthStore();
  const {
    affiliateDashboard,
    dashboardLoading: loading,
    loadDashboardData
  } = useDataStore();

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
  }, [profile, timeRange, loadDashboardData]);

  useEffect(() => {
    if (!profile?.affiliatewp_id) return;

    const shouldAutoSync =
      !profile.last_metrics_sync ||
      Date.now() - new Date(profile.last_metrics_sync).getTime() > 24 * 60 * 60 * 1000;

    if (shouldAutoSync) {
      void syncAffiliateMetricsQuietly();
    }
  }, [profile?.affiliatewp_id, profile?.last_metrics_sync]);

  const syncAffiliateMetricsQuietly = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-affiliatewp-metrics');

      if (!error && data?.success) {
        await refreshProfile();
        if (profile) {
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
        }
      }
    } catch (error) {
      console.log('[Dashboard] Auto-sync failed silently:', error);
    }
  };

  const copyAffiliateUrl = async () => {
    if (!profile?.affiliate_referral_url) return;

    try {
      await navigator.clipboard.writeText(profile.affiliate_referral_url);
      setCopied(true);
      toast.success('Affiliate URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      toast.success('Profile data refreshed!');
      if (profile) {
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
      }
    } catch (error) {
      toast.error('Failed to refresh profile');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSync = async () => {
    if (!profile?.affiliatewp_id) {
      toast.error('No AffiliateWP account detected.');
      return;
    }

    setSyncing(true);
    toast.loading('Syncing AffiliateWP metrics...', { id: 'affiliate-sync' });
    try {
      const { data, error } = await supabase.functions.invoke('fetch-affiliatewp-metrics');
      if (error) {
        throw error;
      }

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
      toast.success('Affiliate metrics synced!', { id: 'affiliate-sync' });
    } catch (error: any) {
      console.error('Error syncing AffiliateWP metrics:', error);
      toast.error(error?.message || 'Failed to sync metrics', { id: 'affiliate-sync' });
    } finally {
      setSyncing(false);
    }
  };

  const performanceData: PerformanceDatum[] = useMemo(() => {
    if (!affiliateDashboard?.performance?.length) return [];

    return affiliateDashboard.performance.map((point) => ({
      label: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      earnings: point.earnings,
      referrals: point.referrals,
      visits: point.visits,
      unpaid: point.unpaid_earnings,
    }));
  }, [affiliateDashboard?.performance]);

  const overview = affiliateDashboard?.overview || {
    totalEarnings: 0,
    paidEarnings: 0,
    unpaidEarnings: 0,
    referrals: 0,
    visits: 0,
    conversionRate: 0,
    commissionRate: 0,
  };

  const lastSync = affiliateDashboard?.syncStatus.lastSync
    ? new Date(affiliateDashboard.syncStatus.lastSync)
    : null;
  const minutesSinceSync = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : null;

  const referralFeed = affiliateDashboard?.referralFeed ?? [];
  const payoutQueue = affiliateDashboard?.payoutQueue ?? [];

  const hasAffiliateAccount = Boolean(profile?.affiliatewp_id);

  const renderAffiliateUrlCard = () => (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 shadow-sm border border-red-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Affiliate URL</h3>
            <p className="text-xs sm:text-sm text-gray-600">Share this link to track referrals and earn commissions</p>
          </div>
        </div>
        {profile?.affiliate_referral_url && (
          <button
            onClick={handleRefreshProfile}
            className="flex items-center gap-1 text-xs sm:text-sm text-red-600 hover:text-red-700"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
        <code className="flex-1 text-xs sm:text-sm text-gray-700 font-mono overflow-x-auto whitespace-nowrap">
          {profile?.affiliate_referral_url || 'Affiliate account pending creation'}
        </code>
        {profile?.affiliate_referral_url && (
          <button
            onClick={copyAffiliateUrl}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <CheckCheck className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5 text-gray-600" />
            )}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Use this URL when promoting Blue Collar Academy to track your referrals.
      </p>
      {!profile?.affiliate_referral_url && (
        <p className="mt-2 text-xs text-orange-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          Your affiliate account is being set up. Metrics will appear once the account is ready.
        </p>
      )}
    </div>
  );

  if (loading && !affiliateDashboard) {
    return (
      <div className="space-y-4">
        {renderAffiliateUrlCard()}
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-academy-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!hasAffiliateAccount) {
    return (
      <div className="space-y-4">
        {renderAffiliateUrlCard()}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Affiliate account not linked</h3>
              <p className="text-sm text-gray-600 mt-1">
                Connect your AffiliateWP account to start tracking referrals, earnings, and payouts directly from your dashboard.
              </p>
              <button
                onClick={handleRefreshProfile}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-academy-blue-600 text-white text-sm font-medium hover:bg-academy-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Refresh status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Earnings',
      value: `$${overview.totalEarnings.toLocaleString()}`,
      change: `Paid $${overview.paidEarnings.toLocaleString()}`,
      icon: DollarSign,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Pending Payouts',
      value: `$${overview.unpaidEarnings.toLocaleString()}`,
      change: `${payoutQueue.length} payouts queued`,
      icon: Clock,
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Referrals',
      value: overview.referrals.toLocaleString(),
      change: `${overview.conversionRate.toFixed(1)}% conversion`,
      icon: Users,
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Commission Rate',
      value: `${overview.commissionRate.toFixed(1)}%`,
      change: `${overview.visits.toLocaleString()} visits`,
      icon: TrendingUp,
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600',
    },
  ];

  const syncStatusSeverity = minutesSinceSync !== null && minutesSinceSync > 180 ? 'stale' : 'fresh';

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {renderAffiliateUrlCard()}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Affiliate Performance</h1>
            <p className="text-sm text-gray-600">Real-time metrics from your AffiliateWP account</p>
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

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div key={card.title} className={`rounded-lg p-4 ${card.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-medium text-gray-500 tracking-wider">{card.title}</p>
                  <p className="text-xl font-semibold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.iconBg} ${card.iconColor} w-10 h-10 rounded-full flex items-center justify-center`}>
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
                <h2 className="text-lg font-semibold text-gray-900">Performance Trends</h2>
                <p className="text-sm text-gray-600">Track visits, referrals, and earnings over time</p>
              </div>
            </div>
            {performanceData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" stroke="#6B7280" fontSize={12} tickLine={false} dy={10} />
                    <YAxis
                      yAxisId="left"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '0.75rem', borderColor: '#E5E7EB' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'earnings' || name === 'unpaid') {
                          return [`$${value.toLocaleString()}`, name === 'earnings' ? 'Earnings' : 'Unpaid'];
                        }
                        return [value.toLocaleString(), name === 'referrals' ? 'Referrals' : 'Visits'];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      name="earnings"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      yAxisId="left"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="unpaid"
                      name="unpaid"
                      stroke="#f97316"
                      strokeWidth={2}
                      yAxisId="left"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="referrals"
                      name="referrals"
                      stroke="#22c55e"
                      strokeWidth={2}
                      yAxisId="right"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="visits"
                      name="visits"
                      stroke="#a855f7"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      yAxisId="right"
                      dot={false}
                    />
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Latest Referrals</h2>
                <p className="text-sm text-gray-600">Recent AffiliateWP referrals pulled from the webhook feed</p>
              </div>
            </div>
            {referralFeed.length > 0 ? (
              <div className="space-y-3">
                {referralFeed.slice(0, 8).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{referral.description || 'New referral'}</p>
                      <p className="text-xs text-gray-500">
                        {referral.status?.toUpperCase() || 'PENDING'} · {new Date(referral.created_at || '').toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">${Number(referral.amount || 0).toLocaleString()}</p>
                      {referral.origin_url && (
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{referral.origin_url}</p>
                      )}
                    </div>
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
                <p className="text-sm text-gray-600">Last AffiliateWP data sync</p>
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Payout queue</h2>
                <p className="text-sm text-gray-600">Affiliate commissions awaiting payment</p>
              </div>
            </div>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic mix</h2>
            {performanceData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" stroke="#6B7280" fontSize={12} tickLine={false} dy={10} />
                    <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '0.75rem', borderColor: '#E5E7EB' }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Bar dataKey="visits" name="Visits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="referrals" name="Referrals" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No traffic data available yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
