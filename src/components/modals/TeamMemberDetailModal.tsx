import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Briefcase, TrendingUp, Target, Award, FileText, Activity, Key, Copy, AlertCircle } from 'lucide-react';
import { teamService, type TeamMember, type TeamPerformanceHistory, type TeamGoal, type TeamNote } from '../../lib/teamService';
import { supabaseService } from '../../lib/supabaseService';
import toast from 'react-hot-toast';

interface TeamMemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

const TeamMemberDetailModal: React.FC<TeamMemberDetailModalProps> = ({
  isOpen,
  onClose,
  member
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'goals' | 'activity'>('overview');
  const [performance, setPerformance] = useState<TeamPerformanceHistory[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [passwordResetAt, setPasswordResetAt] = useState<string | null>(null);

  useEffect(() => {
    if (member && isOpen) {
      loadMemberData();
    }
  }, [member, isOpen]);

  const loadMemberData = async () => {
    if (!member) return;

    try {
      setLoading(true);
      const [performanceData, goalsData, notesData, activityData, dealsData, commissionsData] = await Promise.all([
        teamService.getPerformanceHistory(member.id),
        teamService.getGoals(member.id),
        teamService.getNotes(member.id),
        teamService.getActivityLog(member.id, 20),
        supabaseService.getDeals(member.profile_id),
        supabaseService.getCommissions(member.profile_id)
      ]);

      setPerformance(performanceData);
      setGoals(goalsData);
      setNotes(notesData);
      setActivityLog(activityData);
      setDeals(dealsData);
      setCommissions(commissionsData);
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!member || !member.user_id) {
      toast.error('Cannot reset password: Missing user information');
      return;
    }

    if (!window.confirm(`Are you sure you want to reset the password for ${getDisplayName()}? This will generate a new temporary password.`)) {
      return;
    }

    try {
      setResettingPassword(true);
      const result = await teamService.resetTeamMemberPassword(member.id, member.user_id);

      setTemporaryPassword(result.temporary_password);
      setPasswordResetAt(result.reset_at);
      setShowPassword(true);

      toast.success('Password reset successfully! New temporary password displayed below.');

      await loadMemberData();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (!isOpen || !member) return null;

  const getDisplayName = () => {
    return member.profile?.full_name || member.profile?.company_name || 'Unknown';
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

  const wonDeals = deals.filter(d => d.status === 'won');
  const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const totalCommissions = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const conversionRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold text-2xl">
                {getDisplayName().split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{getDisplayName()}</h2>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.employment_status)}`}>
                  {member.employment_status.replace('_', ' ')}
                </span>
                {member.position && (
                  <span className="text-sm text-gray-600">{member.position}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'goals', label: 'Goals', icon: Target },
              { id: 'activity', label: 'Activity', icon: Activity }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {showPassword && temporaryPassword && (
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-yellow-900 mb-2">Password Reset Successful!</h3>
                      <p className="text-sm text-yellow-800 mb-4">
                        A new temporary password has been generated. Share these credentials securely with the team member. They must change their password on first login.
                      </p>
                      <div className="bg-white border border-yellow-300 rounded-lg p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                          <div className="flex items-center space-x-2">
                            <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded border break-all">
                              {member.profile?.company_email}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(member.profile?.company_email || '', 'Email')}
                              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 flex-shrink-0"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Temporary Password</label>
                          <div className="flex items-center space-x-2">
                            <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded border break-all">
                              {temporaryPassword}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(temporaryPassword, 'Password')}
                              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 flex-shrink-0"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {passwordResetAt && (
                          <div className="text-xs text-gray-600 mt-2">
                            Reset at: {new Date(passwordResetAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPassword(false);
                            setTemporaryPassword(null);
                          }}
                          className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{wonDeals.length}</div>
                  <div className="text-sm text-gray-600">Deals Closed</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{conversionRate}%</div>
                  <div className="text-sm text-gray-600">Conversion Rate</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  {member.user_id && (
                    <button
                      onClick={handleResetPassword}
                      disabled={resettingPassword}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Key className="w-4 h-4" />
                      <span>{resettingPassword ? 'Resetting...' : 'Reset Password'}</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="text-sm font-medium text-gray-900">{member.profile?.company_email || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="text-sm font-medium text-gray-900">{member.profile?.company_phone || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Territory</div>
                      <div className="text-sm font-medium text-gray-900">{member.profile?.territory || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Hire Date</div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(member.hire_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Department</div>
                      <div className="text-sm font-medium text-gray-900">{member.department || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Award className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Commission Rate</div>
                      <div className="text-sm font-medium text-gray-900">{member.profile?.commission_rate || 0}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {member.notes && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Notes
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{member.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total Commissions</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">${totalCommissions.toLocaleString()}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Avg Deal Size</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    ${wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length).toLocaleString() : 0}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Open Deals</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {deals.filter(d => d.status === 'open').length}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Performance Rating</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {member.performance_rating ? member.performance_rating.toFixed(1) : 'N/A'}
                  </div>
                </div>
              </div>

              {performance.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Performance History</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {performance.map((record) => (
                          <tr key={record.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.period_start).toLocaleDateString()} - {new Date(record.period_end).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              ${record.revenue_generated.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.deals_closed}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.conversion_rate ? `${record.conversion_rate}%` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.quota_attainment ? `${record.quota_attainment}%` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No performance history available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              {goals.length > 0 ? (
                goals.map((goal) => (
                  <div key={goal.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{goal.goal_type}</h4>
                        <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                        goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        goal.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500">Target</div>
                        <div className="text-sm font-medium text-gray-900">${goal.target_value.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Current</div>
                        <div className="text-sm font-medium text-gray-900">${goal.current_value.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Period</div>
                        <div className="text-sm font-medium text-gray-900 capitalize">{goal.goal_period}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Due Date</div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(goal.end_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((goal.current_value / goal.target_value) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {Math.round((goal.current_value / goal.target_value) * 100)}% Complete
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 rounded-lg p-12 text-center">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No goals set</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {activityLog.length > 0 ? (
                activityLog.map((activity) => (
                  <div key={activity.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {activity.activity_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 rounded-lg p-12 text-center">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No activity recorded</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamMemberDetailModal;
