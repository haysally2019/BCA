import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  PiggyBank,
  Award,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  Globe
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabaseService, type AnalyticsData, type AffiliateChartData } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

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
      setChartData(charts);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Affiliate Metrics</h3>
        <p className="text-gray-500">Connect your AffiliateWP account to start tracking performance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics</h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          {
            title: 'Total Earnings',
            value: `$${analyticsData.totalEarnings.toLocaleString()}`,
            icon: DollarSign,
            color: 'bg-emerald-500'
          },
          {
            title: 'Unpaid Earnings',
            value: `$${analyticsData.unpaidEarnings.toLocaleString()}`,
            icon: PiggyBank,
            color: 'bg-orange-500'
          },
          {
            title: 'Total Referrals',
            value: analyticsData.totalReferrals.toLocaleString(),
            icon: Users,
            color: 'bg-blue-500'
          },
          {
            title: 'Conversion Rate',
            value: `${analyticsData.conversionRate}%`,
            icon: TrendingUp,
            color: 'bg-purple-500'
          }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
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

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[ 
          {
            title: 'Average Referral Value',
            value: `$${analyticsData.avgReferralValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            subtitle: 'Across selected period',
            icon: BarChart3
          },
          {
            title: 'Total Visits',
            value: analyticsData.totalVisits.toLocaleString(),
            subtitle: 'Affiliate link traffic',
            icon: Globe
          },
          {
            title: 'Unique Visits',
            value: analyticsData.uniqueVisits.toLocaleString(),
            subtitle: 'Distinct visitors',
            icon: Activity
          },
          {
            title: 'Payout Cadence',
            value: analyticsData.payoutCadence,
            subtitle: analyticsData.lastPayoutDate ? `Last payout ${new Date(analyticsData.lastPayoutDate).toLocaleDateString()}` : 'No payouts recorded',
            icon: Clock
          }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
              <p className="text-gray-500 text-sm">{metric.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Referrals Over Time */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Referrals & Visits Over Time</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData.referralsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="referrals" stroke="#3B82F6" strokeWidth={2} name="Referrals" />
                <Line yAxisId="left" type="monotone" dataKey="visits" stroke="#10B981" strokeWidth={2} name="Visits" />
                <Line yAxisId="right" type="monotone" dataKey="earnings" stroke="#F59E0B" strokeWidth={2} name="Earnings ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payout Status Breakdown */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Payout Status Breakdown</h3>
              <PieChartIcon className="w-5 h-5 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData.payoutStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => (count > 0 ? `${status}: ${count}` : '')}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.payoutStatusBreakdown.map((entry, index) => (
                    <Cell key={`payout-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, _name, payload) => [`${value}`, payload.payload.status]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Referral Status Table */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Referral Status Summary</h3>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {analyticsData.referralStatusBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500">No referrals recorded for the selected period.</p>
              ) : (
                analyticsData.referralStatusBreakdown.map((status, index) => (
                  <div key={index} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{status.status}</p>
                      <p className="text-xs text-gray-500">{status.count} referrals</p>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">${status.amount.toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Campaigns */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Top Campaigns</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData.topCampaigns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip formatter={(value: any, key: string) => key === 'earnings' ? [`$${Number(value).toLocaleString()}`, 'Earnings'] : [value, 'Referrals']} />
                <Legend />
                <Bar dataKey="referrals" fill="#3B82F6" name="Referrals" />
                <Bar dataKey="earnings" fill="#F59E0B" name="Earnings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Referrals */}
      <div className="bg-gradient-to-r from-academy-blue-600 to-academy-blue-700 rounded-xl p-4 md:p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold">Recent Referrals</h3>
          <Award className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div className="space-y-3">
          {analyticsData.recentReferrals.length === 0 ? (
            <p className="text-sm text-blue-100">No referral activity recorded for this period.</p>
          ) : (
            analyticsData.recentReferrals.map(referral => (
              <div key={referral.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white/10 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">${referral.amount.toLocaleString()}</p>
                  <p className="text-xs text-blue-100">{referral.description || referral.origin_url || 'Direct referral'}</p>
                </div>
                <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/20">{referral.status}</span>
                  <span className="text-xs text-blue-100">{new Date(referral.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;