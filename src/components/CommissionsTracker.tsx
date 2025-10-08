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
  Settings
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
          name: rep.company_name,
          territory: rep.territory || 'Unassigned',
          commission_rate: rep.commission_rate || 15,
          ytd_revenue: ytdRevenue,
          ytd_commission: ytdCommission,
          deals_closed: repDeals,
          avg_deal_size: avgDealSize,
          quota_attainment: 0 // Cannot calculate without quota data
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

  // Calculate totals
  const totals: CommissionTotals = {
    totalCommissions: commissions.reduce((sum, c) => sum + c.commission_amount, 0),
    paidCommissions: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0),
    pendingCommissions: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0),
    approvedCommissions: commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.commission_amount, 0),
    totalDeals: commissions.length,
    avgCommission: commissions.length > 0 ? commissions.reduce((sum, c) => sum + c.commission_amount, 0) / commissions.length : 0
  };

  // Monthly commission data for chart
  const monthlyData: MonthlyDataPoint[] = (() => {
    const monthMap = new Map<string, { commissions: number; deals: number }>();
    
    // Process regular commissions
    commissions.forEach(commission => {
      const date = new Date(commission.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const current = monthMap.get(monthKey) || { commissions: 0, deals: 0 };
      monthMap.set(monthKey, {
        commissions: current.commissions + commission.commission_amount,
        deals: current.deals + 1
      });
    });

    // Process affiliate commissions
    affiliateCommissions.forEach(commission => {
      const date = new Date(commission.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const current = monthMap.get(monthKey) || { commissions: 0, deals: 0 };
      monthMap.set(monthKey, {
        commissions: current.commissions + commission.commission_amount,
        deals: current.deals
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commissions</h1>
          <p className="text-gray-600 mt-1">Track and manage sales commissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
          >
            <option value="current_quarter">Current Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="ytd">Year to Date</option>
            <option value="last_year">Last Year</option>
          </select>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Commission Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { title: 'Total Commissions', value: `$${totals.totalCommissions.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500', change: '+23%' },
          { title: 'Paid', value: `$${totals.paidCommissions.toLocaleString()}`, icon: CheckCircle, color: 'bg-emerald-500', change: '+18%' },
          { title: 'Approved', value: `$${totals.approvedCommissions.toLocaleString()}`, icon: Clock, color: 'bg-blue-500', change: '+12%' },
          { title: 'Pending', value: `$${totals.pendingCommissions.toLocaleString()}`, icon: AlertCircle, color: 'bg-yellow-500', change: '+8%' },
          { title: 'Total Deals', value: totals.totalDeals.toString(), icon: Target, color: 'bg-purple-500', change: '+15%' },
          { title: 'Avg Commission', value: `$${totals.avgCommission.toFixed(2)}`, icon: TrendingUp, color: 'bg-red-500', change: '+5%' }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${metric.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-green-600 font-medium">{metric.change}</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.title}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'commissions', label: 'Commission Details', count: commissions.length },
              { id: 'reps', label: 'Rep Performance', count: salesReps.length },
              { id: 'payouts', label: 'Payouts' },
              ...(isManagement ? [{ id: 'affiliates', label: 'Affiliate Program' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
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

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Commission Trends</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="commissions" stroke="#ef4444" strokeWidth={2} name="Commissions ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Rep Performance</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesReps}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="ytd_commission" fill="#10b981" name="YTD Commission ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Performers */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers This Quarter</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {salesReps.sort((a, b) => b.ytd_commission - a.ytd_commission).slice(0, 3).map((rep, index) => (
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
                          <div className="text-lg font-bold text-green-600">${rep.ytd_commission.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Commission</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">{rep.quota_attainment}%</div>
                          <div className="text-xs text-gray-500">Quota</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commissions' && (
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
              <div className="overflow-x-auto">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {salesReps.map(rep => (
                  <div key={rep.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
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

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">${rep.ytd_commission.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">YTD Commission</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">${rep.ytd_revenue.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">YTD Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">{rep.deals_closed}</div>
                        <div className="text-xs text-gray-600">Deals Closed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">${rep.avg_deal_size}</div>
                        <div className="text-xs text-gray-600">Avg Deal</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Quota Attainment</span>
                        <span className="font-medium">{rep.quota_attainment}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            rep.quota_attainment >= 100 ? 'bg-green-600' :
                            rep.quota_attainment >= 80 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(rep.quota_attainment, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-center">
                      <span className="text-sm text-gray-600">Commission Rate: </span>
                      <span className="text-sm font-medium text-gray-900">{rep.commission_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Commission Payouts</h3>
              <p className="text-gray-500 mb-4">
                Manage commission payments and payout schedules.
              </p>
              <button className="bg-academy-blue-600 text-white px-4 py-2 rounded-lg hover:bg-academy-blue-700 transition-colors">
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

              <div className="bg-academy-blue-50 border border-academy-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="w-6 h-6 text-academy-blue-600" />
                  <h4 className="text-lg font-semibold text-academy-blue-900">AffiliateWP Integration</h4>
                </div>
                <p className="text-academy-blue-800 mb-4">
                  Automatically track and manage affiliate commissions from your AffiliateWP system.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Webhook Endpoint</h5>
                    <code className="text-sm bg-gray-100 p-2 rounded block">
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliatewp-webhook
                    </code>
                  </div>
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
                </div>
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">Integration Status</h5>
                      <p className="text-sm text-gray-600">
                        {affiliateCommissions.length} commission entries processed
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-500">
                  Affiliate program management is only available for enterprise accounts.
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Affiliate Management Modal */}
      {showAffiliateManagement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Affiliate Management</h3>
              <button
                onClick={() => setShowAffiliateManagement(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <AffiliateManagement />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsTracker;