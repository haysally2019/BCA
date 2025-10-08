import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Phone, 
  MessageSquare, 
  DollarSign,
  Award,
  Calendar,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabaseService, type AnalyticsData } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [profile, timeRange]);

  const fetchAnalytics = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      const [analytics, charts] = await Promise.all([
        supabaseService.getAnalyticsData(profile.id, timeRange),
        supabaseService.getChartData(profile.id, timeRange)
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-500">Start generating leads and making calls to see analytics.</p>
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
            title: 'Total Leads',
            value: analyticsData.totalLeads.toLocaleString(),
            icon: Users,
            color: 'bg-blue-500'
          },
          {
            title: 'Call Success Rate',
            value: `${analyticsData.callSuccessRate}%`,
            icon: Phone,
            color: 'bg-green-500'
          },
          {
            title: 'SMS Response Rate',
            value: `${analyticsData.smsResponseRate}%`,
            icon: MessageSquare,
            color: 'bg-purple-500'
          },
          {
            title: 'Total Revenue',
            value: `$${analyticsData.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'bg-emerald-500'
          },
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

      {/* Charts Grid */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Daily Activity Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Daily Activity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="Leads" />
                <Line type="monotone" dataKey="calls" stroke="#10B981" strokeWidth={2} name="Calls" />
                <Line type="monotone" dataKey="revenue" stroke="#EF4444" strokeWidth={2} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Lead Sources */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Lead Sources</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData.leadSources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.leadSources.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Lead Conversion Funnel</h3>
            <div className="space-y-3 md:space-y-4">
              {analyticsData.conversionFunnel.map((stage, index) => (
                <div key={index} className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-4">
                  <div className="w-full md:w-24 text-xs md:text-sm font-medium md:font-normal text-gray-900 md:text-gray-600">{stage.stage}</div>
                  <div className="flex items-center space-x-3 md:space-x-4 md:flex-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                      <div
                        className="bg-academy-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${stage.percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-12 md:w-16 text-sm font-medium text-gray-900">{stage.count}</div>
                    <div className="w-12 text-sm text-gray-500">{stage.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call Performance */}
          {chartData.callOutcomes.length > 0 && (
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Call Outcomes</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.callOutcomes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="outcome" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Performance Insights */}
      <div className="bg-gradient-to-r from-academy-blue-600 to-academy-blue-700 rounded-xl p-4 md:p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold">Performance Insights</h3>
          <Award className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="text-center py-3 md:py-0">
            <div className="text-2xl md:text-3xl font-bold mb-1">{analyticsData.conversionRate}%</div>
            <div className="text-academy-blue-100 text-xs md:text-sm">Lead Conversion Rate</div>
          </div>
          <div className="text-center py-3 md:py-0">
            <div className="text-2xl md:text-3xl font-bold mb-1">${analyticsData.avgDealSize.toLocaleString()}</div>
            <div className="text-academy-blue-100 text-xs md:text-sm">Average Deal Size</div>
          </div>
          <div className="text-center py-3 md:py-0">
            <div className="text-2xl md:text-3xl font-bold mb-1">${analyticsData.pipelineValue.toLocaleString()}</div>
            <div className="text-academy-blue-100 text-xs md:text-sm">Pipeline Value</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;