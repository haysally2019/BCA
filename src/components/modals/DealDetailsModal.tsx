import React, { useState, useEffect } from 'react';
import { Building2, DollarSign, Calendar, TrendingUp, User, Activity, Clock, Target } from 'lucide-react';
import BaseModal from './BaseModal';
import { supabaseService, type Deal, type DealActivity } from '../../lib/supabaseService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface DealDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal;
  onUpdate: (dealId: string, updates: Partial<Deal>) => void;
}

const DealDetailsModal: React.FC<DealDetailsModalProps> = ({
  isOpen,
  onClose,
  deal,
  onUpdate
}) => {
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'note',
    description: ''
  });
  const { profile } = useAuthStore();

  useEffect(() => {
    if (isOpen && deal.id) {
      loadActivities();
    }
  }, [isOpen, deal.id]);

  const loadActivities = async () => {
    try {
      const activitiesData = await supabaseService.getDealActivities(deal.id);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading deal activities:', error);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setLoading(true);
      await supabaseService.logDealActivity(deal.id, profile.user_id, newActivity.type, {
        description: newActivity.description
      });

      // Reload activities
      await loadActivities();
      
      // Reset form
      setNewActivity({
        type: 'note',
        description: ''
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
      const updates: Partial<Deal> = { status: newStatus as Deal['status'] };
      
      if (newStatus === 'won' || newStatus === 'lost') {
        updates.actual_close_date = new Date().toISOString().split('T')[0];
      }

      await onUpdate(deal.id, updates);
      toast.success('Deal status updated!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'stage_change':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'value_change':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'note':
        return <Activity className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Deal Details - ${deal.title}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Deal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{deal.title}</h4>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deal.status)}`}>
                  {deal.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>Value: ${deal.value.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Target className="w-4 h-4" />
                <span>Probability: {deal.probability}%</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Expected Close: {deal.expected_close_date 
                    ? new Date(deal.expected_close_date).toLocaleDateString() 
                    : 'Not set'}
                </span>
              </div>
              {deal.actual_close_date && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Actual Close: {new Date(deal.actual_close_date).toLocaleDateString()}</span>
                </div>
              )}
              {deal.lead && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Contact: {deal.lead.name}</span>
                </div>
              )}
            </div>

            {deal.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                  {deal.description}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
              <select
                value={deal.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              <div>Stage: {deal.stage?.name || 'Unknown'}</div>
              <div>Created: {new Date(deal.created_at).toLocaleDateString()}</div>
              <div>Last Updated: {new Date(deal.updated_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Activities Section */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Deal Activities</h4>
          
          {/* Add Activity Form */}
          <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3">Log New Activity</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="proposal">Proposal</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newActivity.description}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What happened with this deal?"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !newActivity.description.trim()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                      <h6 className="text-sm font-medium text-gray-900 capitalize">
                        {activity.activity_type.replace('_', ' ')}
                      </h6>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    )}
                    {(activity.previous_value || activity.new_value) && (
                      <div className="text-xs text-gray-500 mt-1">
                        Value changed: ${activity.previous_value} → ${activity.new_value}
                      </div>
                    )}
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

export default DealDetailsModal;