import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface ChangePasswordProps {
  onSuccess: () => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuthStore();

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { label: 'Contains uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: 'Contains lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: 'Contains number', test: (pwd: string) => /[0-9]/.test(pwd) },
    { label: 'Contains special character', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const updateProfileFlagWithRetry = async (userId: string, maxRetries = 3): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Attempt ${attempt}/${maxRetries}: Updating profile must_change_password flag...`);

      const { data: updateData, error: profileError, count } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', userId)
        .select();

      if (profileError) {
        console.error(`Attempt ${attempt} - Error updating profile flag:`, profileError);
        if (attempt === maxRetries) {
          throw new Error(`Failed to update profile after ${maxRetries} attempts: ${profileError.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      console.log(`Attempt ${attempt} - Update response:`, { updateData, rowCount: updateData?.length });

      if (!updateData || updateData.length === 0) {
        console.warn(`Attempt ${attempt} - No rows were updated. This may indicate an RLS policy issue.`);
        if (attempt === maxRetries) {
          throw new Error('Profile update failed: No rows were updated. Please contact support.');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      console.log(`Attempt ${attempt} - Profile flag updated successfully`);

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: verifyProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('user_id', userId)
        .maybeSingle();

      if (verifyError) {
        console.error(`Attempt ${attempt} - Error verifying profile update:`, verifyError);
        if (attempt === maxRetries) {
          throw new Error(`Failed to verify profile update: ${verifyError.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      console.log(`Attempt ${attempt} - Verified must_change_password value:`, verifyProfile?.must_change_password);

      if (verifyProfile?.must_change_password === false) {
        console.log(`Attempt ${attempt} - SUCCESS: Profile flag verified as cleared`);
        return true;
      } else {
        console.warn(`Attempt ${attempt} - Flag still set to: ${verifyProfile?.must_change_password}`);
        if (attempt === maxRetries) {
          throw new Error('Profile flag verification failed: Flag is still set after update');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      toast.error('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      console.log('=== Starting password change process ===');

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }
      console.log('Current user ID:', currentUser.id);

      const { data: beforeProfile } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      console.log('BEFORE password change - must_change_password:', beforeProfile?.must_change_password);

      console.log('Step 1: Updating password...');
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
        }
      });

      if (passwordError) {
        console.error('Password update failed:', passwordError);
        throw new Error(`Failed to update password: ${passwordError.message}`);
      }
      console.log('Step 1: Password updated successfully');

      console.log('Step 2: Updating profile flag with retry logic...');
      const flagUpdateSuccess = await updateProfileFlagWithRetry(currentUser.id);

      if (!flagUpdateSuccess) {
        throw new Error('Failed to clear must_change_password flag after multiple attempts');
      }
      console.log('Step 2: Profile flag cleared and verified');

      console.log('Step 3: Refreshing session...');
      try {
        await supabase.auth.refreshSession();
        console.log('Step 3: Session refreshed');
      } catch (refreshErr) {
        console.warn('Session refresh warning (non-critical):', refreshErr);
      }

      console.log('Step 4: Refreshing profile data in store...');
      await refreshProfile();
      console.log('Step 4: Profile refreshed in store');

      const { data: afterProfile } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      console.log('AFTER password change - must_change_password:', afterProfile?.must_change_password);

      if (afterProfile?.must_change_password !== false) {
        console.error('CRITICAL: Flag is still set after all updates!');
        throw new Error('Password changed but flag update verification failed. Please contact support.');
      }

      console.log('=== Password change process completed successfully ===');
      toast.success('Password changed successfully! Redirecting...');

      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Calling onSuccess callback');
      onSuccess();
    } catch (error: any) {
      console.error('=== Error changing password ===');
      console.error('Error details:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Change Your Password</h1>
          <p className="text-gray-600 text-sm">
            For security reasons, you must change your temporary password before accessing the system.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Confirm new password"
                required
              />
            </div>
            {confirmPassword.length > 0 && (
              <div className="mt-2 flex items-center space-x-2">
                {passwordsMatch ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Password Requirements:</span>
            </div>
            {passwordRequirements.map((req, index) => {
              const isMet = req.test(newPassword);
              return (
                <div key={index} className="flex items-center space-x-2">
                  {isMet ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${isMet ? 'text-green-600' : 'text-gray-600'}`}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading || !allRequirementsMet || !passwordsMatch}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Changing Password...</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Change Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
