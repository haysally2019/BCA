import React, { useState } from 'react';
import {
  Users,
  Mail,
  Phone,
  Tag,
  Trash2,
  UserCheck,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
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
  items,
}) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [actionData, setActionData] = useState<any>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ SAFETY: never assume items or selectedItems are defined/arrays
  const safeItems = Array.isArray(items) ? items : [];
  const safeSelectedItems = Array.isArray(selectedItems) ? selectedItems : [];

  const selectedItemsData = safeItems.filter((item) =>
    safeSelectedItems.includes(item.id)
  );

  const getAvailableActions = () => {
    const baseActions = [
      {
        id: 'export',
        label: 'Export Selected',
        icon: Users,
        description: 'Export selected items to CSV',
      },
      {
        id: 'delete',
        label: 'Delete Selected',
        icon: Trash2,
        description: 'Permanently delete selected items',
        dangerous: true,
      },
    ];

    if (itemType === 'leads') {
      return [
        {
          id: 'assign',
          label: 'Assign to Rep',
          icon: UserCheck,
          description: 'Assign selected leads to a sales rep',
        },
        {
          id: 'tag',
          label: 'Tag Leads',
          icon: Tag,
          description: 'Apply tags to organize your leads',
        },
        {
          id: 'send_email',
          label: 'Send Email Campaign',
          icon: Mail,
          description: 'Send a targeted email to these leads',
        },
        {
          id: 'send_sms',
          label: 'Send SMS Campaign',
          icon: Phone,
          description: 'Send a text message to these leads',
        },
        ...baseActions,
      ];
    }

    if (itemType === 'deals') {
      return [
        {
          id: 'update_stage',
          label: 'Update Stage',
          icon: Tag,
          description: 'Move deals to a different stage',
        },
        {
          id: 'update_probability',
          label: 'Update Probability',
          icon: TrendingUp,
          description: 'Update probability for selected deals',
        },
        ...baseActions,
      ];
    }

    return baseActions;
  };

  const handleActionSubmit = async () => {
    if (!selectedAction) return;
    setShowConfirmation(true);
  };

  const executeAction = async () => {
    if (!selectedAction) return;

    // If parent forgot to wire onBulkAction, fail gracefully
    if (!onBulkAction) {
      console.warn('BulkActionsModal: onBulkAction not provided');
      setShowConfirmation(false);
      return;
    }

    setLoading(true);
    try {
      await onBulkAction(selectedAction, {
        ...actionData,
        items: selectedItemsData,
      });
      setShowConfirmation(false);
      setSelectedAction('');
      setActionData({});
    } catch (error) {
      console.error('Bulk action error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderActionForm = () => {
    if (!selectedAction) return null;

    switch (selectedAction) {
      case 'assign':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Rep
            </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={actionData.subject || ''}
                onChange={(e) =>
                  setActionData((prev: any) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Body
              </label>
              <textarea
                value={actionData.body || ''}
                onChange={(e) =>
                  setActionData((prev: any) => ({
                    ...prev,
                    body: e.target.value,
                  }))
                }
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Write your message..."
              />
            </div>
          </div>
        );

      case 'send_sms':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS Message
              </label>
              <textarea
                value={actionData.message || ''}
                onChange={(e) =>
                  setActionData((prev: any) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Write your text message..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Keep under 160 characters for a single SMS.
              </p>
            </div>
          </div>
        );

      case 'tag':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={actionData.tags || ''}
              onChange={(e) =>
                setActionData((prev: any) => ({
                  ...prev,
                  tags: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Hot, Ohio, Commercial"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate tags with commas.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const actions = getAvailableActions();

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} title="Bulk Actions">
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
            <div className="font-medium mb-1">
              {safeSelectedItems.length} {itemType} selected
            </div>
            {safeSelectedItems.length > 0 && (
              <div className="text-xs text-gray-500">
                Bulk actions will apply to all selected {itemType}.
              </div>
            )}
          </div>

          {/* Action Picker */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-800">Choose an action</h3>
            <div className="grid grid-cols-1 gap-2">
              {actions.map((action) => {
                const Icon =
                  action.id === 'assign'
                    ? UserCheck
                    : action.id === 'send_email'
                    ? Mail
                    : action.id === 'send_sms'
                    ? MessageSquare
                    : action.id === 'tag'
                    ? Tag
                    : action.id === 'delete'
                    ? Trash2
                    : Users;

                const isSelected = selectedAction === action.id;

                return (
                  <label
                    key={action.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulk-action"
                      value={action.id}
                      checked={isSelected}
                      onChange={() => setSelectedAction(action.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {action.description}
                      </div>
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
              disabled={loading || !selectedAction || safeSelectedItems.length === 0}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </BaseModal>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={executeAction}
        title="Confirm Bulk Action"
        message={`Are you sure you want to apply "${selectedAction}" to ${safeSelectedItems.length} ${itemType}? This action cannot be undone.`}
        type="danger"
        confirmText="Yes, Continue"
        loading={loading}
      />
    </>
  );
};

export default BulkActionsModal;