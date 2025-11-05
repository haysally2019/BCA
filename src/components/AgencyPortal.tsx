import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Award,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Phone,
  Mail,
  Calendar,
  FileText,
  BarChart3,
  Clock,
  Building2,
  UserPlus,
  Globe,
  PhoneCall,
  Activity,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface Prospect {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
  employees?: number;
  annual_revenue?: number;
  current_crm?: string;
  pain_points: string[];
  stage: 'lead' | 'qualified' | 'demo_scheduled' | 'demo_completed' | 'proposal_sent' | 'negotiating' | 'closed_won' | 'closed_lost';
  priority: 'low' | 'medium' | 'high';
  deal_value: number;
  probability: number;
  assigned_rep: string;
  source: string;
  created_at: string;
  last_contact: string;
  next_follow_up?: string;
  notes?: string;
  demo_date?: string;
  proposal_sent_date?: string;
  close_date?: string;
  lost_reason?: string;
  tags: string[];
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'sales_rep' | 'sales_manager' | 'admin';
  territory: string;
  quota_monthly: number;
  commission_rate: number;
  prospects_count: number;
  revenue_mtd: number;
  revenue_ytd: number;
  conversion_rate: number;
  avg_deal_size: number;
  avg_sales_cycle: number;
  status: 'active' | 'inactive';
  hire_date: string;
  last_activity: string;
}

interface Deal {
  id: string;
  prospect_id: string;
  prospect_name: string;
  deal_value: number;
  stage: string;
  probability: number;
  expected_close: string;
  assigned_rep: string;
  created_at: string;
  last_activity: string;
}

const AgencyPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterRep, setFilterRep] = useState('all');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [showRepModal, setShowRepModal] = useState(false);
  const [viewMode, setViewMode] = useState<'pipeline' | 'list' | 'kanban'>('pipeline');
  const { profile } = useAuthStore();

  useEffect(() => {
    loadAgencyData();
  }, []);

  const loadAgencyData = () => {
    // Mock prospects data
    const mockProspects: Prospect[] = [
      {
        id: '1',
        company_name: 'Elite Roofing Solutions',
        contact_name: 'John Martinez',
        email: 'john@eliteroofing.com',
        phone: '(555) 123-4567',
        website: 'eliteroofing.com',
        address: '123 Main St, Austin, TX',
        employees: 25,
        annual_revenue: 2500000,
        current_crm: 'Excel Spreadsheets',
        pain_points: ['Manual lead tracking', 'Poor follow-up', 'No automation'],
        stage: 'demo_completed',
        priority: 'high',
        deal_value: 2388, // Annual value
        probability: 75,
        assigned_rep: 'Sarah Johnson',
        source: 'Website',
        created_at: '2024-01-15',
        last_contact: '2024-01-20',
        next_follow_up: '2024-01-25',
        demo_date: '2024-01-22',
        notes: 'Very interested in AI calling features. Demo went well, ready for proposal.',
        tags: ['hot-lead', 'decision-maker', 'budget-confirmed']
      },
      {
        id: '2',
        company_name: 'Apex Roofing Co.',
        contact_name: 'Mike Thompson',
        email: 'mike@apexroofing.com',
        phone: '(555) 987-6543',
        website: 'apexroofing.com',
        address: '456 Oak Ave, Dallas, TX',
        employees: 50,
        annual_revenue: 5000000,
        current_crm: 'Salesforce',
        pain_points: ['Expensive current solution', 'Complex setup', 'Poor roofing integration'],
        stage: 'proposal_sent',
        priority: 'high',
        deal_value: 5988, // Annual value
        probability: 60,
        assigned_rep: 'David Chen',
        source: 'Cold Outreach',
        created_at: '2024-01-10',
        last_contact: '2024-01-19',
        proposal_sent_date: '2024-01-20',
        next_follow_up: '2024-01-24',
        notes: 'Large company, 50+ employees. Needs enterprise features. Proposal sent.',
        tags: ['enterprise', 'competitive-displacement', 'long-cycle']
      },
      {
        id: '3',
        company_name: 'Summit Roofing',
        contact_name: 'Lisa Rodriguez',
        email: 'lisa@summitroofing.com',
        phone: '(555) 456-7890',
        website: 'summitroofing.com',
        address: '789 Pine St, Houston, TX',
        employees: 15,
        annual_revenue: 1800000,
        current_crm: 'None',
        pain_points: ['No CRM system', 'Lost leads', 'Manual processes'],
        stage: 'closed_won',
        priority: 'medium',
        deal_value: 2388,
        probability: 100,
        assigned_rep: 'Sarah Johnson',
        source: 'Referral',
        created_at: '2024-01-05',
        last_contact: '2024-01-18',
        close_date: '2024-01-18',
        notes: 'Closed after successful demo. Very happy with SMS features. Quick decision.',
        tags: ['closed-won', 'referral', 'quick-close']
      },
      {
        id: '4',
        company_name: 'Premier Roofing Services',
        contact_name: 'Robert Kim',
        email: 'robert@premierroofing.com',
        phone: '(555) 321-9876',
        website: 'premierroofing.com',
        address: '321 Elm St, San Antonio, TX',
        employees: 35,
        annual_revenue: 3200000,
        current_crm: 'HubSpot',
        pain_points: ['Generic CRM', 'No roofing features', 'Expensive'],
        stage: 'negotiating',
        priority: 'high',
        deal_value: 3588,
        probability: 70,
        assigned_rep: 'David Chen',
        source: 'LinkedIn',
        created_at: '2024-01-08',
        last_contact: '2024-01-20',
        next_follow_up: '2024-01-23',
        notes: 'Negotiating contract terms. Price sensitive but interested. Decision by month-end.',
        tags: ['negotiating', 'price-sensitive', 'month-end-close']
      },
      {
        id: '5',
        company_name: 'Reliable Roofing Inc.',
        contact_name: 'Jennifer Walsh',
        email: 'jen@reliableroofing.com',
        phone: '(555) 654-3210',
        website: 'reliableroofing.com',
        address: '654 Maple Dr, Fort Worth, TX',
        employees: 8,
        annual_revenue: 800000,
        current_crm: 'None',
        pain_points: ['No system', 'Paper-based', 'Growth challenges'],
        stage: 'qualified',
        priority: 'medium',
        deal_value: 1188,
        probability: 40,
        assigned_rep: 'Tom Wilson',
        source: 'Google Ads',
        created_at: '2024-01-20',
        last_contact: '2024-01-20',
        next_follow_up: '2024-01-22',
        notes: 'Small company, budget conscious. Interested in starter plan.',
        tags: ['small-business', 'budget-conscious', 'starter-plan']
      },
      {
        id: '6',
        company_name: 'Skyline Roofing Group',
        contact_name: 'Mark Davis',
        email: 'mark@skylineroofing.com',
        phone: '(555) 789-0123',
        website: 'skylineroofing.com',
        address: '987 Cedar Ln, Plano, TX',
        employees: 40,
        annual_revenue: 4500000,
        current_crm: 'Pipedrive',
        pain_points: ['Limited automation', 'No AI features', 'Poor reporting'],
        stage: 'demo_scheduled',
        priority: 'high',
        deal_value: 4788,
        probability: 50,
        assigned_rep: 'Sarah Johnson',
        source: 'Trade Show',
        created_at: '2024-01-18',
        last_contact: '2024-01-21',
        demo_date: '2024-01-25',
        next_follow_up: '2024-01-25',
        notes: 'Met at trade show. Very interested in AI features. Demo scheduled.',
        tags: ['trade-show', 'ai-interested', 'demo-scheduled']
      }
    ];

    const mockSalesReps: SalesRep[] = [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah@bluecaller.ai',
        phone: '(555) 111-2222',
        role: 'sales_rep',
        territory: 'Texas',
        quota_monthly: 15000,
        commission_rate: 15,
        prospects_count: 18,
        revenue_mtd: 12500,
        revenue_ytd: 12500,
        conversion_rate: 28,
        avg_deal_size: 2800,
        avg_sales_cycle: 45,
        status: 'active',
        hire_date: '2023-06-15',
        last_activity: '2024-01-21'
      },
      {
        id: '2',
        name: 'David Chen',
        email: 'david@bluecaller.ai',
        phone: '(555) 333-4444',
        role: 'sales_rep',
        territory: 'California',
        quota_monthly: 18000,
        commission_rate: 15,
        prospects_count: 12,
        revenue_mtd: 9500,
        revenue_ytd: 9500,
        conversion_rate: 32,
        avg_deal_size: 4200,
        avg_sales_cycle: 60,
        status: 'active',
        hire_date: '2023-08-01',
        last_activity: '2024-01-20'
      },
      {
        id: '3',
        name: 'Tom Wilson',
        email: 'tom@bluecaller.ai',
        phone: '(555) 555-6666',
        role: 'sales_rep',
        territory: 'Florida',
        quota_monthly: 12000,
        commission_rate: 12,
        prospects_count: 22,
        revenue_mtd: 8200,
        revenue_ytd: 8200,
        conversion_rate: 22,
        avg_deal_size: 1800,
        avg_sales_cycle: 35,
        status: 'active',
        hire_date: '2023-09-15',
        last_activity: '2024-01-21'
      }
    ];

    setProspects(mockProspects);
    setSalesReps(mockSalesReps);

    // Generate deals from prospects
    const mockDeals = mockProspects.map(prospect => ({
      id: prospect.id,
      prospect_id: prospect.id,
      prospect_name: prospect.company_name,
      deal_value: prospect.deal_value,
      stage: prospect.stage,
      probability: prospect.probability,
      expected_close: prospect.next_follow_up || '2024-02-15',
      assigned_rep: prospect.assigned_rep,
      created_at: prospect.created_at,
      last_activity: prospect.last_contact
    }));
    setDeals(mockDeals);
  };

  const getStageColor = (stage: string) => {
    const colors = {
      lead: 'bg-gray-100 text-gray-800 border-gray-200',
      qualified: 'bg-blue-100 text-blue-800 border-blue-200',
      demo_scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
      demo_completed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      proposal_sent: 'bg-orange-100 text-orange-800 border-orange-200',
      negotiating: 'bg-red-100 text-red-800 border-red-200',
      closed_won: 'bg-green-100 text-green-800 border-green-200',
      closed_lost: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[stage as keyof typeof colors] || colors.lead;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'website': return '🌐';
      case 'linkedin': return '💼';
      case 'cold outreach': return '📞';
      case 'referral': return '👥';
      case 'trade show': return '🏢';
      case 'google ads': return '🔍';
      default: return '📋';
    }
  };

  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch = prospect.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prospect.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prospect.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === 'all' || prospect.stage === filterStage;
    const matchesRep = filterRep === 'all' || prospect.assigned_rep === filterRep;
    return matchesSearch && matchesStage && matchesRep;
  });

  // Calculate metrics
  const agencyMetrics = {
    totalProspects: prospects.length,
    activeDeals: prospects.filter(p => !['closed_won', 'closed_lost'].includes(p.stage)).length,
    monthlyRevenue: prospects.filter(p => p.stage === 'closed_won').reduce((sum, p) => sum + p.deal_value, 0),
    pipelineValue: prospects.filter(p => !['closed_won', 'closed_lost'].includes(p.stage)).reduce((sum, p) => sum + (p.deal_value * p.probability / 100), 0),
    conversionRate: prospects.length > 0 ? Math.round((prospects.filter(p => p.stage === 'closed_won').length / prospects.length) * 100) : 0,
    avgDealSize: prospects.filter(p => p.stage === 'closed_won').length > 0 ? 
      Math.round(prospects.filter(p => p.stage === 'closed_won').reduce((sum, p) => sum + p.deal_value, 0) / prospects.filter(p => p.stage === 'closed_won').length) : 0,
    totalReps: salesReps.length,
    topPerformer: salesReps.reduce((top, rep) => rep.revenue_mtd > top.revenue_mtd ? rep : top, salesReps[0])
  };

  // Pipeline stages for visualization
  const pipelineStages = [
    { id: 'lead', name: 'Leads', prospects: prospects.filter(p => p.stage === 'lead'), color: 'bg-gray-500' },
    { id: 'qualified', name: 'Qualified', prospects: prospects.filter(p => p.stage === 'qualified'), color: 'bg-blue-500' },
    { id: 'demo_scheduled', name: 'Demo Scheduled', prospects: prospects.filter(p => p.stage === 'demo_scheduled'), color: 'bg-purple-500' },
    { id: 'demo_completed', name: 'Demo Completed', prospects: prospects.filter(p => p.stage === 'demo_completed'), color: 'bg-yellow-500' },
    { id: 'proposal_sent', name: 'Proposal Sent', prospects: prospects.filter(p => p.stage === 'proposal_sent'), color: 'bg-orange-500' },
    { id: 'negotiating', name: 'Negotiating', prospects: prospects.filter(p => p.stage === 'negotiating'), color: 'bg-red-500' },
    { id: 'closed_won', name: 'Closed Won', prospects: prospects.filter(p => p.stage === 'closed_won'), color: 'bg-green-500' }
  ];

  // Chart data
  const revenueData = [
    { month: 'Sep', revenue: 18000, target: 25000, deals: 8 },
    { month: 'Oct', revenue: 22000, target: 25000, deals: 12 },
    { month: 'Nov', revenue: 28000, target: 30000, deals: 15 },
    { month: 'Dec', revenue: 32000, target: 35000, deals: 18 },
    { month: 'Jan', revenue: 30000, target: 35000, deals: 16 }
  ];

  const conversionFunnelData = [
    { stage: 'Leads', count: prospects.filter(p => p.stage === 'lead').length, percentage: 100 },
    { stage: 'Qualified', count: prospects.filter(p => p.stage === 'qualified').length, percentage: 85 },
    { stage: 'Demo', count: prospects.filter(p => ['demo_scheduled', 'demo_completed'].includes(p.stage)).length, percentage: 65 },
    { stage: 'Proposal', count: prospects.filter(p => p.stage === 'proposal_sent').length, percentage: 45 },
    { stage: 'Negotiating', count: prospects.filter(p => p.stage === 'negotiating').length, percentage: 30 },
    { stage: 'Closed Won', count: prospects.filter(p => p.stage === 'closed_won').length, percentage: 20 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agency Portal</h1>
          <p className="text-gray-600 mt-1">Manage your sales team and prospect pipeline</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
          <button 
            onClick={() => setShowProspectModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prospect</span>
          </button>
          <button 
            onClick={() => setShowRepModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Rep</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'pipeline', label: 'Sales Pipeline', icon: Target, count: agencyMetrics.activeDeals },
              { id: 'prospects', label: 'Prospects', icon: Building2, count: prospects.length },
              { id: 'sales-reps', label: 'Sales Team', icon: Users, count: salesReps.length },
              { id: 'deals', label: 'Deals', icon: DollarSign, count: deals.length },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'activities', label: 'Activities', icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { title: 'Total Prospects', value: agencyMetrics.totalProspects, icon: Building2, color: 'bg-blue-500', change: '+12%' },
                  { title: 'Active Deals', value: agencyMetrics.activeDeals, icon: Target, color: 'bg-purple-500', change: '+8%' },
                  { title: 'Monthly Revenue', value: `$${agencyMetrics.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500', change: '+23%' },
                  { title: 'Pipeline Value', value: `$${Math.round(agencyMetrics.pipelineValue).toLocaleString()}`, icon: TrendingUp, color: 'bg-yellow-500', change: '+15%' },
                  { title: 'Conversion Rate', value: `${agencyMetrics.conversionRate}%`, icon: Award, color: 'bg-red-500', change: '+5%' },
                  { title: 'Sales Reps', value: agencyMetrics.totalReps, icon: Users, color: 'bg-indigo-500', change: '+2' }
                ].map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 ${metric.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-green-600 font-medium">{metric.change}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                      <p className="text-gray-600 text-xs">{metric.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Target</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
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
                      <Area type="monotone" dataKey="target" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Target" />
                      <Area type="monotone" dataKey="revenue" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Funnel</h3>
                  <div className="space-y-3">
                    {conversionFunnelData.map((stage, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-sm text-gray-600">{stage.stage}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{stage.count}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-600 h-2 rounded-full" 
                              style={{ width: `${stage.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Performers and Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers This Month</h3>
                  <div className="space-y-4">
                    {salesReps.sort((a, b) => b.revenue_mtd - a.revenue_mtd).slice(0, 3).map((rep, index) => (
                      <div key={rep.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-yellow-100 text-yellow-600' :
                            index === 1 ? 'bg-gray-100 text-gray-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{rep.name}</div>
                            <div className="text-sm text-gray-500">{rep.territory}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">${rep.revenue_mtd.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{rep.conversion_rate}% conv.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[
                      { action: 'Demo completed', prospect: 'Elite Roofing Solutions', rep: 'Sarah Johnson', time: '2 hours ago', type: 'demo' },
                      { action: 'Proposal sent', prospect: 'Apex Roofing Co.', rep: 'David Chen', time: '4 hours ago', type: 'proposal' },
                      { action: 'Deal closed', prospect: 'Summit Roofing', rep: 'Sarah Johnson', time: '1 day ago', type: 'closed' },
                      { action: 'Demo scheduled', prospect: 'Skyline Roofing', rep: 'Sarah Johnson', time: '2 days ago', type: 'demo' }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.type === 'demo' ? 'bg-blue-500' :
                          activity.type === 'proposal' ? 'bg-orange-500' :
                          activity.type === 'closed' ? 'bg-green-500' : 'bg-purple-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.action} - {activity.prospect}</p>
                          <p className="text-xs text-gray-500">{activity.rep} • {activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              {/* Pipeline Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-gray-900">Sales Pipeline</h3>
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('pipeline')}
                      className={`px-3 py-1 rounded text-sm ${viewMode === 'pipeline' ? 'bg-white shadow-sm' : ''}`}
                    >
                      Pipeline
                    </button>
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={`px-3 py-1 rounded text-sm ${viewMode === 'kanban' ? 'bg-white shadow-sm' : ''}`}
                    >
                      Kanban
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                    >
                      List
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <select
                    value={filterRep}
                    onChange={(e) => setFilterRep(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Reps</option>
                    {salesReps.map(rep => (
                      <option key={rep.id} value={rep.name}>{rep.name}</option>
                    ))}
                  </select>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pipeline Value Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">${Math.round(agencyMetrics.pipelineValue).toLocaleString()}</div>
                  <div className="text-sm text-blue-700">Weighted Pipeline</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{agencyMetrics.activeDeals}</div>
                  <div className="text-sm text-green-700">Active Deals</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(agencyMetrics.pipelineValue / agencyMetrics.activeDeals || 0)}</div>
                  <div className="text-sm text-purple-700">Avg Deal Size</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">45</div>
                  <div className="text-sm text-red-700">Avg Sales Cycle</div>
                </div>
              </div>

              {/* Pipeline Visualization */}
              {viewMode === 'pipeline' && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-7 gap-4">
                    {pipelineStages.map((stage) => (
                      <div key={stage.id} className="text-center">
                        <div className={`w-full h-2 ${stage.color} rounded-full mb-2`}></div>
                        <div className="font-medium text-gray-900 text-sm mb-1">{stage.name}</div>
                        <div className="text-2xl font-bold text-gray-900">{stage.prospects.length}</div>
                        <div className="text-sm text-gray-500">
                          ${stage.prospects.reduce((sum, p) => sum + p.deal_value, 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kanban View */}
              {viewMode === 'kanban' && (
                <div className="grid grid-cols-7 gap-4 overflow-x-auto">
                  {pipelineStages.map((stage) => (
                    <div key={stage.id} className="min-w-64">
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{stage.name}</h4>
                          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                            {stage.prospects.length}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          ${stage.prospects.reduce((sum, p) => sum + p.deal_value, 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {stage.prospects.map((prospect) => (
                          <div key={prospect.id} className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-medium text-gray-900 text-sm">{prospect.company_name}</h5>
                              <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(prospect.priority)}`}>
                                {prospect.priority}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{prospect.contact_name}</div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-green-600">${prospect.deal_value.toLocaleString()}</span>
                              <span className="text-xs text-gray-500">{prospect.probability}%</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">{prospect.assigned_rep}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probability</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rep</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredProspects.filter(p => !['closed_won', 'closed_lost'].includes(p.stage)).map((prospect) => (
                          <tr key={prospect.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">{prospect.company_name}</div>
                                <div className="text-sm text-gray-500">{prospect.contact_name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStageColor(prospect.stage)}`}>
                                {prospect.stage.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-green-600">
                              ${prospect.deal_value.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${prospect.probability}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600">{prospect.probability}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{prospect.assigned_rep}</td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{prospect.next_follow_up}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prospects' && (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search prospects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="all">All Stages</option>
                    <option value="lead">Leads</option>
                    <option value="qualified">Qualified</option>
                    <option value="demo_scheduled">Demo Scheduled</option>
                    <option value="demo_completed">Demo Completed</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </select>
                </div>
              </div>

              {/* Prospects Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProspects.map((prospect) => (
                  <div key={prospect.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{prospect.company_name}</h3>
                          <p className="text-sm text-gray-600">{prospect.contact_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStageColor(prospect.stage)}`}>
                          {prospect.stage.replace('_', ' ')}
                        </span>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{prospect.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{prospect.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{prospect.assigned_rep}</span>
                      </div>
                      {prospect.website && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Globe className="w-4 h-4" />
                          <span>{prospect.website}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(prospect.priority)}`}>
                          {prospect.priority}
                        </span>
                        <span className="text-xs text-gray-500">{getSourceIcon(prospect.source)} {prospect.source}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          ${prospect.deal_value.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">{prospect.probability}% prob.</div>
                      </div>
                    </div>

                    {prospect.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {prospect.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {prospect.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{prospect.tags.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {prospect.notes && (
                      <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded">{prospect.notes}</p>
                    )}

                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1">
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </button>
                      <button className="flex-1 bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700 transition-colors flex items-center justify-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </button>
                      <button 
                        onClick={() => setSelectedProspect(prospect)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sales-reps' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {salesReps.map((rep) => (
                  <div key={rep.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-semibold text-lg">
                            {rep.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{rep.name}</h3>
                          <p className="text-sm text-gray-600">{rep.territory}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rep.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rep.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">${rep.revenue_mtd.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">Revenue MTD</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{rep.prospects_count}</div>
                        <div className="text-xs text-gray-600">Prospects</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{rep.conversion_rate}%</div>
                        <div className="text-xs text-gray-600">Conversion</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">${rep.avg_deal_size}</div>
                        <div className="text-xs text-gray-600">Avg Deal</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Quota Progress</span>
                        <span className="font-medium">{Math.round((rep.revenue_mtd / rep.quota_monthly) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((rep.revenue_mtd / rep.quota_monthly) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors">
                        View Details
                      </button>
                      <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'deals' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Active Deals</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probability</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Close</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rep</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {deals.filter(deal => !['closed_won', 'closed_lost'].includes(deal.stage)).map((deal) => (
                        <tr key={deal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{deal.prospect_name}</div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-green-600">
                            ${deal.deal_value.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStageColor(deal.stage)}`}>
                              {deal.stage.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${deal.probability}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{deal.probability}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(deal.expected_close).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{deal.assigned_rep}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-900">
                                <Edit3 className="w-4 h-4" />
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

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: 'Sales Performance Report', description: 'Detailed analysis of sales team performance', icon: BarChart3, color: 'bg-blue-500' },
                  { title: 'Revenue Forecast', description: 'Monthly and quarterly revenue projections', icon: TrendingUp, color: 'bg-green-500' },
                  { title: 'Pipeline Analysis', description: 'Current pipeline status and conversion rates', icon: Target, color: 'bg-purple-500' },
                  { title: 'Commission Report', description: 'Commission calculations and payments', icon: DollarSign, color: 'bg-yellow-500' },
                  { title: 'Activity Report', description: 'Sales activities and engagement metrics', icon: Clock, color: 'bg-red-500' },
                  { title: 'Territory Analysis', description: 'Performance breakdown by territory', icon: Globe, color: 'bg-indigo-500' }
                ].map((report, index) => {
                  const Icon = report.icon;
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow cursor-pointer">
                      <div className={`w-12 h-12 ${report.color} rounded-lg flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{report.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                      <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition-colors">
                        Generate Report
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
                <div className="space-y-4">
                  {[
                    { type: 'call', prospect: 'Elite Roofing Solutions', rep: 'Sarah Johnson', action: 'Completed demo call', time: '2 hours ago', outcome: 'positive' },
                    { type: 'email', prospect: 'Apex Roofing Co.', rep: 'David Chen', action: 'Sent proposal email', time: '4 hours ago', outcome: 'neutral' },
                    { type: 'meeting', prospect: 'Premier Roofing', rep: 'David Chen', action: 'Scheduled follow-up meeting', time: '6 hours ago', outcome: 'positive' },
                    { type: 'call', prospect: 'Skyline Roofing', rep: 'Sarah Johnson', action: 'Initial discovery call', time: '1 day ago', outcome: 'positive' },
                    { type: 'email', prospect: 'Reliable Roofing', rep: 'Tom Wilson', action: 'Sent welcome email', time: '1 day ago', outcome: 'neutral' },
                    { type: 'meeting', prospect: 'Summit Roofing', rep: 'Sarah Johnson', action: 'Closed deal meeting', time: '2 days ago', outcome: 'positive' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'call' ? 'bg-blue-100' :
                        activity.type === 'email' ? 'bg-purple-100' : 'bg-green-100'
                      }`}>
                        {activity.type === 'call' ? <PhoneCall className="w-5 h-5 text-blue-600" /> :
                         activity.type === 'email' ? <Mail className="w-5 h-5 text-purple-600" /> :
                         <Calendar className="w-5 h-5 text-green-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{activity.action}</h4>
                          <span className="text-sm text-gray-500">{activity.time}</span>
                        </div>
                        <p className="text-sm text-gray-600">{activity.prospect} • {activity.rep}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.outcome === 'positive' ? 'bg-green-500' :
                            activity.outcome === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></div>
                          <span className="text-xs text-gray-500 capitalize">{activity.outcome} outcome</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyPortal;