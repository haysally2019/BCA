import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Phone, Mail, MapPin, Star, Calendar, Users, CreditCard as Edit3, Trash2, Eye, MessageSquare, DollarSign, Clock, Tag, Download, Upload, MoreVertical, CheckCircle, AlertCircle, TrendingUp, FileText, PhoneCall, Building2, Target, Zap, Award } from 'lucide-react';
import { supabaseService, type Prospect } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import BaseModal from './modals/BaseModal';
import ConfirmationModal from './modals/ConfirmationModal';
import ImportLeadsModal from './modals/ImportLeadsModal';
import { FormField, validateForm, prospectValidationSchema, type ValidationErrors } from './modals/FormValidation';
import toast from 'react-hot-toast';

const ProspectsManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRep, setFilterRep] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'pipeline'>('grid');
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [prospectToDelete, setProspectToDelete] = useState<Prospect | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [prospectToEdit, setProspectToEdit] = useState<Prospect | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { profile } = useAuthStore();
  const { prospects, loadDashboardData } = useDataStore();

  useEffect(() => {
    console.log('[ProspectsManager] showAddModal state changed:', showAddModal);
  }, [showAddModal]);

  useEffect(() => {
    if (profile) {
      loadDashboardData(profile.id);
    }
  }, [profile?.id]);

  const createSampleProspects = async () => {
    if (!profile) return;

    try {
      // Check if prospects already exist
      if (prospects.length > 0) {
        toast.info('Sample prospects already exist');
        return;
      }

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
          deal_value: 299,
          probability: 60,
          source: 'referral',
          company_size: '51-200 employees',
          current_crm: 'HubSpot',
          pain_points: ['Team training', 'Sales process'],
          decision_maker: false,
          notes: 'Needs approval from owner'
        }
      ];

      for (const prospectData of sampleProspects) {
        await supabaseService.createProspect(profile.id, prospectData);
      }

      useDataStore.getState().invalidateCache([`dashboard_${profile.id}_30d`]);
      toast.success('Sample prospects created!');
    } catch (error) {
      console.error('Error creating sample prospects:', error);
      toast.error('Failed to create sample prospects');
    }
  };

  const handleAddProspect = async (prospectData: any) => {
    console.log('[ProspectsManager] handleAddProspect called with data:', prospectData);
    if (!profile) {
      console.error('[ProspectsManager] No profile found');
      toast.error('No profile found');
      return;
    }

    try {
      console.log('[ProspectsManager] Creating prospect for profile:', profile.id);
      const newProspect = await supabaseService.createProspect(profile.id, prospectData);
      console.log('[ProspectsManager] Prospect created successfully:', newProspect);
      useDataStore.getState().invalidateCache([`dashboard_${profile.id}_30d`]);
      setShowAddModal(false);
      toast.success('Prospect added successfully!');
    } catch (error) {
      console.error('[ProspectsManager] Error adding prospect:', error);
      toast.error('Failed to add prospect');
    }
  };

  const handleDeleteProspect = async () => {
    if (!prospectToDelete) return;

    try {
      await supabaseService.deleteProspect(prospectToDelete.id);
      if (profile) {
        useDataStore.getState().invalidateCache([`dashboard_${profile.id}_30d`]);
      }
      setProspectToDelete(null);
      setShowDeleteConfirm(false);
      toast.success('Prospect deleted successfully');
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast.error('Failed to delete prospect');
    }
  };

  const handleExportProspects = () => {
    if (filteredProspects.length === 0) {
      toast.error('No prospects to export');
      return;
    }

    try {
      const csvHeaders = ['Company Name', 'Contact Name', 'Email', 'Phone', 'Status', 'Deal Value', 'Probability', 'Source', 'Company Size', 'Current CRM', 'Decision Maker', 'Notes'];
      const csvData = filteredProspects.map(prospect => [
        prospect.company_name,
        prospect.contact_name,
        prospect.email || '',
        prospect.phone,
        prospect.status,
        prospect.deal_value,
        prospect.probability,
        prospect.source,
        prospect.company_size || '',
        prospect.current_crm || '',
        prospect.decision_maker ? 'Yes' : 'No',
        prospect.notes || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `prospects_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredProspects.length} prospects to CSV`);
    } catch (error) {
      console.error('Error exporting prospects:', error);
      toast.error('Failed to export prospects');
    }
  };

  const handleImportProspects = async (importedData: any[]): Promise<{ success: number; failed: number; duplicates: number; dbDuplicates: number }> => {
    if (!profile) {
      throw new Error('No profile found');
    }

    try {
      const prospectsData = importedData.map(data => {
        const prospectData: Partial<Prospect> = {
          company_name: data.company_name || data.name || 'Unknown Company',
          contact_name: data.contact_name || data.name || '',
          phone: data.phone || '',
          email: data.email,
          status: data.status || 'lead',
          deal_value: data.deal_value || data.estimated_value || 199,
          probability: data.probability || data.score || 50,
          source: data.source || 'import',
          company_size: data.company_size,
          current_crm: data.current_crm,
          pain_points: data.pain_points,
          decision_maker: data.decision_maker || false,
          notes: data.notes,
          next_follow_up_date: data.next_follow_up_date,
        };

        return prospectData;
      });

      const result = await supabaseService.bulkCreateProspects(profile.id, prospectsData);

      if (result.success.length > 0) {
        useDataStore.getState().invalidateCache([`dashboard_${profile.id}_30d`]);
      }

      return {
        success: result.success.length,
        failed: result.failed.length,
        duplicates: 0,
        dbDuplicates: result.duplicates.length
      };
    } catch (error) {
      console.error('Error importing prospects:', error);
      throw error;
    }
  };

  const handleProspectAction = (prospectId: string, action: string) => {
    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    setOpenMenuId(null); // Close menu after action

    switch (action) {
      case 'view':
        toast.info(`Viewing details for ${prospect.company_name}`);
        break;
      case 'edit':
        setProspectToEdit(prospect);
        setShowEditModal(true);
        break;
      case 'delete':
        setProspectToDelete(prospect);
        setShowDeleteConfirm(true);
        break;
      case 'call':
        toast.success(`Calling ${prospect.contact_name} at ${prospect.phone}`);
        break;
      case 'email':
        if (prospect.email) {
          window.location.href = `mailto:${prospect.email}?subject=Blue Collar Academy Training Programs&body=Hi ${prospect.contact_name},\n\nI wanted to follow up on our training programs...`;
        } else {
          toast.error('No email address available');
        }
        break;
      case 'proposal':
        toast.success(`Generating proposal for ${prospect.company_name}`);
        break;
    }
  };

  const handleEditProspect = async (prospectData: any) => {
    if (!prospectToEdit) return;

    try {
      await supabaseService.updateProspect(prospectToEdit.id, prospectData);
      if (profile) {
        useDataStore.getState().invalidateCache([`dashboard_${profile.id}_30d`]);
      }
      setShowEditModal(false);
      setProspectToEdit(null);
      toast.success('Prospect updated successfully!');
    } catch (error) {
      console.error('Error updating prospect:', error);
      toast.error('Failed to update prospect');
    }
  };

  const handleUpdateProspectStatus = async (prospectId: string, newStatus: Prospect['status']) => {
    try {
      const updatedProspect = await supabaseService.updateProspect(prospectId, { status: newStatus });
      if (profile) {
        useDataStore.getState().invalidateCache([`dashboard_${profile.id}_30d`]);
      }
      toast.success('Prospect status updated!');
    } catch (error) {
      console.error('Error updating prospect:', error);
      toast.error('Failed to update prospect status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      lead: 'bg-gray-100 text-gray-800 border-gray-200',
      qualified: 'bg-blue-100 text-blue-800 border-blue-200',
      proposal_sent: 'bg-orange-100 text-orange-800 border-orange-200',
      negotiating: 'bg-red-100 text-red-800 border-red-200',
      closed_won: 'bg-green-100 text-green-800 border-green-200',
      closed_lost: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.lead;
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    if (probability >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch = prospect.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prospect.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (prospect.email && prospect.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || prospect.status === filterStatus;
    const matchesRep = filterRep === 'all' || prospect.assigned_rep_id === filterRep;
    return matchesSearch && matchesStatus && matchesRep;
  });

  const prospectStats = {
    total: prospects.length,
    qualified: prospects.filter(p => p.status === 'qualified').length,
    proposals: prospects.filter(p => p.status === 'proposal_sent').length,
    negotiating: prospects.filter(p => p.status === 'negotiating').length,
    won: prospects.filter(p => p.status === 'closed_won').length,
    totalValue: prospects.reduce((sum, p) => sum + p.deal_value, 0),
    weightedValue: prospects.reduce((sum, p) => sum + (p.deal_value * p.probability / 100), 0)
  };

  if (prospects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads & Prospects</h1>
            <p className="text-gray-600 mt-1">Manage your Blue Collar Academy training prospects</p>
          </div>
          <button
            onClick={() => {
              console.log('[ProspectsManager] Add Prospect button clicked (empty state)');
              setShowAddModal(true);
            }}
            type="button"
            className="bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prospect</span>
          </button>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No prospects yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first prospect to track training opportunities.</p>
          <button
            onClick={() => {
              console.log('[ProspectsManager] Add Your First Prospect button clicked');
              setShowAddModal(true);
            }}
            type="button"
            className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-all duration-200 shadow-sm"
          >
            Add Your First Prospect
          </button>
        </div>

        {/* Add Prospect Modal */}
        {showAddModal && (
          <AddProspectModal
            onClose={() => setShowAddModal(false)}
            onSave={handleAddProspect}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads & Prospects</h1>
          <p className="text-gray-600 mt-1">Manage your Blue Collar Academy training prospects</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            type="button"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExportProspects}
            type="button"
            className="hidden md:flex bg-gray-100 text-gray-700 px-4 py-2 rounded-lg items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              console.log('[ProspectsManager] Add Prospect button clicked (has prospects)');
              setShowAddModal(true);
            }}
            type="button"
            className="bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prospect</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { title: 'Total Prospects', value: prospectStats.total, icon: Users, color: 'bg-blue-500' },
          { title: 'Qualified', value: prospectStats.qualified, icon: CheckCircle, color: 'bg-green-500' },
          { title: 'Proposals', value: prospectStats.proposals, icon: FileText, color: 'bg-orange-500' },
          { title: 'Negotiating', value: prospectStats.negotiating, icon: Target, color: 'bg-red-500' },
          { title: 'Won', value: prospectStats.won, icon: TrendingUp, color: 'bg-emerald-500' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Value Cards & Affiliate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Total Pipeline Value</h3>
            <DollarSign className="w-6 h-6 text-blue-200" />
          </div>
          <div className="text-3xl font-bold mb-2">${prospectStats.totalValue.toLocaleString()}</div>
          <p className="text-blue-100 text-sm">Across {prospectStats.total} prospects</p>
        </div>
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Weighted Pipeline</h3>
            <Target className="w-6 h-6 text-green-200" />
          </div>
          <div className="text-3xl font-bold mb-2">${prospectStats.weightedValue.toLocaleString()}</div>
          <p className="text-green-100 text-sm">Probability-adjusted value</p>
        </div>
        {profile?.affiliatewp_id && (
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Affiliate Earnings</h3>
              <Award className="w-6 h-6 text-emerald-200" />
            </div>
            <div className="text-3xl font-bold mb-2">${(profile.affiliatewp_unpaid_earnings || 0).toLocaleString()}</div>
            <p className="text-emerald-100 text-sm">{profile.affiliatewp_referrals || 0} referrals tracked</p>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 min-w-64">
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              >
                <option value="all">All Status</option>
                <option value="lead">Lead</option>
                <option value="qualified">Qualified</option>
                <option value="proposal_sent">Proposal Sent</option>
                <option value="negotiating">Negotiating</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
              <select
                value={filterRep}
                onChange={(e) => setFilterRep(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              >
                <option value="all">All Reps</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'pipeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Target className="w-4 h-4 inline mr-1" />
                Pipeline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prospects Views */}
      {viewMode === 'pipeline' ? (
        /* Pipeline Kanban View */
        <div className="grid grid-cols-6 gap-4 overflow-x-auto">
          {['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'].map((status) => {
            const stageProspects = filteredProspects.filter(p => p.status === status);
            const stageValue = stageProspects.reduce((sum, p) => sum + (p.deal_value || 0), 0);
            const statusLabels: Record<string, string> = {
              new: 'New',
              contacted: 'Contacted',
              qualified: 'Qualified',
              proposal_sent: 'Proposal Sent',
              won: 'Won',
              lost: 'Lost'
            };
            const statusColors: Record<string, string> = {
              new: 'bg-red-100 border-red-300',
              contacted: 'bg-yellow-100 border-yellow-300',
              qualified: 'bg-green-100 border-green-300',
              proposal_sent: 'bg-purple-100 border-purple-300',
              won: 'bg-emerald-100 border-emerald-300',
              lost: 'bg-gray-100 border-gray-300'
            };

            return (
              <div key={status} className="flex flex-col min-w-[280px]">
                <div className={`${statusColors[status]} border-2 rounded-lg p-3 mb-3`}>
                  <h3 className="font-semibold text-gray-900 mb-1">{statusLabels[status]}</h3>
                  <div className="text-sm text-gray-600">
                    {stageProspects.length} leads • ${stageValue}/mo
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  {stageProspects.map((prospect) => (
                    <div key={prospect.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-900">{prospect.company_name}</h4>
                          <p className="text-xs text-gray-600">{prospect.contact_name}</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === prospect.id ? null : prospect.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === prospect.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button
                                onClick={() => handleProspectAction(prospect.id, 'view')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => handleProspectAction(prospect.id, 'edit')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleProspectAction(prospect.id, 'delete')}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-b-lg"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-gray-900">${prospect.deal_value}/mo</span>
                        <span className={`font-semibold ${getProbabilityColor(prospect.probability)}`}>{prospect.probability}%</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{prospect.email}</span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleProspectAction(prospect.id, 'call')}
                          className="flex-1 bg-academy-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-academy-blue-700 transition-colors flex items-center justify-center"
                        >
                          <PhoneCall className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleProspectAction(prospect.id, 'email')}
                          className="flex-1 bg-academy-red-600 text-white py-1 px-2 rounded text-xs hover:bg-academy-red-700 transition-colors flex items-center justify-center"
                        >
                          <Mail className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleProspectAction(prospect.id, 'proposal')}
                          className="flex-1 bg-gray-100 text-gray-700 py-1 px-2 rounded text-xs hover:bg-gray-200 transition-colors flex items-center justify-center"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {stageProspects.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid/List View */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProspects.map((prospect) => (
          <div key={prospect.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-academy-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-academy-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{prospect.company_name}</h3>
                  <p className="text-sm text-gray-600">{prospect.contact_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(prospect.status)}`}>
                  {prospect.status.replace('_', ' ')}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === prospect.id ? null : prospect.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === prospect.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => handleProspectAction(prospect.id, 'view')}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 rounded-t-lg"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleProspectAction(prospect.id, 'edit')}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleProspectAction(prospect.id, 'delete')}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-b-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="truncate">{prospect.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{prospect.phone}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{prospect.company_size}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Tag className="w-4 h-4" />
                <span>{prospect.source}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">${prospect.deal_value}/mo</div>
                <div className="text-xs text-gray-500">Deal Value</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${getProbabilityColor(prospect.probability)}`}>
                  {prospect.probability}%
                </div>
                <div className="text-xs text-gray-500">Probability</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">Rep</div>
                <div className="text-xs text-gray-500">Rep</div>
              </div>
            </div>

            {prospect.pain_points && prospect.pain_points.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Pain Points:</p>
                <div className="flex flex-wrap gap-1">
                  {prospect.pain_points.slice(0, 2).map((point, index) => (
                    <span key={index} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      {point}
                    </span>
                  ))}
                  {prospect.pain_points.length > 2 && (
                    <span className="text-xs text-gray-500">+{prospect.pain_points.length - 2} more</span>
                  )}
                </div>
              </div>
            )}

            {prospect.notes && (
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded">{prospect.notes}</p>
            )}

            <div className="flex space-x-2">
              <button 
                onClick={() => handleProspectAction(prospect.id, 'call')}
                className="flex-1 bg-academy-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-academy-blue-700 transition-colors flex items-center justify-center space-x-1"
              >
                <PhoneCall className="w-3 h-3" />
                <span>Call</span>
              </button>
              <button 
                onClick={() => handleProspectAction(prospect.id, 'email')}
                className="flex-1 bg-academy-red-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-academy-red-700 transition-colors flex items-center justify-center space-x-1"
              >
                <Mail className="w-3 h-3" />
                <span>Email</span>
              </button>
              <button 
                onClick={() => handleProspectAction(prospect.id, 'proposal')}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
              >
                <FileText className="w-3 h-3" />
                <span>Proposal</span>
              </button>
            </div>
            
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => handleProspectAction(prospect.id, 'delete')}
                className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add Prospect Modal */}
      {showAddModal && (
        <AddProspectModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddProspect}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setProspectToDelete(null);
        }}
        onConfirm={handleDeleteProspect}
        title="Delete Prospect"
        message={`Are you sure you want to delete "${prospectToDelete?.company_name}"? This action cannot be undone.`}
        type="danger"
        confirmText="Delete Prospect"
      />

      {/* Import Modal */}
      <ImportLeadsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportProspects}
      />

      {/* Edit Prospect Modal */}
      {showEditModal && prospectToEdit && (
        <EditProspectModal
          prospect={prospectToEdit}
          onClose={() => {
            setShowEditModal(false);
            setProspectToEdit(null);
          }}
          onSave={handleEditProspect}
        />
      )}
    </div>
  );
};

interface AddProspectModalProps {
  onClose: () => void;
  onSave: (prospectData: any) => void;
}

const AddProspectModal: React.FC<AddProspectModalProps> = ({ onClose, onSave }) => {
  console.log('[AddProspectModal] Modal component rendered');

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    source: 'website',
    deal_value: 199,
    probability: 50,
    company_size: '',
    current_crm: '',
    pain_points: '',
    decision_maker: false,
    notes: '',
    next_follow_up_date: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AddProspectModal] Form submitted with data:', formData);

    // Validate form
    const validationErrors = validateForm(formData, prospectValidationSchema);
    console.log('[AddProspectModal] Validation errors:', validationErrors);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the errors below');
      return;
    }

    setLoading(true);

    const painPointsArray = formData.pain_points
      ? formData.pain_points.split(',').map(point => point.trim()).filter(point => point)
      : [];

    const prospectToSave = {
      ...formData,
      pain_points: painPointsArray,
      next_follow_up_date: formData.next_follow_up_date || undefined,
    };

    console.log('[AddProspectModal] Calling onSave with:', prospectToSave);
    onSave(prospectToSave);

    setLoading(false);
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Add New Prospect"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Company Name"
            name="company_name"
            value={formData.company_name}
            onChange={handleFieldChange}
            error={errors.company_name}
            placeholder="Elite Roofing Co."
            required
          />

          <FormField
            label="Contact Name"
            name="contact_name"
            value={formData.contact_name}
            onChange={handleFieldChange}
            error={errors.contact_name}
            placeholder="John Smith"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleFieldChange}
            error={errors.email}
            placeholder="john@eliteroofing.com"
          />

          <FormField
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleFieldChange}
            error={errors.phone}
            placeholder="(555) 123-4567"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Deal Value (Monthly)"
            name="deal_value"
            type="number"
            value={formData.deal_value}
            onChange={handleFieldChange}
            error={errors.deal_value}
            placeholder="199"
            min={0}
          />

          <FormField
            label="Probability"
            name="probability"
            type="number"
            value={formData.probability}
            onChange={handleFieldChange}
            error={errors.probability}
            placeholder="50"
            min={0}
            max={100}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Source"
            name="source"
            type="select"
            value={formData.source}
            onChange={handleFieldChange}
            options={[
              { value: 'website', label: 'Website' },
              { value: 'referral', label: 'Referral' },
              { value: 'cold_call', label: 'Cold Call' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'trade_show', label: 'Trade Show' }
            ]}
          />

          <FormField
            label="Company Size"
            name="company_size"
            type="select"
            value={formData.company_size}
            onChange={handleFieldChange}
            options={[
              { value: '1-10 employees', label: '1-10 employees' },
              { value: '11-50 employees', label: '11-50 employees' },
              { value: '51-200 employees', label: '51-200 employees' },
              { value: '200+ employees', label: '200+ employees' }
            ]}
            placeholder="Select company size"
          />
        </div>

        <FormField
          label="Current CRM"
          name="current_crm"
          value={formData.current_crm}
          onChange={handleFieldChange}
          placeholder="None, Salesforce, HubSpot, etc."
        />

        <FormField
          label="Pain Points"
          name="pain_points"
          value={formData.pain_points}
          onChange={handleFieldChange}
          placeholder="Lead management, Follow-up tracking (comma separated)"
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="decision_maker"
            checked={formData.decision_maker}
            onChange={(e) => setFormData(prev => ({ ...prev, decision_maker: e.target.checked }))}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="decision_maker" className="text-sm font-medium text-gray-700">
            Decision Maker
          </label>
        </div>

        <FormField
          label="Notes"
          name="notes"
          type="textarea"
          value={formData.notes}
          onChange={handleFieldChange}
          placeholder="Additional notes about this prospect..."
          rows={3}
        />

        <FormField
          label="Next Follow-up Date"
          name="next_follow_up_date"
          type="date"
          value={formData.next_follow_up_date}
          onChange={handleFieldChange}
        />

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-700 text-white py-2 px-4 rounded-lg hover:bg-red-800 transition-all duration-200 shadow-sm disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Prospect'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

interface EditProspectModalProps {
  prospect: Prospect;
  onClose: () => void;
  onSave: (prospectData: any) => void;
}

const EditProspectModal: React.FC<EditProspectModalProps> = ({ prospect, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    company_name: prospect.company_name,
    contact_name: prospect.contact_name,
    email: prospect.email || '',
    phone: prospect.phone,
    source: prospect.source,
    deal_value: prospect.deal_value,
    probability: prospect.probability,
    company_size: prospect.company_size || '',
    current_crm: prospect.current_crm || '',
    pain_points: Array.isArray(prospect.pain_points) ? prospect.pain_points.join(', ') : '',
    decision_maker: prospect.decision_maker || false,
    notes: prospect.notes || '',
    next_follow_up_date: prospect.next_follow_up_date || '',
    status: prospect.status,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formData, prospectValidationSchema);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the errors below');
      return;
    }

    setLoading(true);

    const painPointsArray = formData.pain_points
      ? formData.pain_points.split(',').map(point => point.trim()).filter(point => point)
      : [];

    const prospectToSave = {
      ...formData,
      pain_points: painPointsArray,
      next_follow_up_date: formData.next_follow_up_date || undefined,
    };

    onSave(prospectToSave);
    setLoading(false);
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Edit Prospect"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Company Name"
            name="company_name"
            value={formData.company_name}
            onChange={handleFieldChange}
            error={errors.company_name}
            placeholder="Elite Roofing Co."
            required
          />

          <FormField
            label="Contact Name"
            name="contact_name"
            value={formData.contact_name}
            onChange={handleFieldChange}
            error={errors.contact_name}
            placeholder="John Smith"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleFieldChange}
            error={errors.email}
            placeholder="john@eliteroofing.com"
          />

          <FormField
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleFieldChange}
            error={errors.phone}
            placeholder="(555) 123-4567"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Status"
            name="status"
            type="select"
            value={formData.status}
            onChange={handleFieldChange}
            options={[
              { value: 'lead', label: 'Lead' },
              { value: 'qualified', label: 'Qualified' },
              { value: 'proposal_sent', label: 'Proposal Sent' },
              { value: 'negotiating', label: 'Negotiating' },
              { value: 'closed_won', label: 'Closed Won' },
              { value: 'closed_lost', label: 'Closed Lost' }
            ]}
          />

          <FormField
            label="Deal Value (Monthly)"
            name="deal_value"
            type="number"
            value={formData.deal_value}
            onChange={handleFieldChange}
            error={errors.deal_value}
            placeholder="199"
            min={0}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Probability"
            name="probability"
            type="number"
            value={formData.probability}
            onChange={handleFieldChange}
            error={errors.probability}
            placeholder="50"
            min={0}
            max={100}
          />

          <FormField
            label="Source"
            name="source"
            type="select"
            value={formData.source}
            onChange={handleFieldChange}
            options={[
              { value: 'website', label: 'Website' },
              { value: 'referral', label: 'Referral' },
              { value: 'cold_call', label: 'Cold Call' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'trade_show', label: 'Trade Show' }
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Company Size"
            name="company_size"
            type="select"
            value={formData.company_size}
            onChange={handleFieldChange}
            options={[
              { value: '1-10 employees', label: '1-10 employees' },
              { value: '11-50 employees', label: '11-50 employees' },
              { value: '51-200 employees', label: '51-200 employees' },
              { value: '200+ employees', label: '200+ employees' }
            ]}
            placeholder="Select company size"
          />

          <FormField
            label="Current CRM"
            name="current_crm"
            value={formData.current_crm}
            onChange={handleFieldChange}
            placeholder="None, Salesforce, HubSpot, etc."
          />
        </div>

        <FormField
          label="Pain Points"
          name="pain_points"
          value={formData.pain_points}
          onChange={handleFieldChange}
          placeholder="Lead management, Follow-up tracking (comma separated)"
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="decision_maker_edit"
            checked={formData.decision_maker}
            onChange={(e) => setFormData(prev => ({ ...prev, decision_maker: e.target.checked }))}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="decision_maker_edit" className="text-sm font-medium text-gray-700">
            Decision Maker
          </label>
        </div>

        <FormField
          label="Notes"
          name="notes"
          type="textarea"
          value={formData.notes}
          onChange={handleFieldChange}
          placeholder="Additional notes about this prospect..."
          rows={3}
        />

        <FormField
          label="Next Follow-up Date"
          name="next_follow_up_date"
          type="date"
          value={formData.next_follow_up_date}
          onChange={handleFieldChange}
        />

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-700 text-white py-2 px-4 rounded-lg hover:bg-red-800 transition-all duration-200 shadow-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default ProspectsManager;