import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Calendar, Star, DollarSign, Tag, Clock, Activity, MessageSquare, PhoneCall, ArrowRight, ThumbsUp, FileText, Trophy, X } from 'lucide-react';
import BaseModal from './BaseModal';
import { supabaseService, type Lead, type LeadActivity } from '../../lib/supabaseService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onUpdate: (leadId: string, updates: Partial<Lead>) => void;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onUpdate
}) => {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'call',
    subject: '',
    description: '',
    outcome: '',
    next_action: ''
  });
  const { profile } = useAuthStore();

  useEffect(() => {
    if (isOpen && lead.id) {
      loadActivities();
    }
  }, [isOpen, lead.id]);

  const loadActivities = async () => {
    try {
      const activitiesData = await supabaseService.getLeadActivities(lead.id);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setLoading(true);
      await supabaseService.logLeadActivity(lead.id, profile.user_id, newActivity.type, {
        subject: newActivity.subject,
        description: newActivity.description,
        outcome: newActivity.outcome,
        next_action: newActivity.next_action
      });

      // Reload activities
      await loadActivities();
      
      // Reset form
      setNewActivity({
        type: 'call',
        subject: '',
        description: '',
        outcome: '',
        next_action: ''
      });

      toast.success('Activity logged successfully!');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await onUpdate(lead.id, { status: newStatus });
      toast.success('Lead status updated!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-red-100 text-red-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      won: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.new;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <PhoneCall className="w-4 h-4 text-green-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getQuickActions = (status: string) => {
    switch (status) {
      case 'new':
        return [
          { label: 'Mark Contacted', status: 'contacted', icon: Phone, color: 'bg-blue-600 hover:bg-blue-700' },
          { label: 'Qualify Lead', status: 'qualified', icon: ThumbsUp, color: 'bg-green-600 hover:bg-green-700' }
        ];
      case 'contacted':
        return [
          { label: 'Qualify Lead', status: 'qualified', icon: ThumbsUp, color: 'bg-green-600 hover:bg-green-700' },
          { label: 'Mark Won', status: 'won', icon: Trophy, color: 'bg-emerald-600 hover:bg-emerald-700' }
        ];
      case 'qualified':
        return [
          { label: 'Mark Won', status: 'won', icon: Trophy, color: 'bg-emerald-600 hover:bg-emerald-700' },
          { label: 'Mark Lost', status: 'lost', icon: X, color: 'bg-gray-600 hover:bg-gray-700' }
        ];
      case 'won':
        return [];
      case 'lost':
        return [
          { label: 'Reopen Lead', status: 'new', icon: ArrowRight, color: 'bg-blue-600 hover:bg-blue-700' }
        ];
      default:
        return [];
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lead Details - ${lead.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Lead Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{lead.name}</h4>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                  {lead.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{lead.email}</span>
                </div>
              )}
              {lead.address && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{lead.address}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Star className="w-4 h-4" />
                <span>Score: {lead.score}/100</span>
              </div>
              {lead.estimated_value && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>Estimated Value: ${lead.estimated_value.toLocaleString()}</span>
                </div>
              )}
              {lead.roof_type && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Tag className="w-4 h-4" />
                  <span>Roof Type: {lead.roof_type}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Quick Status Actions</label>
              {getQuickActions(lead.status).length > 0 ? (
                <div className="space-y-2">
                  {getQuickActions(lead.status).map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.status}
                        onClick={() => handleStatusChange(action.status)}
                        className={`w-full ${action.color} text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm font-medium`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">
                    {lead.status === 'won' ? 'Lead Won! No further actions needed.' : 'No quick actions available'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="lead-status-select" className="block text-sm font-medium text-gray-700 mb-2">All Status Options</label>
              <select
                id="lead-status-select"
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                aria-label="Change lead status"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {lead.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                  {lead.notes}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500">
              <div>Created: {new Date(lead.created_at).toLocaleDateString()}</div>
              <div>Last Updated: {new Date(lead.updated_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Activities Section */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Activities</h4>
          
          {/* Add Activity Form */}
          <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3">Log New Activity</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="activity-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  id="activity-type"
                  value={newActivity.type}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                </select>
              </div>
              <div>
                <label htmlFor="activity-subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  id="activity-subject"
                  type="text"
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Activity subject"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="activity-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                id="activity-description"
                value={newActivity.description}
                onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="What happened during this activity?"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="activity-outcome" className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                <select
                  id="activity-outcome"
                  value={newActivity.outcome}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, outcome: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select outcome</option>
                  <option value="success">Success</option>
                  <option value="no_answer">No Answer</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="callback_requested">Callback Requested</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>
              <div>
                <label htmlFor="activity-next-action" className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
                <input
                  id="activity-next-action"
                  type="text"
                  value={newActivity.next_action}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, next_action: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Follow up in 3 days"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging...' : 'Log Activity'}
            </button>
          </form>

          {/* Activities List */}
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No activities recorded yet</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h6 className="text-sm font-medium text-gray-900">
                        {activity.subject || activity.activity_type.replace('_', ' ')}
                      </h6>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {activity.outcome && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          Outcome: {activity.outcome}
                        </span>
                      )}
                      {activity.next_action && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Next: {activity.next_action}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default LeadDetailsModal;