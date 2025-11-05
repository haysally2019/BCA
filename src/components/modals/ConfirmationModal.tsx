import React from 'react';
import { AlertTriangle, Trash2, CheckCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'info':
        return <CheckCircle className="w-6 h-6 text-blue-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-gray-600" />;
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
      default:
        return 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h3 id="confirmation-title" className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p id="confirmation-message" className="text-gray-600 mb-6">{message}</p>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${getButtonStyles()}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;