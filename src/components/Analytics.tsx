import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Activity,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { supabaseService, type AnalyticsData } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

type AffiliateChartData = {
  referralTrends: Array<{ date: string; referrals: number; paidEarnings: number; unpaidEarnings: number }>;
  commissionStatusBreakdown: Array<{ status: string; amount: number; count: number }>;
  topCreatives: Array<{ name: string; referrals: number; earnings: number }>;
};

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<AffiliateChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [profile, timeRange]);

  const fetchAnalytics = async () => {
    if (!profile || !profile.company_id) return;

    try {
      setLoading(true);

      const [analytics, charts] = await Promise.all([
        supabaseService.getAnalyticsData(profile.company_id, timeRange),
        supabaseService.getChartData(profile.company_id, timeRange)
      ]);

      setAnalyticsData(analytics);
      setChartData({
        referralTrends: charts.referralTrends?.length ? charts.referralTrends : analytics.referralTrends,
        commissionStatusBreakdown: charts.commissionStatusBreakdown?.length ? charts.commissionStatusBreakdown : analytics.commissionStatusBreakdown,
        topCreatives: charts.topCreatives?.length ? charts.topCreatives : analytics.topCreatives,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error loading AffiliateWP analytics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-academy-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No AffiliateWP Analytics</h3>
        <p className="text-gray-500">Sync your AffiliateWP account to start tracking referral performance.</p>
      </div>
    );
  }

  const affiliateOverview = analyticsData.affiliateOverview || {
    paidEarnings: 0,
    unpaidEarnings: 0,
    totalReferrals: 0,
    totalVisits: 0,
    visitToSignupRate: 0,
    averageCommission: 0
  };

  const metrics = [
    {
      title: 'Paid Earnings',
      value: `$${affiliateOverview.paidEarnings.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-emerald-500'
    },
    {
      title: 'Unpaid Earnings',
      value: `$${affiliateOverview.unpaidEarnings.toLocaleString()}`,
      icon: Clock,
      color: 'bg-amber-500'
    },
    {
      title: 'Total Referrals',
      value: affiliateOverview.totalReferrals.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Visit-to-Signup Rate',
      value: `${affiliateOverview.visitToSignupRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      title: 'Average Commission',
      value: `$${affiliateOverview.averageCommission.toLocaleString()}`,
      icon: Activity,
      color: 'bg-indigo-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">AffiliateWP Analytics</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="w-full md:w-auto border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500 min-h-[44px]"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 ${metric.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
              <p className="text-gray-600 text-sm">{metric.title}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Referral Trends</h3>
          {chartData?.referralTrends?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData.referralTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="referrals" width={50} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="earnings"
                  orientation="right"
                  tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number | string, name: string) =>
                    name.includes('Earnings')
                      ? `$${Number(value).toLocaleString()}`
                      : Number(value).toLocaleString()
                  }
                />
                <Line yAxisId="referrals" type="monotone" dataKey="referrals" stroke="#3B82F6" strokeWidth={2} dot={false} name="Referrals" />
                <Line yAxisId="earnings" type="monotone" dataKey="paidEarnings" stroke="#10B981" strokeWidth={2} dot={false} name="Paid Earnings" />
                <Line yAxisId="earnings" type="monotone" dataKey="unpaidEarnings" stroke="#F59E0B" strokeWidth={2} dot={false} name="Unpaid Earnings" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500">No referral activity recorded for this time range.</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Commission Status</h3>
          {chartData?.commissionStatusBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartData.commissionStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, amount }) => (amount > 0 ? `${status}: $${amount.toLocaleString()}` : '')}
                  outerRadius={90}
                  dataKey="amount"
                >
                  {chartData.commissionStatusBreakdown.map((entry, index) => (
                    <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | string, name: string, payload: any) => {
                    const entry = payload && payload.payload;
                    if (name === 'amount' && entry) {
                      return [`$${Number(value).toLocaleString()}`, `${entry.status} (${entry.count} referrals)`];
                    }
                    return value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500">No commission payouts recorded for this period.</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Top Referring Creatives</h3>
          {chartData?.topCreatives?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.topCreatives} layout="vertical" margin={{ left: 0, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => Number(value).toLocaleString()} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={160} />
                <Tooltip
                  formatter={(value: number | string, name: string, payload: any) => {
                    if (!payload) return value;
                    const { earnings } = payload.payload;
                    if (name === 'referrals') {
                      return [Number(value).toLocaleString(), `${payload.payload.name}`];
                    }
                    return [`$${Number(earnings).toLocaleString()}`, 'Total Earnings'];
                  }}
                  contentStyle={{ borderRadius: '0.75rem', borderColor: '#E5E7EB' }}
                />
                <Bar dataKey="referrals" fill="#6366F1" radius={[0, 8, 8, 0]}>
                  <LabelList
                    dataKey="earnings"
                    position="right"
                    formatter={(value: number) => `$${Number(value).toLocaleString()}`}
                    className="fill-gray-700 text-xs"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500">No creative performance data available for this time range.</p>
          )}
        </div>
      </div>

      {/* Affiliate Performance Insights */}
      <div className="bg-gradient-to-r from-academy-blue-600 to-academy-blue-700 rounded-xl p-4 md:p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold">Affiliate Performance Insights</h3>
          <Award className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="text-center py-3 md:py-0">
            <div className="text-2xl md:text-3xl font-bold mb-1">{affiliateOverview.totalReferrals.toLocaleString()}</div>
            <div className="text-academy-blue-100 text-xs md:text-sm">Referrals in Range</div>
          </div>
          <div className="text-center py-3 md:py-0">
            <div className="text-2xl md:text-3xl font-bold mb-1">${affiliateOverview.averageCommission.toLocaleString()}</div>
            <div className="text-academy-blue-100 text-xs md:text-sm">Average Commission</div>
          </div>
          <div className="text-center py-3 md:py-0">
            <div className="text-2xl md:text-3xl font-bold mb-1">{affiliateOverview.visitToSignupRate.toFixed(1)}%</div>
            <div className="text-academy-blue-100 text-xs md:text-sm">Visit-to-Signup Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
