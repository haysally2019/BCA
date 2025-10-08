import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users,
  Target,
  Award,
  Clock,
  CheckCircle,
  Eye,
  Plus,
  Settings
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabaseService, type AnalyticsData } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  last_generated: string;
  frequency: string;
  recipients: string[];
  status: 'active' | 'inactive';
}

const AgencyReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [profile, selectedPeriod]);

  const fetchAnalytics = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const timeRange = selectedPeriod === 'current_month' || selectedPeriod === 'last_month' ? '30d' :
                       selectedPeriod === 'current_quarter' || selectedPeriod === 'last_quarter' ? '90d' : '90d';
      const analytics = await supabaseService.getAnalyticsData(profile.id, timeRange);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Mock reports data
  const reports: Report[] = [
    {
      id: '1',
      name: 'Monthly Sales Performance',
      description: 'Comprehensive overview of sales team performance and revenue',
      category: 'Sales',
      last_generated: '2024-01-20',
      frequency: 'Monthly',
      recipients: ['alex@bluecaller.ai', 'sarah@bluecaller.ai'],
      status: 'active'
    },
    {
      id: '2',
      name: 'Commission Summary',
      description: 'Detailed commission calculations and payments for all reps',
      category: 'Finance',
      last_generated: '2024-01-19',
      frequency: 'Bi-weekly',
      recipients: ['finance@bluecaller.ai', 'alex@bluecaller.ai'],
      status: 'active'
    },
    {
      id: '3',
      name: 'Pipeline Analysis',
      description: 'Deal progression and conversion rate analysis',
      category: 'Sales',
      last_generated: '2024-01-18',
      frequency: 'Weekly',
      recipients: ['alex@bluecaller.ai'],
      status: 'active'
    },
    {
      id: '4',
      name: 'Client Retention Report',
      description: 'Customer churn analysis and retention metrics',
      category: 'Customer Success',
      last_generated: '2024-01-15',
      frequency: 'Quarterly',
      recipients: ['success@bluecaller.ai', 'alex@bluecaller.ai'],
      status: 'active'
    },
    {
      id: '5',
      name: 'Territory Performance',
      description: 'Geographic performance breakdown and territory analysis',
      category: 'Sales',
      last_generated: '2024-01-12',
      frequency: 'Monthly',
      recipients: ['alex@bluecaller.ai', 'david@bluecaller.ai'],
      status: 'inactive'
    }
  ];


  const getCategoryColor = (category: string) => {
    const colors = {
      'Sales': 'bg-blue-100 text-blue-800',
      'Finance': 'bg-green-100 text-green-800',
      'Customer Success': 'bg-purple-100 text-purple-800',
      'Operations': 'bg-orange-100 text-orange-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getFrequencyColor = (frequency: string) => {
    const colors = {
      'Daily': 'bg-red-100 text-red-800',
      'Weekly': 'bg-yellow-100 text-yellow-800',
      'Bi-weekly': 'bg-blue-100 text-blue-800',
      'Monthly': 'bg-green-100 text-green-800',
      'Quarterly': 'bg-purple-100 text-purple-800'
    };
    return colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate insights and track performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
          >
            <option value="current_month">Current Month</option>
            <option value="last_month">Last Month</option>
            <option value="current_quarter">Current Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="ytd">Year to Date</option>
          </select>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button className="bg-academy-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-academy-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>New Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'reports', label: 'Reports', count: reports.length },
              { id: 'scheduled', label: 'Scheduled', count: reports.filter(r => r.status === 'active').length },
              { id: 'custom', label: 'Custom Reports' }
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
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-academy-blue-600"></div>
                </div>
              ) : analyticsData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { title: 'Total Revenue', value: `$${analyticsData.totalRevenue.toLocaleString()}`, change: `${analyticsData.conversionRate}%`, icon: DollarSign, color: 'bg-green-500' },
                    { title: 'Active Deals', value: analyticsData.totalDeals.toString(), change: `${analyticsData.totalLeads} leads`, icon: Target, color: 'bg-blue-500' },
                    { title: 'Pipeline Value', value: `$${analyticsData.pipelineValue.toLocaleString()}`, change: `${analyticsData.totalAppointments} appts`, icon: Award, color: 'bg-purple-500' },
                    { title: 'Conversion Rate', value: `${analyticsData.conversionRate}%`, change: `$${analyticsData.avgDealSize} avg`, icon: TrendingUp, color: 'bg-emerald-500' }
                  ].map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 ${metric.color} rounded-lg flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">{metric.change}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                        <p className="text-gray-600 text-sm">{metric.title}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-500">Start generating leads to see analytics.</p>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                  <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-academy-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-academy-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{report.name}</h3>
                          <span className={`inline-block text-xs px-2 py-1 rounded-full ${getCategoryColor(report.category)}`}>
                            {report.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{report.description}</p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Frequency:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getFrequencyColor(report.frequency)}`}>
                          {report.frequency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Last Generated:</span>
                        <span className="text-gray-900">{new Date(report.last_generated).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Recipients:</span>
                        <span className="text-gray-900">{report.recipients.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          report.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button className="w-full bg-academy-blue-600 text-white py-2 px-4 rounded-lg hover:bg-academy-blue-700 transition-colors text-sm">
                        Generate Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.filter(r => r.status === 'active').map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText className="w-5 h-5 text-academy-blue-600 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{report.name}</div>
                                <div className="text-sm text-gray-500">{report.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFrequencyColor(report.frequency)}`}>
                              {report.frequency}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {report.recipients.length} recipients
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-green-600 hover:text-green-900">
                                <Download className="w-4 h-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-900">
                                <Settings className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Custom Report Builder</h3>
              <p className="text-gray-500 mb-4">
                Create custom reports with your specific metrics and filters.
              </p>
              <button className="bg-academy-blue-600 text-white px-4 py-2 rounded-lg hover:bg-academy-blue-700 transition-colors">
                Build Custom Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyReports;