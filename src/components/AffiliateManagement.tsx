import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Plus, CreditCard as Edit3, Trash2, DollarSign, TrendingUp, Award, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { commissionService, type Affiliate, type CommissionEntry, type CommissionRateTemplate } from '../lib/commissionService';
import toast from 'react-hot-toast';

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  avgCommissionRate: number;
}

const AffiliateManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('affiliates');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [commissionEntries, setCommissionEntries] = useState<CommissionEntry[]>([]);
  const [rateTemplates, setRateTemplates] = useState<CommissionRateTemplate[]>([]);
  const [selectedAffiliates, setSelectedAffiliates] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [affiliatesData, commissionsData, templatesData] = await Promise.all([
        commissionService.getAffiliates(),
        commissionService.getCommissionEntries(),
        commissionService.getRateTemplates()
      ]);

      setAffiliates(affiliatesData);
      setCommissionEntries(commissionsData);
      setRateTemplates(templatesData);
    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAffiliate = async (affiliateData: Partial<Affiliate>) => {
    try {
      const newAffiliate = await commissionService.createAffiliate(affiliateData);
      setAffiliates(prev => [newAffiliate, ...prev]);
      setShowAddModal(false);
      toast.success('Affiliate created successfully!');
    } catch (error) {
      console.error('Error creating affiliate:', error);
      toast.error('Failed to create affiliate');
    }
  };

  const handleUpdateAffiliate = async (affiliateId: string, updates: Partial<Affiliate>) => {
    try {
      const updatedAffiliate = await commissionService.updateAffiliate(affiliateId, updates);
      setAffiliates(prev => prev.map(a => a.id === affiliateId ? updatedAffiliate : a));
      toast.success('Affiliate updated successfully!');
    } catch (error) {
      console.error('Error updating affiliate:', error);
      toast.error('Failed to update affiliate');
    }
  };

  const handleUpdateRates = async (affiliateId: string, upfrontRate: number, residualRate: number, reason?: string) => {
    try {
      const updatedAffiliate = await commissionService.updateAffiliateRates(affiliateId, upfrontRate, residualRate, reason);
      setAffiliates(prev => prev.map(a => a.id === affiliateId ? updatedAffiliate : a));
      toast.success('Commission rates updated successfully!');
    } catch (error) {
      console.error('Error updating rates:', error);
      toast.error('Failed to update commission rates');
    }
  };

  const handleBulkRateUpdate = async (updates: { upfront_rate?: number; residual_rate?: number; tier_level?: string; reason: string }) => {
    try {
      await commissionService.bulkUpdateRates({
        affiliate_ids: selectedAffiliates,
        ...updates
      });
      
      // Reload data to reflect changes
      await loadData();
      setSelectedAffiliates([]);
      setShowBulkModal(false);
      toast.success(`Updated rates for ${selectedAffiliates.length} affiliates`);
    } catch (error) {
      console.error('Error bulk updating rates:', error);
      toast.error('Failed to update affiliate rates');
    }
  };

  const handleDeleteAffiliate = async (affiliateId: string) => {
    if (!window.confirm('Are you sure you want to delete this affiliate? This action cannot be undone.')) {
      return;
    }

    try {
      await commissionService.deleteAffiliate(affiliateId);
      setAffiliates(prev => prev.filter(a => a.id !== affiliateId));
      toast.success('Affiliate deleted successfully');
    } catch (error) {
      console.error('Error deleting affiliate:', error);
      toast.error('Failed to delete affiliate');
    }
  };

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800',
      standard: 'bg-blue-100 text-blue-800'
    };
    return colors[tier as keyof typeof colors] || colors.standard;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getOnboardingColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      on_hold: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesSearch = affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         affiliate.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || affiliate.status === filterStatus;
    const matchesTier = filterTier === 'all' || affiliate.tier_level === filterTier;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const affiliateStats: AffiliateStats = {
    totalAffiliates: affiliates.length,
    activeAffiliates: affiliates.filter(a => a.status === 'active').length,
    totalCommissions: commissionEntries.reduce((sum, c) => sum + c.commission_amount, 0),
    paidCommissions: commissionEntries.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0),
    pendingCommissions: commissionEntries.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0),
    avgCommissionRate: affiliates.length > 0 ? affiliates.reduce((sum, a) => sum + a.upfront_rate, 0) / affiliates.length : 0
  };

  const tierDistribution = [
    { name: 'Bronze', value: affiliates.filter(a => a.tier_level === 'bronze').length, color: '#F97316' },
    { name: 'Silver', value: affiliates.filter(a => a.tier_level === 'silver').length, color: '#6B7280' },
    { name: 'Gold', value: affiliates.filter(a => a.tier_level === 'gold').length, color: '#F59E0B' },
    { name: 'Platinum', value: affiliates.filter(a => a.tier_level === 'platinum').length, color: '#8B5CF6' },
    { name: 'Standard', value: affiliates.filter(a => a.tier_level === 'standard').length, color: '#3B82F6' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-academy-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Affiliate Management</h2>
          <p className="text-gray-600">Manage affiliate commission rates and performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-academy-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-academy-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Affiliate</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { title: 'Total Affiliates', value: affiliateStats.totalAffiliates, icon: Users, color: 'bg-blue-500' },
          { title: 'Active', value: affiliateStats.activeAffiliates, icon: CheckCircle, color: 'bg-green-500' },
          { title: 'Total Commissions', value: `$${affiliateStats.totalCommissions.toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500' },
          { title: 'Paid', value: `$${affiliateStats.paidCommissions.toLocaleString()}`, icon: Award, color: 'bg-purple-500' },
          { title: 'Pending', value: `$${affiliateStats.pendingCommissions.toLocaleString()}`, icon: Clock, color: 'bg-yellow-500' },
          { title: 'Avg Rate', value: `${affiliateStats.avgCommissionRate.toFixed(1)}%`, icon: TrendingUp, color: 'bg-red-500' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'affiliates', label: 'Affiliates', count: affiliates.length },
              { id: 'commissions', label: 'Commissions', count: commissionEntries.length },
              { id: 'analytics', label: 'Analytics' },
              { id: 'templates', label: 'Rate Templates', count: rateTemplates.length }
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
          {activeTab === 'affiliates' && (
            <div className="space-y-6">
              {/* Filters and Search */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search affiliates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                    <select
                      value={filterTier}
                      onChange={(e) => setFilterTier(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                    >
                      <option value="all">All Tiers</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                      <option value="standard">Standard</option>
                    </select>
                  </div>
                </div>

                {selectedAffiliates.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {selectedAffiliates.length} selected
                    </span>
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="bg-academy-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-academy-blue-700 transition-colors"
                    >
                      Bulk Update
                    </button>
                  </div>
                )}
              </div>

              {/* Affiliates Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          checked={selectedAffiliates.length === filteredAffiliates.length && filteredAffiliates.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAffiliates(filteredAffiliates.map(a => a.id));
                            } else {
                              setSelectedAffiliates([]);
                            }
                          }}
                          className="rounded border-gray-300 text-academy-blue-600 focus:ring-academy-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAffiliates.map((affiliate) => (
                      <tr key={affiliate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedAffiliates.includes(affiliate.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAffiliates(prev => [...prev, affiliate.id]);
                              } else {
                                setSelectedAffiliates(prev => prev.filter(id => id !== affiliate.id));
                              }
                            }}
                            className="rounded border-gray-300 text-academy-blue-600 focus:ring-academy-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-academy-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-academy-blue-600 font-semibold">
                                {affiliate.name.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{affiliate.name}</div>
                              <div className="text-sm text-gray-500">{affiliate.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(affiliate.tier_level)}`}>
                            {affiliate.tier_level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            Upfront: {affiliate.upfront_rate}%
                          </div>
                          <div className="text-sm text-gray-500">
                            Residual: {affiliate.residual_rate}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${affiliate.total_commissions.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            ${affiliate.total_sales.toLocaleString()} sales
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(affiliate.status)}`}>
                              {affiliate.status}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOnboardingColor(affiliate.onboarding_status)}`}>
                              {affiliate.onboarding_status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingAffiliate(affiliate)}
                              className="text-academy-blue-600 hover:text-academy-blue-900"
                              title="Edit Affiliate"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAffiliate(affiliate.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Affiliate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tier Distribution */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Affiliate Tier Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={tierDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {tierDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Performance Chart */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={affiliates.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="total_commissions" fill="#ef4444" name="Total Commissions ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Affiliate Modal */}
      {showAddModal && (
        <AddAffiliateModal
          onClose={() => setShowAddModal(false)}
          onSave={handleCreateAffiliate}
          templates={rateTemplates}
        />
      )}

      {/* Edit Affiliate Modal */}
      {editingAffiliate && (
        <EditAffiliateModal
          affiliate={editingAffiliate}
          onClose={() => setEditingAffiliate(null)}
          onSave={(updates) => {
            handleUpdateAffiliate(editingAffiliate.id, updates);
            setEditingAffiliate(null);
          }}
          onUpdateRates={handleUpdateRates}
          templates={rateTemplates}
        />
      )}

      {/* Bulk Rate Update Modal */}
      {showBulkModal && (
        <BulkRateUpdateModal
          selectedAffiliates={selectedAffiliates}
          affiliates={affiliates}
          onClose={() => setShowBulkModal(false)}
          onSave={handleBulkRateUpdate}
          templates={rateTemplates}
        />
      )}
    </div>
  );
};

// Add Affiliate Modal Component
interface AddAffiliateModalProps {
  onClose: () => void;
  onSave: (affiliateData: Partial<Affiliate>) => void;
  templates: CommissionRateTemplate[];
}

const AddAffiliateModal: React.FC<AddAffiliateModalProps> = ({ onClose, onSave, templates }) => {
  const [formData, setFormData] = useState({
    affiliate_id: '',
    name: '',
    email: '',
    phone: '',
    tier_level: 'standard' as Affiliate['tier_level'],
    upfront_rate: 10,
    residual_rate: 5,
    status: 'active' as Affiliate['status']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      affiliate_id: parseInt(formData.affiliate_id)
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        tier_level: template.tier_level,
        upfront_rate: template.upfront_rate,
        residual_rate: template.residual_rate
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Affiliate</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate ID *</label>
            <input
              type="number"
              required
              value={formData.affiliate_id}
              onChange={(e) => setFormData(prev => ({ ...prev, affiliate_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apply Template</label>
            <select
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.upfront_rate}% / {template.residual_rate}%)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upfront Rate %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.upfront_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, upfront_rate: parseFloat(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Residual Rate %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.residual_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, residual_rate: parseFloat(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-academy-blue-600 text-white py-2 px-4 rounded-lg hover:bg-academy-blue-700 transition-colors"
            >
              Add Affiliate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Affiliate Modal Component
interface EditAffiliateModalProps {
  affiliate: Affiliate;
  onClose: () => void;
  onSave: (updates: Partial<Affiliate>) => void;
  onUpdateRates: (affiliateId: string, upfrontRate: number, residualRate: number, reason?: string) => void;
  templates: CommissionRateTemplate[];
}

const EditAffiliateModal: React.FC<EditAffiliateModalProps> = ({ 
  affiliate, 
  onClose, 
  onSave, 
  onUpdateRates, 
  templates 
}) => {
  const [formData, setFormData] = useState({
    name: affiliate.name,
    email: affiliate.email,
    phone: affiliate.phone || '',
    tier_level: affiliate.tier_level,
    upfront_rate: affiliate.upfront_rate,
    residual_rate: affiliate.residual_rate,
    status: affiliate.status,
    onboarding_status: affiliate.onboarding_status,
    notes: affiliate.notes || ''
  });
  const [rateChangeReason, setRateChangeReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if rates changed
    const ratesChanged = formData.upfront_rate !== affiliate.upfront_rate || 
                        formData.residual_rate !== affiliate.residual_rate;

    if (ratesChanged) {
      onUpdateRates(affiliate.id, formData.upfront_rate, formData.residual_rate, rateChangeReason);
    }

    // Update other fields
    const { upfront_rate: _upfront, residual_rate: _residual, ...otherUpdates } = formData;
    onSave(otherUpdates);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        tier_level: template.tier_level,
        upfront_rate: template.upfront_rate,
        residual_rate: template.residual_rate
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Affiliate</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apply Template</label>
            <select
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.upfront_rate}% / {template.residual_rate}%)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upfront Rate %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.upfront_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, upfront_rate: parseFloat(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Residual Rate %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.residual_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, residual_rate: parseFloat(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              />
            </div>
          </div>

          {(formData.upfront_rate !== affiliate.upfront_rate || formData.residual_rate !== affiliate.residual_rate) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rate Change</label>
              <input
                type="text"
                value={rateChangeReason}
                onChange={(e) => setRateChangeReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                placeholder="Performance improvement, tier promotion, etc."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier Level</label>
            <select
              value={formData.tier_level}
              onChange={(e) => setFormData(prev => ({ ...prev, tier_level: e.target.value as Affiliate['tier_level'] }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
            >
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="standard">Standard</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Affiliate['status'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Onboarding</label>
              <select
                value={formData.onboarding_status}
                onChange={(e) => setFormData(prev => ({ ...prev, onboarding_status: e.target.value as Affiliate['onboarding_status'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="Additional notes about this affiliate..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-academy-blue-600 text-white py-2 px-4 rounded-lg hover:bg-academy-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bulk Rate Update Modal Component
interface BulkRateUpdateModalProps {
  selectedAffiliates: string[];
  affiliates: Affiliate[];
  onClose: () => void;
  onSave: (updates: { upfront_rate?: number; residual_rate?: number; tier_level?: string; reason: string }) => void;
  templates: CommissionRateTemplate[];
}

const BulkRateUpdateModal: React.FC<BulkRateUpdateModalProps> = ({
  selectedAffiliates,
  affiliates,
  onClose,
  onSave,
  templates
}) => {
  const [updateType, setUpdateType] = useState<'rates' | 'tier' | 'template'>('rates');
  const [formData, setFormData] = useState({
    upfront_rate: '',
    residual_rate: '',
    tier_level: '',
    template_id: '',
    reason: ''
  });

  const selectedAffiliateData = affiliates.filter(a => selectedAffiliates.includes(a.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: { upfront_rate?: number; residual_rate?: number; tier_level?: string; reason: string } = {
      reason: formData.reason
    };

    if (updateType === 'rates') {
      if (formData.upfront_rate) updates.upfront_rate = parseFloat(formData.upfront_rate);
      if (formData.residual_rate) updates.residual_rate = parseFloat(formData.residual_rate);
    } else if (updateType === 'tier') {
      if (formData.tier_level) updates.tier_level = formData.tier_level;
    } else if (updateType === 'template') {
      const template = templates.find(t => t.id === formData.template_id);
      if (template) {
        updates.upfront_rate = template.upfront_rate;
        updates.residual_rate = template.residual_rate;
        updates.tier_level = template.tier_level;
      }
    }

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Bulk Update ({selectedAffiliates.length} affiliates)
        </h3>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Selected Affiliates:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {selectedAffiliateData.slice(0, 3).map(affiliate => (
              <div key={affiliate.id}>{affiliate.name} ({affiliate.tier_level})</div>
            ))}
            {selectedAffiliateData.length > 3 && (
              <div>...and {selectedAffiliateData.length - 3} more</div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Update Type</label>
            <select
              value={updateType}
              onChange={(e) => setUpdateType(e.target.value as 'rates' | 'tier' | 'template')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
            >
              <option value="rates">Update Rates</option>
              <option value="tier">Update Tier</option>
              <option value="template">Apply Template</option>
            </select>
          </div>

          {updateType === 'rates' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upfront Rate %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.upfront_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, upfront_rate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Residual Rate %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.residual_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, residual_rate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                  placeholder="Leave empty to keep current"
                />
              </div>
            </div>
          )}

          {updateType === 'tier' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Tier Level</label>
              <select
                value={formData.tier_level}
                onChange={(e) => setFormData(prev => ({ ...prev, tier_level: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              >
                <option value="">Select tier...</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="standard">Standard</option>
              </select>
            </div>
          )}

          {updateType === 'template' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apply Template</label>
              <select
                value={formData.template_id}
                onChange={(e) => setFormData(prev => ({ ...prev, template_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              >
                <option value="">Select template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.upfront_rate}% / {template.residual_rate}%)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change *</label>
            <input
              type="text"
              required
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="Performance improvement, tier promotion, etc."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-academy-blue-600 text-white py-2 px-4 rounded-lg hover:bg-academy-blue-700 transition-colors"
            >
              Update Affiliates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AffiliateManagement;