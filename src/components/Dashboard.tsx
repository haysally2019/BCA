import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Activity,
  Phone,
  PhoneCall,
  MessageSquare,
  Calendar,
  ArrowUp,
  Target,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  Copy,
  CheckCheck,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { supabaseService, type AnalyticsData } from '../lib/supabaseService';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [chartData, setChartData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { profile, refreshProfile } = useAuthStore();
  const {
    analyticsData,
    dashboardLoading: loading,
    loadDashboardData
  } = useDataStore();

  useEffect(() => {
    if (profile) {
      console.log('[Dashboard] Profile loaded:', {
        id: profile.id,
        name: profile.full_name,
        affiliatewp_id: profile.affiliatewp_id,
        affiliate_referral_url: profile.affiliate_referral_url
      });
      loadDashboardData();
    }
  }, [profile, timeRange, loadDashboardData]);

  const copyAffiliateUrl = async () => {
    if (profile?.affiliate_referral_url) {
      try {
        await navigator.clipboard.writeText(profile.affiliate_referral_url);
        setCopied(true);
        toast.success('Affiliate URL copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy URL');
      }
    }
  };

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      toast.success('Profile data refreshed!');
    } catch (error) {
      toast.error('Failed to refresh profile');
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'add_lead':
        toast.success('Opening lead form...');
        break;
      case 'schedule_appointment':
        toast.success('Opening calendar...');
        break;
      case 'send_sms':
        toast.success('Opening SMS campaign...');
        break;
      case 'generate_report':
        toast.success('Generating report...');
        break;
      default:
        toast.info('Feature coming soon!');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Show affiliate URL even while loading */}
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
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
            <code className="flex-1 text-xs sm:text-sm text-gray-700 font-mono overflow-x-auto whitespace-nowrap">
              {profile?.affiliate_referral_url || 'https://bluecollaracademy.info/?ref=3'}
            </code>
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
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Use this URL when promoting Blue Collar Academy to track your referrals
          </p>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-academy-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="space-y-4">
        {/* Show affiliate URL even with no data */}
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
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
            <code className="flex-1 text-xs sm:text-sm text-gray-700 font-mono overflow-x-auto whitespace-nowrap">
              {profile?.affiliate_referral_url || 'https://bluecollaracademy.info/?ref=3'}
            </code>
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
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Use this URL when promoting Blue Collar Academy to track your referrals
          </p>
        </div>

        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Start adding leads to see your dashboard analytics.</p>
        </div>
      </div>
    );
  }

  // Calculate live affiliate metrics from profile
  const affiliateMetrics = {
    totalEarnings: (profile?.affiliatewp_earnings || 0) + (profile?.affiliatewp_unpaid_earnings || 0),
    paidEarnings: profile?.affiliatewp_earnings || 0,
    unpaidEarnings: profile?.affiliatewp_unpaid_earnings || 0,
    referrals: profile?.affiliatewp_referrals || 0,
    visits: profile?.affiliatewp_visits || 0,
    commissionRate: profile?.commission_rate || 0,
    lastSync: profile?.last_metrics_sync,
    hasSyncedData: profile?.last_metrics_sync !== null && profile?.last_metrics_sync !== undefined
  };

  const stats = [
    {
      title: 'Total Earnings',
      value: affiliateMetrics.hasSyncedData ? `$${affiliateMetrics.totalEarnings.toLocaleString()}` : 'Not synced',
      icon: DollarSign,
      color: 'bg-green-500',
      description: affiliateMetrics.hasSyncedData ? `${affiliateMetrics.commissionRate}% commission rate` : 'Sync metrics to see data'
    },
    {
      title: 'Paid Earnings',
      value: affiliateMetrics.hasSyncedData ? `$${affiliateMetrics.paidEarnings.toLocaleString()}` : 'Not synced',
      icon: CheckCircle,
      color: 'bg-emerald-500',
      description: affiliateMetrics.hasSyncedData ? 'From AffiliateWP' : 'Sync metrics to see data'
    },
    {
      title: 'Referrals',
      value: affiliateMetrics.hasSyncedData ? affiliateMetrics.referrals.toString() : 'Not synced',
      icon: Target,
      color: 'bg-purple-500',
      description: affiliateMetrics.hasSyncedData ? `${affiliateMetrics.visits} total visits` : 'Sync metrics to see data'
    },
    {
      title: 'Total Leads',
      value: analyticsData.totalLeads.toString(),
      icon: Users,
      color: 'bg-blue-500',
      description: `${analyticsData.totalLeads - Math.floor(analyticsData.totalLeads * 0.2)} active leads`
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-0.5 sm:mt-1">Welcome back! Here's what's happening with your roofing business.</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 touch-manipulation"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="hidden md:inline">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Sync Status Notice */}
      {!affiliateMetrics.hasSyncedData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">AffiliateWP Metrics Not Synced</h3>
              <p className="text-sm text-blue-800">
                Your commission metrics haven't been synced yet. Contact your manager or visit the Commissions tab to sync your AffiliateWP data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-2.5 sm:p-4 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <div className={`w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stat.value}</h3>
              <p className="text-gray-600 text-xs sm:text-sm mb-0.5 sm:mb-1 font-medium">{stat.title}</p>
              <p className="text-xs text-gray-500 hidden sm:block">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Debug Info - Remove after testing */}
      {profile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <p><strong>Debug - Profile Data:</strong></p>
            <button
              onClick={handleRefreshProfile}
              disabled={refreshing}
              className="flex items-center gap-1 px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p>Name: {profile.full_name}</p>
          <p>AffiliateWP ID: {profile.affiliatewp_id || 'Not set'}</p>
          <p>Affiliate URL: {profile.affiliate_referral_url || 'Not set'}</p>
        </div>
      )}

      {/* Affiliate URL Card - ALWAYS SHOW */}
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
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
          <code className="flex-1 text-xs sm:text-sm text-gray-700 font-mono overflow-x-auto whitespace-nowrap">
            {profile?.affiliate_referral_url || 'https://bluecollaracademy.info/?ref=3'}
          </code>
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
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Use this URL when promoting Blue Collar Academy to track your referrals
        </p>
        {!profile?.affiliate_referral_url && (
          <p className="mt-2 text-xs text-orange-600 font-medium">
            Note: Using default URL. Click the Refresh button above to load your actual URL.
          </p>
        )}
      </div>

      {/* Charts Row */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {/* Daily Activity Chart */}
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-5 lg:p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Daily Activity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="Leads" />
                <Line type="monotone" dataKey="calls" stroke="#10B981" strokeWidth={2} name="Calls" />
                <Line type="monotone" dataKey="revenue" stroke="#EF4444" strokeWidth={2} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Lead Sources Chart */}
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-5 lg:p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Lead Sources</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.leadSources}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity and Tasks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {analyticsData.recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              analyticsData.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-2.5 p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.success ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {activity.type === 'call' && <PhoneCall className="w-4 h-4 text-green-600" />}
                    {activity.type === 'sms' && <MessageSquare className="w-4 h-4 text-purple-600" />}
                    {activity.type === 'lead_created' && <Users className="w-4 h-4 text-blue-600" />}
                    {activity.type === 'appointment' && <Calendar className="w-4 h-4 text-emerald-600" />}
                    {activity.type === 'deal_created' && <Target className="w-4 h-4 text-red-600" />}
                    {activity.type === 'stage_change' && <TrendingUp className="w-4 h-4 text-orange-600" />}
                    {!['call', 'sms', 'lead_created', 'appointment', 'deal_created', 'stage_change'].includes(activity.type) && 
                      <Activity className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming tasks</p>
              </div>
            ) : (
              analyticsData.upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-2.5 p-2.5 sm:p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    task.priority === 'high' ? 'bg-red-500' : 
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{task.task}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-gray-500">Due in {task.due}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {[
            { title: 'Add Lead', icon: Users, color: 'bg-blue-500', action: 'add_lead' },
            { title: 'Schedule Appointment', icon: Calendar, color: 'bg-green-500', action: 'schedule_appointment' },
            { title: 'Send SMS Campaign', icon: MessageSquare, color: 'bg-purple-500', action: 'send_sms' },
            { title: 'Generate Report', icon: TrendingUp, color: 'bg-red-500', action: 'generate_report' }
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => handleQuickAction(action.action)}
                className="p-2.5 sm:p-3 lg:p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200 text-left touch-manipulation"
              >
                <div className={`w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 ${action.color} rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 lg:mb-3`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <h4 className="text-xs sm:text-sm lg:text-base font-medium text-gray-900">{action.title}</h4>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sales Performance Section */}
      <div className="bg-gradient-to-r from-academy-blue-900 via-academy-blue-800 to-academy-red-800 rounded-lg p-3 sm:p-5 lg:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold">Affiliate Performance</h3>
              <p className="text-xs text-academy-blue-100">Live metrics from AffiliateWP</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {affiliateMetrics.hasSyncedData ? (
              <>
                <Activity className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400">Synced</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-yellow-400">Not synced</span>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="text-center">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1">
              {affiliateMetrics.hasSyncedData ? `$${affiliateMetrics.totalEarnings.toLocaleString()}` : '-'}
            </div>
            <div className="text-academy-blue-100 text-xs">Total Earnings</div>
            <div className="text-xs text-green-400 mt-1 hidden sm:block">
              {affiliateMetrics.hasSyncedData ? 'Paid + Unpaid' : 'Not synced'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1">
              {affiliateMetrics.hasSyncedData ? `$${affiliateMetrics.paidEarnings.toLocaleString()}` : '-'}
            </div>
            <div className="text-academy-blue-100 text-xs">Paid Earnings</div>
            <div className="text-xs text-academy-blue-400 mt-1 hidden sm:block">
              {affiliateMetrics.hasSyncedData ? 'From AffiliateWP' : 'Not synced'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1">
              {affiliateMetrics.hasSyncedData ? affiliateMetrics.referrals.toString() : '-'}
            </div>
            <div className="text-academy-blue-100 text-xs">Total Referrals</div>
            <div className="text-xs text-green-400 mt-1 hidden sm:block">
              {affiliateMetrics.hasSyncedData ? `${affiliateMetrics.visits} visits` : 'Not synced'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1">
              {affiliateMetrics.hasSyncedData ? `${affiliateMetrics.commissionRate}%` : '-'}
            </div>
            <div className="text-academy-blue-100 text-xs">Commission Rate</div>
            <div className="text-xs text-green-400 mt-1 hidden sm:block">
              {affiliateMetrics.hasSyncedData ? 'Current rate' : 'Not synced'}
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      {analyticsData.conversionFunnel.length > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-5 lg:p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Lead Conversion Funnel</h3>
          <div className="space-y-4">
            {analyticsData.conversionFunnel.map((stage, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-24 text-sm text-gray-600 font-medium">{stage.stage}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                  <div 
                    className="bg-academy-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${stage.percentage}%` }}
                  ></div>
                </div>
                <div className="w-16 text-sm font-medium text-gray-900">{stage.count}</div>
                <div className="w-12 text-sm text-gray-500">{stage.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;