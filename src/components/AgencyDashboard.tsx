import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Plus, Calendar, FileText, BarChart3, Building2, UserPlus, Briefcase, PhoneCall, Target, Award, CheckCircle, Activity } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { supabaseService, type AnalyticsData } from '../lib/supabaseService';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const AgencyDashboard: React.FC = () => {
  const { profile } = useAuthStore();
  const {
    analyticsData,
    dashboardLoading: loading,
    loadDashboardData
  } = useDataStore();
  const [timeRange, setTimeRange] = useState('30d');
  const [totalSalesReps, setTotalSalesReps] = useState(0);
  
  const isManagement = profile?.subscription_plan === 'enterprise';

  useEffect(() => {
    if (profile) {
      loadDashboardData(profile.id, timeRange);
      loadSalesRepsCount();
    }
  }, [profile, timeRange, loadDashboardData]);

  const loadSalesRepsCount = async () => {
    if (!profile) return;

    try {
      const count = await supabaseService.getSalesRepsCount(profile.id);
      setTotalSalesReps(count);
    } catch (error) {
      // Error loading sales reps count
    }
  };

  const createAgencySampleData = async () => {
    if (!profile) return;

    try {
      // Only create sample data if no prospects exist
      const existingProspects = await supabaseService.getProspects(profile.id);
      if (existingProspects.length > 0) {
        return;
      }

      // Create sample prospects for agency
      const sampleProspects = [
        {
          company_name: 'Elite Roofing Solutions',
          contact_name: 'John Smith',
          email: 'john@eliteroofing.com',
          phone: '(555) 123-4567',
          status: 'qualified' as const,
          deal_value: 199,
          probability: 75,
          source: 'website',
          company_size: '10-50 employees',
          current_crm: 'None',
          pain_points: ['Lead management', 'Follow-up tracking'],
          decision_maker: true,
          notes: 'Interested in comprehensive training program'
        },
        {
          company_name: 'Apex Roofing Co.',
          contact_name: 'Sarah Davis',
          email: 'sarah@apexroofing.com',
          phone: '(555) 987-6543',
          status: 'proposal_sent' as const,
          deal_value: 499,
          probability: 60,
          source: 'referral',
          company_size: '50+ employees',
          current_crm: 'Basic CRM',
          pain_points: ['Team training', 'Safety compliance'],
          decision_maker: true,
          notes: 'Looking for enterprise training solution'
        }
      ];

      for (const prospectData of sampleProspects) {
        await supabaseService.createProspect(profile.id, prospectData);
      }

      console.log('Agency sample data created');
    } catch (error) {
      console.error('Error creating agency sample data:', error);
    }
  };

  const handleQuickAction = (actionTitle: string) => {
    switch (actionTitle) {
      case 'Add Prospect':
        toast.success('Opening prospect form...');
        break;
      case 'Schedule Demo':
        toast.success('Opening demo scheduler...');
        break;
      case 'Generate Report':
        toast.success('Generating sales report...');
        break;
      case 'Team Meeting':
        toast.success('Scheduling team meeting...');
        break;
      case 'ROI Calculator':
        toast.success('Opening ROI calculator...');
        break;
      case 'Commission Report':
        toast.success('Loading commission report...');
        break;
      case 'My Pipeline':
        toast.success('Opening pipeline view...');
        break;
      case 'My Commissions':
        toast.success('Loading commission details...');
        break;
      case 'Sales Tools':
        toast.success('Opening sales tools...');
        break;
      default:
        toast.info(`${actionTitle} feature coming soon!`);
    }
  };

  const handleAddLead = () => {
    toast.success('Opening lead form...');
  };

  if (loading) {
    return (
      <LoadingSpinner size="lg" text="Loading dashboard data..." className="h-64" />
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Start adding prospects to see your dashboard analytics.</p>
      </div>
    );
  }

  // Agency-specific metrics derived from real data
  const agencyMetrics = {
    totalClients: analyticsData.totalLeads,
    activeTrials: Math.floor(analyticsData.totalLeads * 0.3),
    monthlyRevenue: analyticsData.totalRevenue,
    conversionRate: analyticsData.conversionRate,
    avgDealSize: analyticsData.avgDealSize,
    totalReps: isManagement ? Math.max(totalSalesReps, 1) : 1,
    pipelineValue: analyticsData.pipelineValue,
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-0.5 sm:mt-1">Manage your sales operations and team performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500 touch-manipulation"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={handleAddLead}
            className="bg-academy-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center space-x-1.5 hover:bg-academy-blue-700 transition-colors text-xs sm:text-sm touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {[
          { 
            title: 'Active Prospects', 
            value: agencyMetrics.totalClients, 
            icon: Building2, 
            color: 'bg-blue-500', 
            change: '+12%', 
            subtitle: `${agencyMetrics.activeTrials} qualified` 
          },
          { 
            title: 'Monthly Revenue', 
            value: `$${agencyMetrics.monthlyRevenue.toLocaleString()}`, 
            icon: DollarSign, 
            color: 'bg-green-500', 
            change: '+23%', 
            subtitle: `$${agencyMetrics.avgDealSize} avg` 
          },
          { 
            title: 'Pipeline Value', 
            value: `$${agencyMetrics.pipelineValue.toLocaleString()}`, 
            icon: Target, 
            color: 'bg-purple-500', 
            change: '+18%', 
            subtitle: `${analyticsData.totalDeals} deals` 
          },
          { 
            title: 'Conversion Rate', 
            value: `${agencyMetrics.conversionRate}%`, 
            icon: TrendingUp, 
            color: 'bg-emerald-500', 
            change: '+5%', 
            subtitle: 'industry leading' 
          }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-2.5 sm:p-4 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <div className={`w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 ${metric.color} rounded-lg flex items-center justify-center shadow-sm`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-green-600">{metric.change}</span>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-0.5 sm:mb-1">{metric.value}</h3>
              <p className="text-gray-600 text-xs sm:text-sm mb-0.5 sm:mb-1 font-medium">{metric.title}</p>
              <p className="text-xs text-gray-500 hidden sm:block">{metric.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Revenue & Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analyticsData.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px' 
                }} 
              />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue ($)" />
              <Line type="monotone" dataKey="deals" stroke="#ef4444" strokeWidth={2} name="Deals Closed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Stages */}
        <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            {isManagement ? 'Pipeline Stages' : 'My Pipeline'}
          </h3>
          <div className="space-y-4">
            {analyticsData.dealsByStage.slice(0, 4).map((stage, index) => (
              <div key={index} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-blue-100 text-blue-600' :
                    index === 1 ? 'bg-yellow-100 text-yellow-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {index === 0 ? <Users className="w-4 h-4" /> :
                     index === 1 ? <PhoneCall className="w-4 h-4" /> :
                     index === 2 ? <FileText className="w-4 h-4" /> :
                     <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{stage.stage}</div>
                    <div className="text-sm text-gray-500">{stage.count} deals</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">${stage.value.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">value</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            {isManagement ? 'Team Activity' : 'My Recent Activity'}
          </h3>
          <div className="space-y-4">
            {analyticsData.recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              analyticsData.recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-2.5 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'lead_created' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'deal_created' ? 'bg-green-100 text-green-600' :
                    activity.type === 'stage_change' ? 'bg-purple-100 text-purple-600' :
                    activity.type === 'call' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {activity.type === 'lead_created' && <Users className="w-4 h-4" />}
                    {activity.type === 'deal_created' && <Target className="w-4 h-4" />}
                    {activity.type === 'stage_change' && <TrendingUp className="w-4 h-4" />}
                    {activity.type === 'call' && <PhoneCall className="w-4 h-4" />}
                    {!['lead_created', 'deal_created', 'stage_change', 'call'].includes(activity.type) && 
                      <Activity className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{activity.time}</span>
                      {activity.success && (
                        <span className="text-xs font-medium text-green-600">Success</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
            {(isManagement ? [
              { title: 'Add Prospect', icon: UserPlus, color: 'bg-blue-500', description: 'New potential client' },
              { title: 'Schedule Demo', icon: Calendar, color: 'bg-green-500', description: 'Book product demo' },
              { title: 'Generate Report', icon: FileText, color: 'bg-purple-500', description: 'Sales performance' },
              { title: 'Team Meeting', icon: Users, color: 'bg-red-500', description: 'Schedule team sync' },
              { title: 'ROI Calculator', icon: BarChart3, color: 'bg-yellow-500', description: 'Show client value' },
              { title: 'Commission Report', icon: DollarSign, color: 'bg-emerald-500', description: 'Rep earnings' }
            ] : [
              { title: 'Add Prospect', icon: UserPlus, color: 'bg-blue-500', description: 'New potential client' },
              { title: 'Schedule Demo', icon: Calendar, color: 'bg-green-500', description: 'Book product demo' },
              { title: 'My Pipeline', icon: Target, color: 'bg-purple-500', description: 'View my deals' },
              { title: 'My Commissions', icon: DollarSign, color: 'bg-emerald-500', description: 'Track earnings' },
              { title: 'ROI Calculator', icon: BarChart3, color: 'bg-yellow-500', description: 'Show client value' },
              { title: 'Sales Tools', icon: Briefcase, color: 'bg-red-500', description: 'Access tools' }
            ]).map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={`action-${index}`}
                  onClick={() => handleQuickAction(action.title)}
                  className="p-2.5 sm:p-3 lg:p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200 text-left hover:border-gray-300 touch-manipulation"
                >
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 ${action.color} rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 lg:mb-3`}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  <h4 className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 mb-0.5 sm:mb-1">{action.title}</h4>
                  <p className="text-xs text-gray-500 hidden sm:block">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      {analyticsData.upcomingTasks.length > 0 && (
        <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Upcoming Tasks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            {analyticsData.upcomingTasks.slice(0, 6).map((task) => (
              <div key={task.id} className="p-2.5 sm:p-3 lg:p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200">
                <div className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    task.priority === 'high' ? 'bg-red-500' : 
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 font-medium">{task.task}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-gray-500">{task.due}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-academy-blue-700 to-academy-blue-900 rounded-lg p-3 sm:p-5 lg:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-1 sm:mb-2">
              {isManagement ? 'Team Performance Summary' : 'My Performance Summary'}
            </h3>
            <p className="text-xs text-red-100">
              Real-time data from your sales activities
            </p>
          </div>
          <Award className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-academy-blue-200" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="text-center">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1">
              {isManagement ? agencyMetrics.totalReps : '1'}
            </div>
            <div className="text-academy-blue-100 text-xs">
              {isManagement ? 'Sales Reps' : 'Active Rep'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1">{analyticsData.totalCalls}</div>
            <div className="text-academy-blue-100 text-xs">
              {isManagement ? 'Team Calls' : 'My Calls'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1">{analyticsData.callSuccessRate}%</div>
            <div className="text-academy-blue-100 text-xs">
              {isManagement ? 'Team Success Rate' : 'My Success Rate'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1">${analyticsData.pipelineValue.toLocaleString()}</div>
            <div className="text-academy-blue-100 text-xs">
              {isManagement ? 'Team Pipeline' : 'My Pipeline'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyDashboard;