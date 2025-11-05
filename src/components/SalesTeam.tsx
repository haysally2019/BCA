import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Mail, MapPin, DollarSign, Award, Star, CreditCard as Edit, Eye, MoreVertical, UserPlus, Settings, Target, TrendingUp, Trash2, RefreshCw, Upload } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { teamService, type TeamMember } from '../lib/teamService';
import { supabaseService } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import AddTeamMemberModal from './modals/AddTeamMemberModal';
import EditTeamMemberModal from './modals/EditTeamMemberModal';
import TeamMemberDetailModal from './modals/TeamMemberDetailModal';
import ImportLeadsModal from './modals/ImportLeadsModal';
import toast from 'react-hot-toast';

interface PerformanceDataPoint {
  name: string;
  revenue: number;
  deals: number;
  conversion: number;
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  totalRevenue: number;
  totalCommissions: number;
  avgConversion: number;
  totalDeals: number;
}

const SalesTeam: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterTerritory, setFilterTerritory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportLeadsModal, setShowImportLeadsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberStats, setMemberStats] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile) {
      loadTeamData();
    }
  }, [profile]);

  const loadTeamData = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const [members, deals, commissions] = await Promise.all([
        teamService.getTeamMembers(profile.id),
        supabaseService.getDeals(profile.id),
        supabaseService.getCommissions(profile.id)
      ]);

      const statsMap = new Map();
      members.forEach(member => {
        const memberDeals = deals.filter(d => d.assigned_rep_id === member.profile_id);
        const wonDeals = memberDeals.filter(d => d.status === 'won');
        const memberCommissions = commissions.filter(c => c.rep_id === member.profile_id);

        const ytdRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
        const ytdCommission = memberCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
        const conversionRate = memberDeals.length > 0 ? Math.round((wonDeals.length / memberDeals.length) * 100) : 0;
        const avgDealSize = wonDeals.length > 0 ? Math.round(ytdRevenue / wonDeals.length) : 0;

        statsMap.set(member.id, {
          ytdRevenue,
          ytdCommission,
          dealsClosedCount: wonDeals.length,
          conversionRate,
          avgDealSize,
          openDealsCount: memberDeals.filter(d => d.status === 'open').length
        });
      });

      setTeamMembers(members);
      setMemberStats(statsMap);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const syncAllAffiliateMetrics = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-affiliatewp-metrics');

      if (error) {
        throw error;
      }

      if (data?.credentials_missing) {
        toast.error('AffiliateWP credentials not configured. Please configure in Settings.');
        return;
      }

      if (data?.success) {
        await loadTeamData();
        toast.success(`Successfully synced ${data.updated_count} affiliate accounts!`);
      } else {
        throw new Error(data?.error || 'Failed to sync metrics');
      }
    } catch (error: any) {
      console.error('Error syncing affiliate metrics:', error);
      toast.error(error?.message || 'Failed to sync affiliate metrics');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!window.confirm(`Are you sure you want to remove ${member.profile?.company_name} from the team?`)) {
      return;
    }

    try {
      await teamService.deleteTeamMember(member.id);
      toast.success('Team member removed successfully');
      loadTeamData();
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'sales_rep': return 'bg-blue-100 text-blue-800';
      case 'sales_manager': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const stats = memberStats.get(member.id) || {};
    const matchesSearch =
      member.profile?.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profile?.company_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profile?.territory?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.profile?.user_role === filterRole;
    const matchesTerritory = filterTerritory === 'all' || member.profile?.territory === filterTerritory;
    const matchesStatus = filterStatus === 'all' || member.employment_status === filterStatus;
    return matchesSearch && matchesRole && matchesTerritory && matchesStatus;
  });

  const performanceData: PerformanceDataPoint[] = filteredMembers
    .filter(m => m.profile?.user_role === 'sales_rep' || m.profile?.user_role === 'sales_manager')
    .map(member => {
      const stats = memberStats.get(member.id) || {};
      return {
        name: member.profile?.company_name.split(' ')[0] || 'Unknown',
        revenue: stats.ytdRevenue || 0,
        deals: stats.dealsClosedCount || 0,
        conversion: stats.conversionRate || 0
      };
    })
    .slice(0, 10);

  const teamStats: TeamStats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.employment_status === 'active').length,
    totalRevenue: Array.from(memberStats.values()).reduce((sum, stats) => sum + (stats.ytdRevenue || 0), 0),
    totalCommissions: Array.from(memberStats.values()).reduce((sum, stats) => sum + (stats.ytdCommission || 0), 0),
    avgConversion: teamMembers.length > 0
      ? Array.from(memberStats.values()).reduce((sum, stats) => sum + (stats.conversionRate || 0), 0) / teamMembers.length
      : 0,
    totalDeals: Array.from(memberStats.values()).reduce((sum, stats) => sum + (stats.dealsClosedCount || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales Team Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your sales team and track performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowImportLeadsModal(true)}
            className="bg-emerald-600 text-white px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-emerald-700 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Import Leads</span>
          </button>
          <button
            onClick={syncAllAffiliateMetrics}
            disabled={syncing}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Affiliates'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { title: 'Team Members', value: teamStats.totalMembers, icon: Users, color: 'bg-blue-500' },
          { title: 'Active Members', value: teamStats.activeMembers, icon: UserPlus, color: 'bg-green-500' },
          { title: 'Total Revenue', value: `$${teamStats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500' },
          { title: 'Commissions', value: `$${teamStats.totalCommissions.toLocaleString()}`, icon: Award, color: 'bg-purple-500' },
          { title: 'Avg Conversion', value: `${teamStats.avgConversion.toFixed(1)}%`, icon: TrendingUp, color: 'bg-orange-500' },
          { title: 'Total Deals', value: teamStats.totalDeals, icon: Target, color: 'bg-red-500' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-600">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {performanceData.length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Team Performance Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#ef4444" name="Revenue ($)" />
              <Bar dataKey="deals" fill="#3b82f6" name="Deals Closed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 w-full sm:min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">All Roles</option>
                <option value="sales_rep">Sales Rep</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={filterTerritory}
                onChange={(e) => setFilterTerritory(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">All Territories</option>
                <option value="West Coast">West Coast</option>
                <option value="East Coast">East Coast</option>
                <option value="Midwest">Midwest</option>
                <option value="South">South</option>
                <option value="National">National</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="bg-gray-400 rounded-sm"></div>
                  <div className="bg-gray-400 rounded-sm"></div>
                  <div className="bg-gray-400 rounded-sm"></div>
                  <div className="bg-gray-400 rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <div className="w-4 h-4 flex flex-col space-y-1">
                  <div className="bg-gray-400 h-0.5 rounded"></div>
                  <div className="bg-gray-400 h-0.5 rounded"></div>
                  <div className="bg-gray-400 h-0.5 rounded"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredMembers.map((member) => {
            const stats = memberStats.get(member.id) || {};
            return (
              <div key={member.id} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-semibold text-lg">
                        {member.profile?.company_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.profile?.company_name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`inline-block text-xs px-2 py-1 rounded-full ${getRoleColor(member.profile?.user_role || '')}`}>
                          {(member.profile?.user_role || '').replace('_', ' ')}
                        </span>
                        <span className={`inline-block text-xs px-2 py-1 rounded-full ${getStatusColor(member.employment_status)}`}>
                          {member.employment_status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{member.profile?.company_email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{member.profile?.territory || 'Unassigned'}</span>
                  </div>
                  {member.position && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Target className="w-4 h-4" />
                      <span>{member.position}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">${stats.ytdRevenue?.toLocaleString() || 0}</div>
                    <div className="text-xs text-gray-500">YTD Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{stats.dealsClosedCount || 0}</div>
                    <div className="text-xs text-gray-500">Deals Closed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{stats.conversionRate || 0}%</div>
                    <div className="text-xs text-gray-500">Conversion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{stats.openDealsCount || 0}</div>
                    <div className="text-xs text-gray-500">Open Deals</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedMember(member);
                      setShowDetailModal(true);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMember(member);
                      setShowEditModal(true);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteMember(member)}
                    className="bg-red-100 text-red-600 py-2 px-3 rounded-lg text-sm hover:bg-red-200 transition-colors flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Territory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">YTD Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => {
                  const stats = memberStats.get(member.id) || {};
                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold">
                              {member.profile?.company_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{member.profile?.company_name}</div>
                            <div className="text-sm text-gray-500">{member.profile?.company_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.profile?.user_role || '')}`}>
                          {(member.profile?.user_role || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.employment_status)}`}>
                          {member.employment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.profile?.territory || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ${stats.ytdRevenue?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats.dealsClosedCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats.conversionRate || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setShowDetailModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setShowEditModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first team member</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      )}

      <AddTeamMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        companyId={profile?.id || ''}
        onSuccess={loadTeamData}
      />

      <EditTeamMemberModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onSuccess={loadTeamData}
      />

      <TeamMemberDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
      />

      <ImportLeadsModal
        isOpen={showImportLeadsModal}
        onClose={() => setShowImportLeadsModal(false)}
        managerId={profile?.id || ''}
        teamMembers={teamMembers}
        onSuccess={() => {
          toast.success('Leads imported and distributed successfully!');
          setShowImportLeadsModal(false);
        }}
      />
    </div>
  );
};

export default SalesTeam;
