import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, Briefcase, MapPin, DollarSign, Hash, Key, AlertCircle } from 'lucide-react';
import { teamService } from '../../lib/teamService';
import toast from 'react-hot-toast';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSuccess: () => void;
}

const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({
  isOpen,
  onClose,
  companyId,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [createLoginAccount, setCreateLoginAccount] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    territory: '',
    employee_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    employment_status: 'active' as const,
    user_role: 'sales_rep',
    commission_rate: 15,
    notes: ''
  });

  useEffect(() => {
    console.log('=== Password State Changed ===');
    console.log('showPassword:', showPassword);
    console.log('generatedPassword exists:', !!generatedPassword);
    console.log('generatedPassword length:', generatedPassword?.length || 0);
  }, [showPassword, generatedPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setLoading(true);

      if (createLoginAccount) {
        console.log('=== AddTeamMemberModal: Starting account creation ===');
        console.log('Creating account for:', formData.email);

        const result = await teamService.createTeamMemberWithAccount(companyId, {
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          user_role: formData.user_role,
          territory: formData.territory,
          commission_rate: formData.commission_rate,
          position: formData.position,
          department: formData.department,
          employee_id: formData.employee_id,
        });

        console.log('=== AddTeamMemberModal: Received result ===');
        console.log('Result object:', result);
        console.log('Temporary password exists:', !!result?.temporary_password);
        console.log('Temporary password value:', result?.temporary_password ? '[PRESENT]' : '[MISSING]');

        if (result && result.temporary_password) {
          console.log('=== Setting password state ===');
          console.log('Password length:', result.temporary_password.length);

          setGeneratedPassword(result.temporary_password);
          setShowPassword(true);

          console.log('State updated - showPassword: true, generatedPassword set');

          if (result.affiliatewp_auto_created && result.affiliatewp_id) {
            toast.success(`Account and AffiliateWP account (ID: ${result.affiliatewp_id}) created! Password displayed below.`);
          } else {
            toast.success('Account created! Temporary password displayed below.');
          }
        } else {
          console.warn('=== WARNING: No temporary password in result ===');
          console.warn('Result keys:', result ? Object.keys(result) : 'result is null/undefined');

          if (!result) {
            toast.error('Account creation failed - no result returned');
          } else if (!result.temporary_password) {
            toast.warning('Account created but password not available. User should use password reset.');
          } else {
            toast.success('Team member account created successfully! Welcome email sent.');
          }
        }
      } else {
        const memberData = {
          profile_id: companyId,
          employee_id: formData.employee_id,
          hire_date: formData.hire_date,
          employment_status: formData.employment_status,
          position: formData.position,
          department: formData.department,
          notes: formData.notes
        };

        await teamService.createTeamMember(companyId, memberData);
        toast.success('Team member added successfully (no login account created)');
      }

      onSuccess();

      if (!showPassword) {
        onClose();
      }

      if (!showPassword) {
        setFormData({
          name: '',
          email: '',
          phone: '',
          position: '',
          department: '',
          territory: '',
          employee_id: '',
          hire_date: new Date().toISOString().split('T')[0],
          employment_status: 'active',
          user_role: 'sales_rep',
          commission_rate: 15,
          notes: ''
        });
      }
    } catch (error: any) {
      console.error('=== Error in handleSubmit ===');
      console.error('Error adding team member:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);

      const errorMessage = error?.message || 'Failed to add team member';
      toast.error(errorMessage);

      if (errorMessage.includes('temporary password was not returned')) {
        toast.error('Account may have been created. Check the team list and use password reset if needed.', {
          duration: 8000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWithPassword = () => {
    setShowPassword(false);
    setGeneratedPassword(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      territory: '',
      employee_id: '',
      hire_date: new Date().toISOString().split('T')[0],
      employment_status: 'active',
      user_role: 'sales_rep',
      commission_rate: 15,
      notes: ''
    });
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add Team Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Debug panel - remove in production */}
          {!loading && (showPassword || generatedPassword) && !(showPassword && generatedPassword) && (
            <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
              <h4 className="font-bold text-red-900 mb-2">Debug: Password Display Issue Detected</h4>
              <div className="text-xs text-red-800 space-y-1">
                <p>showPassword: {String(showPassword)}</p>
                <p>generatedPassword exists: {String(!!generatedPassword)}</p>
                <p>generatedPassword value: {generatedPassword || 'NULL'}</p>
                <p className="mt-2 font-medium">Both values must be true/present for password to display.</p>
              </div>
            </div>
          )}

          {showPassword && generatedPassword ? (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-yellow-900 mb-2">Account Created Successfully!</h3>
                  <p className="text-sm text-yellow-800 mb-4">
                    Save this temporary password now. The user will need it to log in for the first time and will be required to change their password.
                    {' A welcome email has been sent to'} <strong>{formData.email}</strong> with login instructions.
                  </p>
                  <div className="bg-white border border-yellow-300 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded border">
                          {formData.email}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(formData.email)}
                          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Temporary Password</label>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded border">
                          {generatedPassword}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedPassword)}
                          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-700 mt-3">
                    <strong>Important:</strong> Make sure to save these credentials securely and share them with the team member through a secure channel. The user must change their password on first login.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseWithPassword}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4 inline mr-2" />
                Position
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., Sales Representative"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., Sales"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Territory
              </label>
              <select
                value={formData.territory}
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select Territory</option>
                <option value="West Coast">West Coast</option>
                <option value="East Coast">East Coast</option>
                <option value="Midwest">Midwest</option>
                <option value="South">South</option>
                <option value="National">National</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={formData.user_role}
                onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="sales_rep">Sales Rep</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Hire Date
              </label>
              <input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Commission Rate (%)
              </label>
              <input
                type="number"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                min="0"
                max="100"
                step="0.5"
              />
            </div>

          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Key className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createLoginAccount}
                    onChange={(e) => setCreateLoginAccount(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-blue-900">
                    Create login account for this team member
                  </span>
                </label>
                <p className="text-xs text-blue-700 mt-1 ml-6">
                  {createLoginAccount
                    ? 'A secure password and AffiliateWP account will be automatically generated. The password will be sent via email and displayed here. The user will be required to change their password on first login.'
                    : 'Team member will be added to your organization but will not have login access to the system.'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Additional notes about this team member..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : createLoginAccount ? 'Create Account & Add Member' : 'Add Team Member'}
            </button>
          </div>
          </>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddTeamMemberModal;
