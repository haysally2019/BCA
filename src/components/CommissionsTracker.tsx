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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
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
  const [activeTab, setActiveTab] = useState('reps');
  const [filterPeriod, setFilterPeriod] = useState('current_quarter');
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

  // Check if user has management access - allow managers and sales managers to sync
  const isManagement = profile?.user_role === 'manager' || profile?.user_role === 'sales_manager' || profile?.subscription_plan === 'enterprise';

  useEffect(() => {
    if (profile) {
      loadCommissionsData(profile.id);
      loadSalesReps();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile && commissions.length > 0) {
      loadSalesReps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, commissions.length]);


  const loadSalesReps = async () => {
    if (!profile) return;

    try {
      const profiles = await supabaseService.getProfilesByCompany(profile.id);

      const repsData = profiles.filter(p => p.user_type === 'sales_rep').map(rep => {
        return {
          id: rep.id,
          name: rep.company_name || rep.full_name,
          territory: rep.territory || 'Unassigned',
          commission_rate: rep.commission_rate ?? 0,
          paid_earnings: rep.affiliatewp_earnings ?? 0,
          unpaid_earnings: rep.affiliatewp_unpaid_earnings ?? 0,
          referrals: rep.affiliatewp_referrals ?? 0,
          visits: rep.affiliatewp_visits ?? 0,
          last_sync: rep.last_metrics_sync
        };
      });

      setSalesReps(repsData);
    } catch (error) {
      console.error('Error loading sales reps:', error);
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
            // Use actual commission rate from AffiliateWP sync, fallback to 10% default
            const commissionRate = profile.commission_rate ?? 10;
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
      await loadCommissionsData(profile.id, true);
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

  // Check if user is management (manager or sales_manager) - they should ALWAYS see team totals
  const isManagementRole = profile?.user_role === 'manager' || profile?.user_role === 'sales_manager';

  // Get current user's rep data (only used if they're a regular sales rep)
  const currentRep = salesReps.find(rep => rep.id === profile?.id);

  // Check if we have any synced data
  const hasSyncedData = salesReps.some(rep => rep.last_sync !== null && rep.last_sync !== undefined);

  // Managers ALWAYS see team totals, sales reps see their individual data
  const metrics = !isManagementRole && currentRep ? {
    // Individual sales rep view - show only their data
    totalPaidEarnings: currentRep.paid_earnings ?? 0,
    totalUnpaidEarnings: currentRep.unpaid_earnings ?? 0,
    totalVisits: currentRep.visits ?? 0,
    totalReferrals: currentRep.referrals ?? 0,
    commissionRate: currentRep.commission_rate ?? 0,
    totalEarnings: (currentRep.paid_earnings ?? 0) + (currentRep.unpaid_earnings ?? 0),
    hasSyncedData: currentRep.last_sync !== null && currentRep.last_sync !== undefined,
    lastSync: currentRep.last_sync
  } : {
    // Manager view - show totals across ALL sales reps (team aggregation)
    totalPaidEarnings: salesReps.reduce((sum, rep) => sum + (rep.paid_earnings ?? 0), 0),
    totalUnpaidEarnings: salesReps.reduce((sum, rep) => sum + (rep.unpaid_earnings ?? 0), 0),
    totalVisits: salesReps.reduce((sum, rep) => sum + (rep.visits ?? 0), 0),
    totalReferrals: salesReps.reduce((sum, rep) => sum + (rep.referrals ?? 0), 0),
    commissionRate: salesReps.length > 0 ?
      salesReps.reduce((sum, rep) => sum + (rep.commission_rate ?? 0), 0) / salesReps.length : 0,
    totalEarnings: salesReps.reduce((sum, rep) => sum + (rep.paid_earnings ?? 0) + (rep.unpaid_earnings ?? 0), 0),
    hasSyncedData,
    lastSync: salesReps.length > 0 ? salesReps[0]?.last_sync : null
  };

  // Monthly commission data for chart - AffiliateWP commissions only
  const monthlyData: MonthlyDataPoint[] = (() => {
    const monthMap = new Map<string, { commissions: number; deals: number }>();

    affiliateCommissions.forEach(commission => {
      const date = new Date(commission.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const current = monthMap.get(monthKey) || { commissions: 0, deals: 0 };
      monthMap.set(monthKey, {
        commissions: current.commissions + commission.commission_amount,
        deals: current.deals + 1
      });
    });

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
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {isManagementRole
              ? `Track team commissions across ${salesReps.length} sales rep${salesReps.length !== 1 ? 's' : ''}`
              : 'Track and manage your sales commissions'
            }
          </p>
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
          <button className="w-full sm:w-auto bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors min-h-[44px]">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>


      {/* Commission Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { title: 'Total Earnings', value: `$${metrics.totalEarnings.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
          { title: 'Paid Earnings', value: `$${metrics.totalPaidEarnings.toLocaleString()}`, icon: CheckCircle, color: 'bg-emerald-500' },
          { title: 'Unpaid Earnings', value: `$${metrics.totalUnpaidEarnings.toLocaleString()}`, icon: Clock, color: 'bg-yellow-500' },
          { title: 'Commission Rate', value: `${metrics.commissionRate.toFixed(1)}%`, icon: TrendingUp, color: 'bg-red-500' },
          { title: 'Total Visits', value: metrics.totalVisits.toLocaleString(), icon: Users, color: 'bg-blue-500' },
          { title: 'Total Referrals', value: metrics.totalReferrals.toString(), icon: Target, color: 'bg-purple-500' }
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
              { id: 'reps', label: 'Rep Performance', count: salesReps.length },
              { id: 'payouts', label: 'Payouts' }
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
                          <div className="text-xl font-bold text-blue-600">{rep.commission_rate.toFixed(1)}%</div>
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
            <div className="space-y-6">
              {/* Payout Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-700">PENDING</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-900">
                    ${salesReps.reduce((sum, rep) => sum + (rep.unpaid_earnings || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-yellow-700">Unpaid Commissions</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-xs font-medium text-green-700">PAID</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    ${salesReps.reduce((sum, rep) => sum + (rep.paid_earnings || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Total Paid Out</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">ACTIVE</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {salesReps.filter(rep => rep.unpaid_earnings > 0).length}
                  </div>
                  <div className="text-sm text-blue-700">Reps with Pending</div>
                </div>
              </div>

              {/* Payout Actions */}
              {isManagement && salesReps.filter(rep => rep.unpaid_earnings > 0).length > 0 && (
                <div className="bg-academy-blue-50 border border-academy-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-academy-blue-900 mb-1">Ready to Process Payouts</h4>
                      <p className="text-sm text-academy-blue-700">
                        {salesReps.filter(rep => rep.unpaid_earnings > 0).length} rep(s) have pending commissions totaling $
                        {salesReps.reduce((sum, rep) => sum + (rep.unpaid_earnings || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedPayoutReps.length === 0) {
                          toast.error('Please select reps to pay out');
                        } else {
                          setProcessingPayout(true);
                          toast.success(`Processing payouts for ${selectedPayoutReps.length} rep(s). This is a simulation - actual payout processing would happen here.`);
                          setTimeout(() => {
                            setProcessingPayout(false);
                            setSelectedPayoutReps([]);
                          }, 2000);
                        }
                      }}
                      disabled={processingPayout}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingPayout ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Process Selected Payouts</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Reps with Pending Payouts */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Payouts</h3>
                <div className="space-y-3">
                  {salesReps.filter(rep => rep.unpaid_earnings > 0).map(rep => (
                    <div key={rep.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          {isManagement && (
                            <input
                              type="checkbox"
                              checked={selectedPayoutReps.includes(rep.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPayoutReps([...selectedPayoutReps, rep.id]);
                                } else {
                                  setSelectedPayoutReps(selectedPayoutReps.filter(id => id !== rep.id));
                                }
                              }}
                              className="w-5 h-5 text-academy-blue-600 border-gray-300 rounded focus:ring-academy-blue-500"
                            />
                          )}
                          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-yellow-600 font-semibold text-lg">
                              {rep.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{rep.name}</h4>
                            <p className="text-sm text-gray-600">{rep.territory}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-yellow-600">
                              ${rep.unpaid_earnings.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">Pending Commission</div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                        <div>
                          <div className="text-sm text-gray-500">Commission Rate</div>
                          <div className="font-medium text-gray-900">{rep.commission_rate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Total Referrals</div>
                          <div className="font-medium text-gray-900">{rep.referrals}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Paid to Date</div>
                          <div className="font-medium text-green-600">${rep.paid_earnings.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {salesReps.filter(rep => rep.unpaid_earnings > 0).length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-500">No pending commission payouts at this time.</p>
                  </div>
                )}
              </div>

              {/* Payout History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payout History</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rep</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {salesReps.filter(rep => rep.paid_earnings > 0).map(rep => (
                          <tr key={rep.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-green-600 font-semibold text-sm">
                                    {rep.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{rep.name}</div>
                                  <div className="text-sm text-gray-500">{rep.territory}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-900 font-medium">
                              ${rep.paid_earnings.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {rep.last_sync ? new Date(rep.last_sync).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {salesReps.filter(rep => rep.paid_earnings > 0).length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Payout History</h3>
                      <p className="text-gray-500">Payout history will appear here once commissions are processed.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default CommissionsTracker;