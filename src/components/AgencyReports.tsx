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
    if (!profile || !profile.company_id) return;

    try {
      setLoading(true);
      const timeRange = selectedPeriod === 'current_month' || selectedPeriod === 'last_month' ? '30d' :
                       selectedPeriod === 'current_quarter' || selectedPeriod === 'last_quarter' ? '90d' : '90d';
      const analytics = await supabaseService.getAnalyticsData(profile.company_id, timeRange);
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

  const generateReport = async (reportId: string) => {
    try {
      toast.info('Generating report...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Report generated successfully');
      exportReport('csv');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
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
          <button
            onClick={() => toast.info('Custom report builder coming soon')}
            className="w-full sm:w-auto bg-academy-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-academy-blue-700 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span className="sm:inline">New Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6 min-w-max">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'reports', label: 'Reports', count: reports.length },
              { id: 'scheduled', label: 'Scheduled', count: reports.filter(r => r.status === 'active').length },
              { id: 'custom', label: 'Custom Reports' }
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
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-academy-blue-600"></div>
                </div>
              ) : analyticsData ? (
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
              ) : (
                <div className="text-center py-8 md:py-12 px-4">
                  <Award className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-sm md:text-base text-gray-500">Start generating leads to see analytics.</p>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {reports.map((report) => (
                  <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-sm transition-shadow">
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
                      <button className="w-full bg-academy-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-academy-blue-700 transition-colors text-sm min-h-[44px]">
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
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
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

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {reports.filter(r => r.status === 'active').map((report) => (
                  <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <FileText className="w-5 h-5 text-academy-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{report.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{report.category}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Frequency</div>
                        <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getFrequencyColor(report.frequency)}`}>
                          {report.frequency}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Status</div>
                        <span className="inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Next Run</div>
                        <div className="font-medium text-gray-900 text-xs mt-1">{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Recipients</div>
                        <div className="font-medium text-gray-900 text-xs mt-1">{report.recipients.length} recipients</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                      <button className="flex-1 text-blue-600 hover:text-blue-900 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 min-h-[44px]">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">View</span>
                      </button>
                      <button className="flex-1 text-green-600 hover:text-green-900 py-2 px-3 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center space-x-2 min-h-[44px]">
                        <Download className="w-4 h-4" />
                        <span className="text-sm">Download</span>
                      </button>
                      <button className="flex-1 text-gray-600 hover:text-gray-900 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 min-h-[44px]">
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Settings</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="text-center py-8 md:py-12 px-4">
              <BarChart3 className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Custom Report Builder</h3>
              <p className="text-sm md:text-base text-gray-500 mb-4">
                Create custom reports with your specific metrics and filters.
              </p>
              <button className="bg-academy-blue-600 text-white px-6 py-3 rounded-lg hover:bg-academy-blue-700 transition-colors min-h-[44px]">
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