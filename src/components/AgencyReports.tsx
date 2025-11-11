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
          ['Total Earnings', `$${analyticsData.totalEarnings.toLocaleString()}`],
          ['Unpaid Earnings', `$${analyticsData.unpaidEarnings.toLocaleString()}`],
          ['Total Referrals', analyticsData.totalReferrals.toString()],
          ['Paid Referrals', analyticsData.paidReferrals.toString()],
          ['Pending Referrals', analyticsData.pendingReferrals.toString()],
          ['Rejected Referrals', analyticsData.rejectedReferrals.toString()],
          ['Conversion Rate', `${analyticsData.conversionRate}%`],
          ['Average Referral Value', `$${analyticsData.avgReferralValue.toFixed(2)}`],
          ['Total Visits', analyticsData.totalVisits.toString()],
          ['Unique Visits', analyticsData.uniqueVisits.toString()],
          ['Payout Cadence', analyticsData.payoutCadence],
          ['Last Payout Date', analyticsData.lastPayoutDate ? new Date(analyticsData.lastPayoutDate).toLocaleDateString() : 'N/A'],
          ['Next Estimated Payout', analyticsData.nextEstimatedPayout ? new Date(analyticsData.nextEstimatedPayout).toLocaleDateString() : 'N/A'],
          ['Lifetime Order Value', `$${analyticsData.lifetimeOrderValue.toLocaleString()}`],
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[ 
                { label: 'Total Earnings', value: `$${analyticsData.totalEarnings.toLocaleString()}`, icon: DollarSign },
                { label: 'Unpaid Earnings', value: `$${analyticsData.unpaidEarnings.toLocaleString()}`, icon: Award },
                { label: 'Total Referrals', value: analyticsData.totalReferrals.toLocaleString(), icon: Target },
                { label: 'Conversion Rate', value: `${analyticsData.conversionRate}%`, icon: TrendingUp },
              ].map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-white shadow flex items-center justify-center">
                      <Icon className="w-5 h-5 text-academy-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">{metric.label}</div>
                      <div className="text-lg font-semibold text-gray-900">{metric.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payout & Traffic Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Payout Overview</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Payout cadence</span>
                    <span className="font-medium text-gray-900">{analyticsData.payoutCadence}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last payout</span>
                    <span className="font-medium text-gray-900">{analyticsData.lastPayoutDate ? new Date(analyticsData.lastPayoutDate).toLocaleDateString() : 'No payouts yet'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Next estimated payout</span>
                    <span className="font-medium text-gray-900">{analyticsData.nextEstimatedPayout ? new Date(analyticsData.nextEstimatedPayout).toLocaleDateString() : 'Not scheduled'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lifetime order value</span>
                    <span className="font-medium text-gray-900">${analyticsData.lifetimeOrderValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Traffic & Conversion</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Total visits</span>
                    <span className="font-medium text-gray-900">{analyticsData.totalVisits.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Unique visits</span>
                    <span className="font-medium text-gray-900">{analyticsData.uniqueVisits.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average referral value</span>
                    <span className="font-medium text-gray-900">${analyticsData.avgReferralValue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Referral conversion rate</span>
                    <span className="font-medium text-gray-900">{analyticsData.conversionRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Status Breakdown */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Referral Status Breakdown</h3>
              {analyticsData.referralStatusBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500">No referral data available for this period.</p>
              ) : (
                <div className="space-y-3">
                  {analyticsData.referralStatusBreakdown.map((status, index) => (
                    <div key={index} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{status.status}</p>
                        <p className="text-xs text-gray-500">{status.count} referrals</p>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">${status.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Campaigns */}
            {analyticsData.topCampaigns.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Top Campaign Performance</h3>
                <div className="space-y-3">
                  {analyticsData.topCampaigns.map((campaign, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{campaign.campaign}</p>
                        <p className="text-xs text-gray-500">{campaign.referrals} referrals</p>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">${campaign.earnings.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Referrals */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Referrals</h3>
              {analyticsData.recentReferrals.length === 0 ? (
                <p className="text-sm text-gray-500">No recent referral activity.</p>
              ) : (
                <div className="space-y-2">
                  {analyticsData.recentReferrals.map(referral => (
                    <div key={referral.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">${referral.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{referral.description || referral.origin_url || 'Direct referral'}</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-academy-blue-100 text-academy-blue-700">{referral.status}</span>
                        <span className="text-xs text-gray-500">{new Date(referral.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
