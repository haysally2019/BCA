import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  Key,
  Shield,
  Bell,
  CreditCard,
  Users,
  User,
  Link,
  Copy,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    personal_phone: '',
    company_email: '',
    personal_address: '',
    affiliatewp_id: ''
  });

  const { profile, user, signOut, updateProfile } = useAuthStore();


  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || profile.company_name || '',
        personal_phone: profile.personal_phone || profile.company_phone || '',
        company_email: profile.company_email || '',
        personal_address: profile.personal_address || profile.company_address || '',
        affiliatewp_id: profile.affiliatewp_id?.toString() || ''
      });
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        full_name: profileData.full_name,
        personal_phone: profileData.personal_phone,
        company_email: profileData.company_email,
        personal_address: profileData.personal_address,
        company_name: profileData.full_name,
        company_phone: profileData.personal_phone,
        company_address: profileData.personal_address,
        affiliatewp_id: profileData.affiliatewp_id ? parseInt(profileData.affiliatewp_id) : undefined
      };

      console.log('Saving profile updates:', updates);
      await updateProfile(updates);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error?.message || 'Failed to update profile';
      toast.error(`Failed to update profile: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const handleChangePassword = () => {
    // Simulate password change
    toast.success('Password change feature coming soon!');
  };

  const handleEnable2FA = () => {
    // Simulate 2FA setup
    toast.success('Two-factor authentication setup coming soon!');
  };

  const [webhookCopied, setWebhookCopied] = useState(false);

  const webhookEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliatewp-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setWebhookCopied(true);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'integrations', label: 'Integrations', icon: Link },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Tabs */}
        <div className="border-b border-gray-100">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={profileData.personal_phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, personal_phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={profileData.company_email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, company_email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="john.smith@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <textarea
                      value={profileData.personal_address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, personal_address: e.target.value }))}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AffiliateWP ID
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={profileData.affiliatewp_id}
                      onChange={(e) => setProfileData(prev => ({ ...prev, affiliatewp_id: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="12345"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Link your profile to AffiliateWP for commission tracking
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Integrations</h3>

              <div className="space-y-6">
                {/* AffiliateWP Integration */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-academy-blue-100 rounded-lg flex items-center justify-center">
                        <Link className="w-6 h-6 text-academy-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">AffiliateWP</h4>
                        <p className="text-sm text-gray-600">Track affiliate commissions and referrals</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Active</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook Endpoint
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm text-gray-700 overflow-x-auto">
                          {webhookEndpoint}
                        </div>
                        <button
                          onClick={copyWebhookUrl}
                          className="flex items-center space-x-2 px-4 py-3 bg-academy-blue-600 text-white rounded-lg hover:bg-academy-blue-700 transition-colors"
                          title="Copy webhook URL"
                        >
                          {webhookCopied ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="text-sm">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Add this webhook URL to your AffiliateWP settings to receive commission updates in real-time
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-blue-900 mb-1">Setup Instructions</h5>
                          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Log in to your AffiliateWP dashboard</li>
                            <li>Navigate to Settings → Webhooks</li>
                            <li>Click "Add New Webhook"</li>
                            <li>Paste the webhook endpoint URL above</li>
                            <li>Select events: Referral Created, Referral Approved, Referral Paid</li>
                            <li>Save the webhook configuration</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700 mb-1">Supported Events</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Referral created</li>
                          <li>• Commission approved</li>
                          <li>• Payment processed</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700 mb-1">Commission Types</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Upfront commissions</li>
                          <li>• Residual commissions</li>
                          <li>• Custom rate tiers</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700 mb-1">Features</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Automatic sync</li>
                          <li>• Rate management</li>
                          <li>• Performance tracking</li>
                        </ul>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700">Your AffiliateWP ID</div>
                          <div className="text-sm text-gray-600">
                            {profileData.affiliatewp_id || (
                              <span className="text-gray-400">Not configured</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('profile')}
                          className="text-sm text-academy-blue-600 hover:text-academy-blue-700 font-medium"
                        >
                          Update in Profile →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Future Integrations Placeholder */}
                <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                  <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">More Integrations Coming Soon</h4>
                  <p className="text-gray-600 mb-4">
                    Connect with popular tools to streamline your workflow
                  </p>
                  <p className="text-sm text-gray-500">
                    Future integrations: Zapier, Slack, HubSpot, Salesforce, and more
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
              
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Notification Settings</h4>
                <p className="text-gray-600 mb-4">
                  Configure your notification preferences for leads, calls, and appointments.
                </p>
                <p className="text-sm text-gray-500">
                  Coming soon - notification settings will be available in the next update.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
              
              <div className="space-y-6">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Change Password</h4>
                  <p className="text-sm text-gray-600 mb-4">Update your account password</p>
                  <button
                    onClick={handleChangePassword}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Change Password
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600 mb-4">Add an extra layer of security to your account</p>
                  <button
                    onClick={handleEnable2FA}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;