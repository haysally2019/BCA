import React, { useState, useEffect, useCallback } from 'react';
import { Target, DollarSign, TrendingUp, Users, BarChart3, Clock, CheckCircle, ArrowRight, Phone, ThumbsUp, FileText, Trophy, X, Award, Eye, MousePointerClick } from 'lucide-react';
import { supabaseService, Lead } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface PipelineMetrics {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  avgDealSize: number;
  conversionRate: number;
  avgSalesCycle: number;
}

const SalesPipeline: React.FC = () => {
  const [viewMode, setViewMode] = useState<'pipeline' | 'kanban' | 'list'>('pipeline');
  const [timeRange, setTimeRange] = useState('current_quarter');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  const loadPipelineDataLocal = useCallback(async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const leadsData = await supabaseService.getLeads(profile.id);
      setLeads(leadsData);
    } catch (error) {
      console.error('Error loading pipeline data:', error);
      toast.error('Error loading pipeline data');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadPipelineDataLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);


  // Calculate pipeline metrics based on leads
  const pipelineMetrics: PipelineMetrics = {
    totalDeals: leads.length,
    totalValue: leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0),
    weightedValue: leads.reduce((sum, lead) => sum + (lead.estimated_value || 0) * (lead.score / 100), 0),
    avgDealSize: leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0) / leads.length) : 0,
    conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) : 0,
    avgSalesCycle: 45
  };

  // Define lead stages (statuses)
  const leadStages = [
    { name: 'New', status: 'new', color: 'bg-red-500' },
    { name: 'Contacted', status: 'contacted', color: 'bg-yellow-500' },
    { name: 'Qualified', status: 'qualified', color: 'bg-green-500' },
    { name: 'Proposal Sent', status: 'proposal_sent', color: 'bg-purple-500' },
    { name: 'Won', status: 'won', color: 'bg-emerald-500' },
    { name: 'Lost', status: 'lost', color: 'bg-gray-500' }
  ];

  // Stage metrics based on leads
  const stageMetrics = leadStages.map(stage => {
    const stageLeads = leads.filter(lead => lead.status === stage.status);
    return {
      name: stage.name,
      status: stage.status,
      count: stageLeads.length,
      value: stageLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0),
      weightedValue: stageLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0) * (lead.score / 100), 0),
      color: stage.color
    };
  });

  // Chart data
  const stageChartData = stageMetrics.map(stage => ({
    name: stage.name,
    count: stage.count,
    value: stage.value,
  }));

  // Get leads by status
  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      await supabaseService.updateLead(leadId, { status: newStatus });
      toast.success('Lead status updated!');
      loadPipelineDataLocal();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead status');
    }
  };

  const getQuickActions = (status: string) => {
    switch (status) {
      case 'new':
        return [
          { label: 'Contact', status: 'contacted', icon: Phone, color: 'bg-blue-600 hover:bg-blue-700' }
        ];
      case 'contacted':
        return [
          { label: 'Qualify', status: 'qualified', icon: ThumbsUp, color: 'bg-green-600 hover:bg-green-700' }
        ];
      case 'qualified':
        return [
          { label: 'Proposal', status: 'proposal_sent', icon: FileText, color: 'bg-purple-600 hover:bg-purple-700' }
        ];
      case 'proposal_sent':
        return [
          { label: 'Won', status: 'won', icon: Trophy, color: 'bg-emerald-600 hover:bg-emerald-700' },
          { label: 'Lost', status: 'lost', icon: X, color: 'bg-gray-600 hover:bg-gray-700' }
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <LoadingSpinner size="lg" text="Loading pipeline data..." className="h-64" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Pipeline</h1>
          <p className="text-gray-600 mt-1">Track prospects through your training enrollment process</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
        >
          <option value="current_quarter">Current Quarter</option>
          <option value="next_quarter">Next Quarter</option>
          <option value="current_year">Current Year</option>
        </select>
      </div>

      {/* AffiliateWP Performance Banner */}
      {profile?.affiliatewp_id && (
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Affiliate Performance Summary</h2>
              <p className="text-emerald-100 text-sm">Your conversion metrics from AffiliateWP</p>
            </div>
            <Award className="w-10 h-10 text-emerald-200" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="w-4 h-4 text-emerald-200" />
                <span className="text-sm text-emerald-100">Visits</span>
              </div>
              <div className="text-2xl font-bold">{profile.affiliatewp_visits || 0}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <MousePointerClick className="w-4 h-4 text-emerald-200" />
                <span className="text-sm text-emerald-100">Referrals</span>
              </div>
              <div className="text-2xl font-bold">{profile.affiliatewp_referrals || 0}</div>
              <div className="text-xs text-emerald-200 mt-1">
                {profile.affiliatewp_visits ?
                  `${((profile.affiliatewp_referrals || 0) / profile.affiliatewp_visits * 100).toFixed(1)}% conversion` :
                  '0% conversion'}
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-200" />
                <span className="text-sm text-emerald-100">Unpaid</span>
              </div>
              <div className="text-2xl font-bold">${(profile.affiliatewp_unpaid_earnings || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="w-4 h-4 text-emerald-200" />
                <span className="text-sm text-emerald-100">Total Earned</span>
              </div>
              <div className="text-2xl font-bold">${(profile.affiliatewp_earnings || 0).toLocaleString()}</div>
              <div className="text-xs text-emerald-200 mt-1">{profile.commission_rate || 0}% rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { title: 'Total Prospects', value: pipelineMetrics.totalDeals, icon: Target, color: 'bg-blue-500' },
          { title: 'Pipeline Value', value: `$${pipelineMetrics.totalValue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
          { title: 'Weighted Value', value: `$${Math.round(pipelineMetrics.weightedValue).toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-500' },
          { title: 'Avg Program Value', value: `$${pipelineMetrics.avgDealSize}`, icon: BarChart3, color: 'bg-orange-500' },
          { title: 'Conversion Rate', value: `${pipelineMetrics.conversionRate}%`, icon: CheckCircle, color: 'bg-emerald-500' },
          { title: 'Avg Cycle', value: `${pipelineMetrics.avgSalesCycle}d`, icon: Clock, color: 'bg-red-500' }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${metric.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.title}</div>
            </div>
          );
        })}
      </div>

      {/* View Mode Selector */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Pipeline View</h3>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'pipeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {viewMode === 'pipeline' && (
          <div className="space-y-6">
            {/* Pipeline Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {stageMetrics.map((stage, index) => (
                <div key={stage.status} className="text-center">
                  <div className={`${stage.color} text-white p-3 rounded-lg mb-2`}>
                    <div className="font-semibold text-sm">{stage.name}</div>
                    <div className="text-xs opacity-90">{stage.count} leads</div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">${stage.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">${Math.round(stage.weightedValue).toLocaleString()} weighted</div>
                  {index < stageMetrics.length - 1 && (
                    <div className="flex justify-center mt-2">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stage Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {leadStages.map(stage => {
                const stageLeads = getLeadsByStatus(stage.status);
                return (
                  <div key={stage.status} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{stage.name}</h4>
                    <div className="space-y-2">
                      {stageLeads.slice(0, 3).map(lead => (
                        <div key={lead.id} className="bg-white p-3 rounded border border-gray-200 hover:shadow-md transition-all group">
                          <div className="font-medium text-sm text-gray-900 mb-1">{lead.name}</div>
                          <div className="text-xs text-gray-600 mb-2">{lead.phone}</div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-600">${lead.estimated_value?.toLocaleString() || 0}</span>
                            <span className="text-xs text-gray-500">Score: {lead.score}</span>
                          </div>
                          {getQuickActions(lead.status).length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {getQuickActions(lead.status).map((action) => {
                                const Icon = action.icon;
                                return (
                                  <button
                                    key={action.status}
                                    onClick={() => handleUpdateLeadStatus(lead.id, action.status)}
                                    className={`flex-1 ${action.color} text-white px-2 py-1 rounded text-xs transition-all duration-200 flex items-center justify-center space-x-1`}
                                    title={action.label}
                                  >
                                    <Icon className="w-3 h-3" />
                                    <span className="hidden lg:inline">{action.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                      {stageLeads.length > 3 && (
                        <div className="text-xs text-gray-500 text-center py-2">
                          +{stageLeads.length - 3} more leads
                        </div>
                      )}
                      {stageLeads.length === 0 && (
                        <div className="text-xs text-gray-400 text-center py-4">
                          No leads in this stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 h-96 overflow-y-auto">
            {leadStages.map(stage => {
              const stageLeads = getLeadsByStatus(stage.status);
              return (
                <div key={stage.status} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">{stage.name}</h4>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-red-600" />
                          </div>
                          <span className="text-xs text-gray-500">Score: {lead.score}</span>
                        </div>
                        <h5 className="font-medium text-gray-900 mb-1">{lead.name}</h5>
                        <p className="text-sm text-gray-600 mb-2">{lead.phone}</p>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-600">${lead.estimated_value?.toLocaleString() || 0}</span>
                          <span className="text-xs text-gray-500 capitalize">{lead.source.replace('_', ' ')}</span>
                        </div>
                        {lead.email && (
                          <div className="mb-2 text-xs text-gray-500 truncate">
                            {lead.email}
                          </div>
                        )}
                        {getQuickActions(lead.status).length > 0 && (
                          <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                            {getQuickActions(lead.status).map((action) => {
                              const Icon = action.icon;
                              return (
                                <button
                                  key={action.status}
                                  onClick={() => handleUpdateLeadStatus(lead.id, action.status)}
                                  className={`flex-1 ${action.color} text-white px-2 py-1.5 rounded text-xs transition-all duration-200 flex items-center justify-center space-x-1`}
                                  title={action.label}
                                >
                                  <Icon className="w-3 h-3" />
                                  <span>{action.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                          <div className="text-sm text-gray-500">{lead.roof_type || 'No type'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${lead.estimated_value?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {lead.source.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-1">
                        <span className="text-gray-900">{lead.phone}</span>
                        {lead.email && <span className="text-gray-500 text-xs">{lead.email}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default SalesPipeline;