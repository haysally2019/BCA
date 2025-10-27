import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  BarChart3,
  Users,
  Settings,
  Copy,
  Link
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabaseService, Commission } from '../lib/supabaseService';
import { commissionService, type Affiliate, type CommissionEntry } from '../lib/commissionService';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';
import AffiliateManagement from './AffiliateManagement';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [filterPeriod, setFilterPeriod] = useState('current_quarter');
  const [filterStatus, setFilterStatus] = useState('all');
  const { profile } = useAuthStore();
  const { 
    commissions, 
    affiliateCommissions, 
    commissionsLoading: loading, 
    loadCommissionsData 
  } = useDataStore();
  const [salesReps, setSalesReps] = useState<any[]>([]);

  // Add affiliate management state
  const [showAffiliateManagement, setShowAffiliateManagement] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [syncingMetrics, setSyncingMetrics] = useState(false);

  const webhookEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliatewp-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setWebhookCopied(true);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setWebhookCopied(false), 2000);
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

      if (result.success) {
        if (!silent) {
          toast.success(`Synced metrics for ${result.metrics_count} affiliates`);
        }
        await loadSalesReps();
        return true;
      } else {
        if (result.credentials_missing) {
          if (!silent) {
            toast.error('AffiliateWP is not configured. Please contact your administrator.');
          }
          return false;
        }
        if (!silent) {
          toast.error('Failed to sync metrics: ' + result.error);
        }
        return false;
      }
    } catch (error) {
      console.error('Error syncing metrics:', error);
      if (!silent) {
        toast.error('Failed to sync affiliate metrics');
      }
      return false;
    } finally {
      setSyncingMetrics(false);
    }
  };

  // Check if user has management access
  const isManagement = profile?.subscription_plan === 'enterprise';

  useEffect(() => {
    if (profile) {
      loadCommissionsData(profile.id);
      loadSalesReps();
    }
  }, [profile, loadCommissionsData]);

  useEffect(() => {
    if (profile && commissions.length > 0) {
      loadSalesReps();
    }
  }, [profile, commissions]);


  const loadSalesReps = async () => {
    if (!profile) return;

    try {
      const [profiles, commissionsData] = await Promise.all([
        supabaseService.getProfilesByCompany(profile.id),
        supabaseService.getCommissions(profile.id)
      ]);

      const repsData = profiles.filter(p => p.user_type === 'sales_rep').map(rep => {
        const repCommissions = commissionsData.filter(c => c.rep_id === rep.id);
        const repDeals = repCommissions.length;
        const ytdCommission = repCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
        const ytdRevenue = repCommissions.reduce((sum, c) => sum + c.deal_value, 0);
        const avgDealSize = repDeals > 0 ? Math.round(ytdRevenue / repDeals) : 0;

        return {
          id: rep.id,
          name: rep.company_name || rep.full_name,
          territory: rep.territory || 'Unassigned',
          // AffiliateWP metrics - use real commission rate from AffiliateWP
          commission_rate: rep.commission_rate || 0,
          paid_earnings: rep.affiliatewp_earnings || 0,
          unpaid_earnings: rep.affiliatewp_unpaid_earnings || 0,
          referrals: rep.affiliatewp_referrals || 0,
          visits: rep.affiliatewp_visits || 0,
          last_sync: rep.last_metrics_sync,
          // Legacy internal tracking (not used anymore)
          ytd_revenue: ytdRevenue,
          ytd_commission: ytdCommission,
          deals_closed: repDeals,
          avg_deal_size: avgDealSize,
          quota_attainment: 0
        };
      });

      setSalesReps(repsData);
    } catch (error) {
      // Error loading sales reps
    }
  };

  const createSampleCommissions = async () => {
    if (!profile) return;

    try {
      // Check if commissions already exist
      if (commissions.length > 0) {
        return;
      }

      // First get deals to create commissions for
      const deals = await supabaseService.getDeals(profile.id);
      const closedDeals = deals.filter(deal => deal.status === 'won');

      // Create commissions for existing won deals
      for (const deal of closedDeals) {
        try {
          // Check if commission already exists for this deal
          const existingCommissions = await supabaseService.getCommissions(profile.id);
          const hasCommission = existingCommissions.some(c => c.deal_id === deal.id);
          
          if (!hasCommission) {
            const commissionRate = 15; // Default rate
            const commissionAmount = deal.value * (commissionRate / 100);
            const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;

            await supabaseService.createCommission({
              company_id: profile.id,
              deal_id: deal.id,
              rep_id: profile.id,
              deal_value: deal.value,
              commission_rate: commissionRate,
              commission_amount: commissionAmount,
              status: 'pending',
              quarter
            });
          }
        } catch (error) {
          console.log('Error creating commission for deal:', error);
        }
      }

      // Reload commissions
      const commissionsData = await supabaseService.getCommissions(profile.id);
      setCommissions(commissionsData);
    } catch (error) {
      console.error('Error creating sample commissions:', error);
    }
  };

  const handleUpdateCommissionStatus = async (commissionId: string, status: Commission['status']) => {
    try {
      const updatedCommission = await supabaseService.updateCommissionStatus(commissionId, status);
      // Invalidate cache and reload
      if (profile) {
        useDataStore.getState().invalidateCache([`commissions_${profile.id}`]);
        await loadCommissionsData(profile.id, true);
      }
      toast.success('Commission status updated successfully!');
    } catch (error) {
      console.error('Error updating commission status:', error);
      toast.error('Failed to update commission status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'approved': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get current user's rep data
  const currentRep = salesReps.find(rep => rep.id === profile?.id);

  // Calculate metrics - if viewing own data, show individual metrics; if manager, show totals
  const isViewingOwnData = profile?.user_role === 'sales_rep' || profile?.user_role === 'affiliate';

  // Check if we have any synced data
  const hasSyncedData = salesReps.some(rep => rep.last_sync !== null && rep.last_sync !== undefined);

  const metrics = isViewingOwnData && currentRep ? {
    totalPaidEarnings: currentRep.paid_earnings || 0,
    totalUnpaidEarnings: currentRep.unpaid_earnings || 0,
    totalVisits: currentRep.visits || 0,
    totalReferrals: currentRep.referrals || 0,
    commissionRate: currentRep.commission_rate || 0,
    totalEarnings: (currentRep.paid_earnings || 0) + (currentRep.unpaid_earnings || 0),
    hasSyncedData: currentRep.last_sync !== null && currentRep.last_sync !== undefined
  } : {
    // Manager view - show totals across all reps
    totalPaidEarnings: salesReps.reduce((sum, rep) => sum + (rep.paid_earnings || 0), 0),
    totalUnpaidEarnings: salesReps.reduce((sum, rep) => sum + (rep.unpaid_earnings || 0), 0),
    totalVisits: salesReps.reduce((sum, rep) => sum + (rep.visits || 0), 0),
    totalReferrals: salesReps.reduce((sum, rep) => sum + (rep.referrals || 0), 0),
    commissionRate: salesReps.length > 0 ?
      salesReps.reduce((sum, rep) => sum + (rep.commission_rate || 0), 0) / salesReps.length : 0,
    totalEarnings: salesReps.reduce((sum, rep) => sum + (rep.paid_earnings || 0) + (rep.unpaid_earnings || 0), 0),
    hasSyncedData
  };

  // Monthly commission data for chart - only use affiliate commissions
  const monthlyData: MonthlyDataPoint[] = (() => {
    const monthMap = new Map<string, { commissions: number; deals: number }>();

    // Process affiliate commissions from AffiliateWP
    affiliateCommissions.forEach(commission => {
      const date = new Date(commission.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const current = monthMap.get(monthKey) || { commissions: 0, deals: 0 };
      monthMap.set(monthKey, {
        commissions: current.commissions + commission.commission_amount,
        deals: current.deals + 1
      });
    });

    // Generate last 4 months
    const result = [];
    for (let i = 3; i >= 0; i--) {
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

  const filteredCommissions = commissions.filter(commission => {
    const matchesStatus = filterStatus === 'all' || commission.status === filterStatus;
    return matchesStatus;
  });

  if (loading) {
    return (
      <LoadingSpinner size="lg" text="Loading commission data..." className="h-64" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Commissions</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Track and manage sales commissions</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500 min-h-[44px]"
          >
            <option value="current_quarter">Current Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="ytd">Year to Date</option>
            <option value="last_year">Last Year</option>
          </select>
          {isManagement && (
            <button
              onClick={() => syncAffiliateMetrics(false)}
              disabled={syncingMetrics}
              className="w-full sm:w-auto bg-red-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-red-700 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Settings className={`w-4 h-4 ${syncingMetrics ? 'animate-spin' : ''}`} />
              <span>{syncingMetrics ? 'Syncing...' : 'Sync Metrics'}</span>
            </button>
          )}
          <button className="w-full sm:w-auto bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors min-h-[44px]">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Sync Status Notice */}
      {!hasSyncedData && isManagement && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">Metrics Not Synced</h3>
              <p className="text-sm text-yellow-800 mb-2">
                AffiliateWP metrics have not been synced yet. Click "Sync Metrics" to fetch the latest data from AffiliateWP.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Commission Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { title: 'Total Earnings', value: metrics.hasSyncedData ? `$${metrics.totalEarnings.toLocaleString()}` : 'Not synced', icon: DollarSign, color: 'bg-green-500' },
          { title: 'Paid Earnings', value: metrics.hasSyncedData ? `$${metrics.totalPaidEarnings.toLocaleString()}` : 'Not synced', icon: CheckCircle, color: 'bg-emerald-500' },
          { title: 'Unpaid Earnings', value: metrics.hasSyncedData ? `$${metrics.totalUnpaidEarnings.toLocaleString()}` : 'Not synced', icon: Clock, color: 'bg-yellow-500' },
          { title: 'Commission Rate', value: metrics.hasSyncedData ? `${metrics.commissionRate.toFixed(1)}%` : 'Not synced', icon: TrendingUp, color: 'bg-red-500' },
          { title: 'Total Visits', value: metrics.hasSyncedData ? metrics.totalVisits.toLocaleString() : 'Not synced', icon: Users, color: 'bg-blue-500' },
          { title: 'Total Referrals', value: metrics.hasSyncedData ? metrics.totalReferrals.toString() : 'Not synced', icon: Target, color: 'bg-purple-500' }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-4 sm:p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 sm:w-8 sm:h-8 ${metric.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                </div>
              </div>
              <div className="text-2xl sm:text-xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.title}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6 min-w-max">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'affiliate_commissions', label: 'Commission History', count: affiliateCommissions.length },
              { id: 'reps', label: 'Rep Performance', count: salesReps.length },
              { id: 'payouts', label: 'Payouts' },
              ...(isManagement ? [{ id: 'affiliates', label: 'Affiliate Program' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 md:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap touch-manipulation ${
                  activeTab === tab.id
                    ? 'border-academy-blue-500 text-academy-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Monthly Commission Trends</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="commissions" stroke="#ef4444" strokeWidth={2} name="Commissions ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Rep Earnings</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={salesReps.map(rep => ({
                      ...rep,
                      total_earnings: (rep.paid_earnings || 0) + (rep.unpaid_earnings || 0)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="paid_earnings" fill="#10b981" name="Paid Earnings ($)" stackId="a" />
                      <Bar dataKey="unpaid_earnings" fill="#eab308" name="Unpaid Earnings ($)" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Performers */}
              <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Top Performers This Quarter</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {salesReps.sort((a, b) => ((b.paid_earnings || 0) + (b.unpaid_earnings || 0)) - ((a.paid_earnings || 0) + (a.unpaid_earnings || 0))).slice(0, 3).map((rep, index) => (
                    <div key={rep.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-100 text-yellow-600' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {index === 0 ? <BarChart3 className="w-5 h-5" /> :
                           index === 1 ? <BarChart3 className="w-5 h-5" /> :
                           <Target className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{rep.name}</div>
                          <div className="text-sm text-gray-500">{rep.territory}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600">${((rep.paid_earnings || 0) + (rep.unpaid_earnings || 0)).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Total Earnings</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">{(rep.referrals || 0)}</div>
                          <div className="text-xs text-gray-500">Referrals</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commissions_disabled' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Commissions Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCommissions.map(commission => (
                      <tr key={commission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {commission.deal?.title || `Deal #${commission.deal_id.slice(0, 8)}`}
                          </div>
                          <div className="text-sm text-gray-500">{commission.quarter}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${commission.deal_value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {commission.commission_rate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ${commission.commission_amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(commission.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(commission.status)}`}>
                              {commission.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <select
                            value={commission.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as Commission['status'];
                              handleUpdateCommissionStatus(commission.id, newStatus);
                            }}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="paid">Paid</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Commission Cards */}
              <div className="md:hidden space-y-3">
                {filteredCommissions.map(commission => (
                  <div key={commission.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {commission.deal?.title || `Deal #${commission.deal_id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{commission.quarter}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(commission.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(commission.status)}`}>
                          {commission.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Deal Value</div>
                        <div className="font-medium text-gray-900">${commission.deal_value.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Rate</div>
                        <div className="font-medium text-gray-900">{commission.commission_rate}%</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Commission</div>
                        <div className="text-lg font-bold text-green-600">${commission.commission_amount.toFixed(2)}</div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Update Status</label>
                      <select
                        value={commission.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as Commission['status'];
                          handleUpdateCommissionStatus(commission.id, newStatus);
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500 min-h-[44px]"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCommissions.length === 0 && (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No commissions found</h3>
                  <p className="text-gray-500">Complete some deals to start earning commissions!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'affiliate_commissions' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  Total: {affiliateCommissions.filter(c => filterStatus === 'all' || c.status === filterStatus).length} entries
                </div>
              </div>

              {/* Affiliate Commissions Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {affiliateCommissions
                      .filter(c => filterStatus === 'all' || c.status === filterStatus)
                      .map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.affiliate?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {entry.affiliate?.tier_level && (
                              <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                                entry.affiliate.tier_level === 'platinum' ? 'bg-purple-100 text-purple-800' :
                                entry.affiliate.tier_level === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                entry.affiliate.tier_level === 'silver' ? 'bg-gray-100 text-gray-800' :
                                entry.affiliate.tier_level === 'bronze' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {entry.affiliate.tier_level}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{entry.customer_name}</div>
                          <div className="text-sm text-gray-500">{entry.customer_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">{entry.product_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            entry.commission_type === 'upfront' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {entry.commission_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${entry.order_total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.commission_rate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ${entry.commission_amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(entry.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(entry.status)}`}>
                              {entry.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Affiliate Commission Cards */}
              <div className="md:hidden space-y-3">
                {affiliateCommissions
                  .filter(c => filterStatus === 'all' || c.status === filterStatus)
                  .map(entry => (
                  <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.affiliate?.name || 'Unknown Affiliate'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.customer_name} • {entry.product_name}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.commission_type === 'upfront' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.commission_type}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(entry.status)}`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Order Total</div>
                        <div className="font-medium text-gray-900">${entry.order_total.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Rate</div>
                        <div className="font-medium text-gray-900">{entry.commission_rate}%</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Commission</div>
                        <div className="text-lg font-bold text-green-600">${entry.commission_amount.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              {affiliateCommissions.filter(c => filterStatus === 'all' || c.status === filterStatus).length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No affiliate commissions found</h3>
                  <p className="text-gray-500">
                    {filterStatus === 'all'
                      ? 'Affiliate commissions from AffiliateWP will appear here once webhooks are received.'
                      : `No ${filterStatus} affiliate commissions found.`
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reps' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sales Rep Performance</h3>
                {syncingMetrics && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    <span>Syncing metrics...</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {salesReps.map(rep => (
                  <div key={rep.id} className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-academy-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-academy-blue-600 font-semibold text-lg">
                            {rep.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{rep.name}</h3>
                          <p className="text-sm text-gray-600">{rep.territory}</p>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-green-600">${rep.paid_earnings.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Paid Earnings</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-yellow-600">${rep.unpaid_earnings.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Unpaid Earnings</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-blue-600">{rep.commission_rate}%</div>
                          <div className="text-xs text-gray-600">Commission Rate</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-purple-600">{rep.referrals.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Referrals</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 col-span-2">
                          <div className="text-xl font-bold text-red-600">{rep.visits.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Total Visits</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-gray-900">
                          ${(rep.paid_earnings + rep.unpaid_earnings).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">Total Earnings</div>
                      </div>

                      {rep.last_sync && (
                        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                          Last synced: {new Date(rep.last_sync).toLocaleDateString()} at {new Date(rep.last_sync).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="text-center py-8 md:py-12 px-4">
              <DollarSign className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Commission Payouts</h3>
              <p className="text-sm md:text-base text-gray-500 mb-4">
                Manage commission payments and payout schedules.
              </p>
              <button className="bg-academy-blue-600 text-white px-6 py-3 rounded-lg hover:bg-academy-blue-700 transition-colors min-h-[44px]">
                Process Payouts
              </button>
            </div>
          )}

          {activeTab === 'affiliates' && (
            isManagement ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Affiliate Program</h3>
                  <p className="text-gray-600">Manage AffiliateWP integration and commission tracking</p>
                </div>
                <button
                  onClick={() => setShowAffiliateManagement(true)}
                  className="bg-academy-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-academy-blue-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Manage Affiliates</span>
                </button>
              </div>

              <div className="bg-academy-blue-50 border border-academy-blue-200 rounded-lg p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Link className="w-6 h-6 text-academy-blue-600" />
                    <h4 className="text-lg font-semibold text-academy-blue-900">AffiliateWP Integration</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasSyncedData ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Active & Synced</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-600">Not Configured</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-academy-blue-800 mb-4">
                  {hasSyncedData
                    ? 'Automatically track and manage affiliate commissions from your AffiliateWP system.'
                    : 'AffiliateWP credentials need to be configured. Contact your system administrator to set up the integration.'
                  }
                </p>

                {/* Webhook Configuration */}
                <div className="bg-white rounded-lg p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Webhook Endpoint
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm text-gray-700 overflow-x-auto">
                      {webhookEndpoint}
                    </div>
                    <button
                      onClick={copyWebhookUrl}
                      className="flex items-center space-x-2 px-4 py-3 bg-academy-blue-600 text-white rounded-lg hover:bg-academy-blue-700 transition-colors whitespace-nowrap"
                      title="Copy webhook URL"
                    >
                      {webhookCopied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Add this webhook URL to your AffiliateWP settings to receive commission updates in real-time
                  </p>
                </div>

                {/* Setup Instructions */}
                <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">
                        {hasSyncedData ? 'Setup Instructions' : 'Configuration Required'}
                      </h5>
                      {!hasSyncedData && (
                        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-900 font-medium mb-1">AffiliateWP Not Configured</p>
                          <p className="text-sm text-yellow-800">
                            Before using this integration, your administrator must configure AffiliateWP credentials in the database.
                            After credentials are configured, use the "Sync Metrics" button above to fetch affiliate data.
                          </p>
                        </div>
                      )}
                      <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                        <li>Configure AffiliateWP credentials in the app_settings table</li>
                        <li>Log in to your AffiliateWP dashboard</li>
                        <li>Navigate to Settings → Webhooks</li>
                        <li>Click "Add New Webhook"</li>
                        <li>Paste the webhook endpoint URL above</li>
                        <li>Select events: Referral Created, Referral Approved, Referral Paid</li>
                        <li>Save the webhook configuration</li>
                        <li>Click "Sync Metrics" button to pull initial data</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Supported Events</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Referral created</li>
                      <li>• Commission approved</li>
                      <li>• Payment processed</li>
                    </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Commission Types</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Upfront commissions</li>
                      <li>• Residual commissions</li>
                      <li>• Custom rate tiers</li>
                    </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Features</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Automatic sync</li>
                      <li>• Rate management</li>
                      <li>• Performance tracking</li>
                    </ul>
                  </div>
                </div>

                {/* Integration Status */}
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">Integration Status</h5>
                      <p className="text-sm text-gray-600">
                        {affiliateCommissions.length} commission entries processed
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="text-center py-8 md:py-12 px-4">
                <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-sm md:text-base text-gray-500">
                  Affiliate program management is only available for enterprise accounts.
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Affiliate Management Modal */}
      {showAffiliateManagement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Affiliate Management</h3>
              <button
                onClick={() => setShowAffiliateManagement(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 md:p-6">
              <AffiliateManagement />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsTracker;