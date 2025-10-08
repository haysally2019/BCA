import React, { useState } from 'react';
import { Users, Mail, Phone, Tag, Trash2, UserCheck, MessageSquare } from 'lucide-react';
import BaseModal from './BaseModal';
import ConfirmationModal from './ConfirmationModal';

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: string[];
  itemType: 'leads' | 'deals' | 'prospects';
  onBulkAction: (action: string, data?: any) => Promise<void>;
  items: any[];
}

const BulkActionsModal: React.FC<BulkActionsModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  itemType,
  onBulkAction,
  items
}) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [actionData, setActionData] = useState<any>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedItemsData = items.filter(item => selectedItems.includes(item.id));

  const getAvailableActions = () => {
    const baseActions = [
      { id: 'export', label: 'Export Selected', icon: Users, description: 'Export selected items to CSV' },
      { id: 'delete', label: 'Delete Selected', icon: Trash2, description: 'Permanently delete selected items', dangerous: true }
    ];

    if (itemType === 'leads') {
      return [
        { id: 'update_status', label: 'Update Status', icon: UserCheck, description: 'Change status for all selected leads' },
        { id: 'assign_rep', label: 'Assign Rep', icon: Users, description: 'Assign a sales rep to selected leads' },
        { id: 'send_email', label: 'Send Email', icon: Mail, description: 'Send bulk email to selected leads' },
        { id: 'send_sms', label: 'Send SMS', icon: MessageSquare, description: 'Send bulk SMS to selected leads' },
        ...baseActions
      ];
    }

    if (itemType === 'deals') {
      return [
        { id: 'update_stage', label: 'Update Stage', icon: Target, description: 'Move deals to a different stage' },
        { id: 'update_probability', label: 'Update Probability', icon: TrendingUp, description: 'Update probability for selected deals' },
        ...baseActions
      ];
    }

    return baseActions;
  };

  const handleActionSubmit = async () => {
    if (!selectedAction) return;

    const action = getAvailableActions().find(a => a.id === selectedAction);
    if (action?.dangerous) {
      setShowConfirmation(true);
      return;
    }

    await executeAction();
  };

  const executeAction = async () => {
    try {
      setLoading(true);
      await onBulkAction(selectedAction, actionData);
      onClose();
    } catch (error) {
      console.error('Error executing bulk action:', error);
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const renderActionForm = () => {
    switch (selectedAction) {
      case 'update_status':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
            <select
              value={actionData.status || ''}
              onChange={(e) => setActionData({ status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        );

      case 'assign_rep':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Rep</label>
            <select
              value={actionData.rep_id || ''}
              onChange={(e) => setActionData({ rep_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select rep</option>
              <option value="current_user">Assign to me</option>
            </select>
          </div>
        );

      case 'send_email':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
              <input
                type="text"
                value={actionData.subject || ''}
                onChange={(e) => setActionData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
              <textarea
                value={actionData.body || ''}
                onChange={(e) => setActionData(prev => ({ ...prev, body: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email message"
              />
            </div>
          </div>
        );

      case 'send_sms':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMS Message</label>
            <textarea
              value={actionData.message || ''}
              onChange={(e) => setActionData({ message: e.target.value })}
              rows={3}
              maxLength={160}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="SMS message (max 160 characters)"
            />
            <div className="text-xs text-gray-500 mt-1">
              {(actionData.message || '').length}/160 characters
            </div>
          </div>
        );

      case 'update_stage':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Stage</label>
            <select
              value={actionData.stage_id || ''}
              onChange={(e) => setActionData({ stage_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select stage</option>
              <option value="stage1">Initial Contact</option>
              <option value="stage2">Qualification</option>
              <option value="stage3">Proposal</option>
              <option value="stage4">Negotiation</option>
              <option value="stage5">Closed Won</option>
            </select>
          </div>
        );

      case 'update_probability':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Probability (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={actionData.probability || ''}
              onChange={(e) => setActionData({ probability: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0-100"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const selectedActionData = getAvailableActions().find(a => a.id === selectedAction);

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={`Bulk Actions (${selectedItems.length} selected)`}
        size="md"
      >
        <div className="space-y-6">
          {/* Selected Items Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Selected {itemType}:</h4>
            <div className="text-sm text-blue-800 space-y-1 max-h-32 overflow-y-auto">
              {selectedItemsData.slice(0, 5).map(item => (
                <div key={item.id}>
                  {item.name || item.title || item.company_name} 
                  {item.value && ` - $${item.value}`}
                </div>
              ))}
              {selectedItemsData.length > 5 && (
                <div className="font-medium">...and {selectedItemsData.length - 5} more</div>
              )}
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Action</label>
            <div className="space-y-2">
              {getAvailableActions().map(action => {
                const Icon = action.icon;
                return (
                  <label key={action.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="action"
                      value={action.id}
                      checked={selectedAction === action.id}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <Icon className={`w-5 h-5 ${action.dangerous ? 'text-red-600' : 'text-gray-600'}`} />
                    <div>
                      <div className={`font-medium ${action.dangerous ? 'text-red-900' : 'text-gray-900'}`}>
                        {action.label}
                      </div>
                      <div className="text-sm text-gray-600">{action.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Form */}
          {selectedAction && renderActionForm()}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleActionSubmit}
              disabled={loading || !selectedAction}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${
                selectedActionData?.dangerous
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Processing...' : 'Execute Action'}
            </button>
          </div>
        </div>
      </BaseModal>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={executeAction}
        title="Confirm Bulk Action"
        message={`Are you sure you want to ${selectedActionData?.label.toLowerCase()} ${selectedItems.length} ${itemType}? This action cannot be undone.`}
        type="danger"
        confirmText="Yes, Continue"
        loading={loading}
      />
    </>
  );
};

export default BulkActionsModal;