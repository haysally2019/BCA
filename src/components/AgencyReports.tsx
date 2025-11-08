import React, { useState, useEffect } from 'react';
import {
  Download,
  DollarSign,
  Target,
  Award,
  TrendingUp
} from 'lucide-react';
import { supabaseService, type AnalyticsData } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const AgencyReports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [profile, selectedPeriod]);

  const fetchAnalytics = async () => {
    if (!profile) {
      console.log('No profile available');
      setLoading(false);
      return;
    }

    const companyId = profile.company_id || profile.id;
    console.log('Fetching analytics:', {
      profileId: profile.id,
      companyId,
      usingFallback: !profile.company_id
    });

    try {
      setLoading(true);
      const timeRange = selectedPeriod === 'current_month' || selectedPeriod === 'last_month' ? '30d' :
                       selectedPeriod === 'current_quarter' || selectedPeriod === 'last_quarter' ? '90d' : '90d';
      const analytics = await supabaseService.getAnalyticsData(companyId, timeRange);
      console.log('Analytics loaded:', analytics);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'csv' | 'excel') => {
    if (!analyticsData) {
      toast.error('No data to export');
      return;
    }

    try {
      toast.info(`Generating ${format.toUpperCase()} report...`);

      if (format === 'csv') {
        const csvData = [
          ['Metric', 'Value'],
          ['Total Revenue', `$${analyticsData.totalRevenue.toLocaleString()}`],
          ['Active Deals', analyticsData.totalDeals.toString()],
          ['Pipeline Value', `$${analyticsData.pipelineValue.toLocaleString()}`],
          ['Conversion Rate', `${analyticsData.conversionRate}%`],
          ['Total Leads', analyticsData.totalLeads.toString()],
          ['Total Appointments', analyticsData.totalAppointments.toString()],
          ['Average Deal Size', `$${analyticsData.avgDealSize.toLocaleString()}`],
          ['Call Success Rate', `${analyticsData.callSuccessRate}%`],
          ['SMS Response Rate', `${analyticsData.smsResponseRate}%`],
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success('CSV report downloaded successfully');
      } else {
        toast.info(`${format.toUpperCase()} export coming soon`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Generate insights and track performance</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500 min-h-[44px]"
          >
            <option value="current_month">Current Month</option>
            <option value="last_month">Last Month</option>
            <option value="current_quarter">Current Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="ytd">Year to Date</option>
          </select>
          <button
            onClick={() => exportReport('csv')}
            className="w-full sm:w-auto bg-green-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span className="sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-academy-blue-600"></div>
          </div>
        ) : analyticsData ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { title: 'Total Revenue', value: `$${analyticsData.totalRevenue.toLocaleString()}`, change: `${analyticsData.conversionRate}%`, icon: DollarSign, color: 'bg-green-500' },
                { title: 'Active Deals', value: analyticsData.totalDeals.toString(), change: `${analyticsData.totalLeads} leads`, icon: Target, color: 'bg-blue-500' },
                { title: 'Pipeline Value', value: `$${analyticsData.pipelineValue.toLocaleString()}`, change: `${analyticsData.totalAppointments} appts`, icon: Award, color: 'bg-purple-500' },
                { title: 'Conversion Rate', value: `${analyticsData.conversionRate}%`, change: `$${analyticsData.avgDealSize} avg`, icon: TrendingUp, color: 'bg-emerald-500' }
              ].map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 ${metric.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <span className="text-xs md:text-sm font-medium text-gray-600">{metric.change}</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                    <p className="text-gray-600 text-sm">{metric.title}</p>
                  </div>
                );
              })}
            </div>



            {/* Performance Breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Performance Breakdown</h3>
              <div className="space-y-4">
                {analyticsData.conversionFunnel.map((stage, index) => (
                  <div key={index} className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-4">
                    <div className="w-full md:w-32 text-xs md:text-sm font-medium md:font-normal text-gray-900 md:text-gray-600">{stage.stage}</div>
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

            {/* Lead Sources */}
            {analyticsData.leadsBySource.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Lead Sources Distribution</h3>
                <div className="space-y-3">
                  {analyticsData.leadsBySource.map((source, index) => {
                    const total = analyticsData.leadsBySource.reduce((sum, s) => sum + s.count, 0);
                    const percentage = total > 0 ? Math.round((source.count / total) * 100) : 0;
                    return (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-28 text-sm text-gray-600 capitalize">{source.source}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5 relative">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="w-16 text-sm font-medium text-gray-900 text-right">{source.count}</div>
                        <div className="w-12 text-sm text-gray-500 text-right">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Revenue Trend */}
            {analyticsData.revenueByMonth.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Revenue by Month</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analyticsData.revenueByMonth.map((month, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">{month.month}</div>
                      <div className="text-lg md:text-xl font-bold text-gray-900">${month.revenue.toLocaleString()}</div>
                      <div className="text-xs text-gray-600 mt-1">{month.deals} deals</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Performance Summary */}
            <div className="bg-gradient-to-br from-academy-blue-50 to-white border border-academy-blue-100 rounded-lg p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Team Performance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Average Deal Size</div>
                  <div className="text-2xl font-bold text-gray-900">${analyticsData.avgDealSize.toLocaleString()}</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Total Commissions</div>
                  <div className="text-2xl font-bold text-gray-900">${analyticsData.totalCommissions.toLocaleString()}</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Appointment Rate</div>
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.appointmentCompletionRate}%</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 md:py-12 px-4">
            <Award className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-sm md:text-base text-gray-500">Start generating leads to see analytics.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgencyReports;
