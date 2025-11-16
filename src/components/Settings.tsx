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
  Link as LinkIcon,
  Copy,
  CheckCheck,
  Wallet,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Info,
  Bug,
  RefreshCw,
  Activity
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import {
  validateBankAccountInfo,
  validatePayPalInfo,
  maskAccountNumber,
  getLastFourDigits,
  formatRoutingNumber,
  formatSwiftCode,
  formatIBAN,
} from '../lib/payoutValidation';
import { testAuthHook } from '../utils/testAuthHook';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileData, setProfileData] = useState({
    full_name: '',
    personal_phone: '',
    company_email: '',
    personal_address: '',
    affiliatewp_id: ''
  });
  const [payoutData, setPayoutData] = useState({
    payout_method: 'bank_transfer',
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    routing_number: '',
    swift_code: '',
    iban: '',
    bank_country: 'US',
    bank_currency: 'USD',
    paypal_email: ''
  });
  const [payoutInfo, setPayoutInfo] = useState<any>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadingSyncStatus, setLoadingSyncStatus] = useState(false);

  const { profile, user, signOut, updateProfile, refreshProfile } = useAuthStore();

  const copyAffiliateUrl = async () => {
    const url = profile?.affiliate_referral_url || 'https://bluecollaracademy.info/?ref=3';
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Affiliate URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = () => {
    toast.info('Two-factor authentication setup coming soon!');
  };

  useEffect(() => {
    const fetchPayoutInfo = async () => {
      if (!profile?.id) return;

      try {
        const { data, error } = await supabase
          .from('payout_information')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('is_default', true)
          .maybeSingle();

        if (error) {
          console.error('Error fetching payout info:', error);
          return;
        }

        if (data) {
          setPayoutInfo(data);
          setPayoutData({
            payout_method: data.payout_method || 'bank_transfer',
            account_holder_name: data.account_holder_name || '',
            bank_name: data.bank_name || '',
            account_number: '',
            routing_number: data.routing_number || '',
            swift_code: data.swift_code || '',
            iban: data.iban || '',
            bank_country: data.bank_country || 'US',
            bank_currency: data.bank_currency || 'USD',
            paypal_email: data.paypal_email || ''
          });
        }
      } catch (error) {
        console.error('Exception fetching payout info:', error);
      }
    };

    if (activeTab === 'payout') {
      fetchPayoutInfo();
    }
  }, [activeTab, profile]);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    if (payoutData.payout_method === 'bank_transfer') {
      const validation = validateBankAccountInfo({
        accountHolderName: payoutData.account_holder_name,
        bankName: payoutData.bank_name,
        accountNumber: payoutData.account_number,
        routingNumber: payoutData.routing_number,
        swiftCode: payoutData.swift_code,
        iban: payoutData.iban,
        bankCountry: payoutData.bank_country,
        bankCurrency: payoutData.bank_currency,
      });

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast.error('Please correct the validation errors');
        return;
      }
    } else if (payoutData.payout_method === 'paypal') {
      const validation = validatePayPalInfo({
        paypalEmail: payoutData.paypal_email,
      });

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast.error('Please enter a valid PayPal email');
        return;
      }
    }

    setPayoutLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const payload: any = {
        profile_id: profile?.id,
        payout_method: payoutData.payout_method,
      };

      if (payoutData.payout_method === 'paypal') {
        payload.paypal_email = payoutData.paypal_email;
      } else if (payoutData.payout_method === 'bank_transfer') {
        payload.bank_info = {
          account_holder_name: payoutData.account_holder_name,
          bank_name: payoutData.bank_name,
          bank_country: payoutData.bank_country,
          bank_currency: payoutData.bank_currency,
        };
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/update-affiliate-payout-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update payout information');
      }

      if (payoutData.account_number) {
        const last4 = getLastFourDigits(payoutData.account_number);
        const { error: localUpdateError } = await supabase
          .from('payout_information')
          .update({
            account_number_last4: last4,
            routing_number: payoutData.routing_number || null,
            swift_code: payoutData.swift_code || null,
            iban: payoutData.iban || null,
          })
          .eq('id', result.payout_id);

        if (localUpdateError) {
          console.error('Error updating local payout info:', localUpdateError);
        }
      }

      toast.success('Payout information saved successfully!');
      await refreshProfile();

      const { data: updatedData } = await supabase
        .from('payout_information')
        .select('*')
        .eq('profile_id', profile?.id)
        .eq('is_default', true)
        .maybeSingle();

      if (updatedData) {
        setPayoutInfo(updatedData);
      }

      setPayoutData(prev => ({ ...prev, account_number: '' }));
    } catch (error: any) {
      console.error('Error updating payout info:', error);
      toast.error(error.message || 'Failed to update payout information');
    } finally {
      setPayoutLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    setLoadingSyncStatus(true);
    try {
      const { data, error } = await supabase.rpc('get_metrics_sync_status');
      if (!error && data) {
        setSyncStatus(data);
      }
    } catch (err) {
      console.error('[Settings] sync status error', err);
    } finally {
      setLoadingSyncStatus(false);
    }
  };

  const triggerManualSync = async () => {
    setSyncing(true);
    const toastId = toast.loading('Syncing AffiliateWP metrics...');

    try {
      const { data, error } = await supabase.rpc('sync_affiliatewp_metrics');

      if (error) throw error;

      if (data?.success) {
        toast.success('Metrics sync initiated! Check Dashboard in a few moments.', { id: toastId });
        setTimeout(() => {
          loadSyncStatus();
        }, 3000);
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (err: any) {
      console.error('[Settings] manual sync error', err);
      toast.error(err.message || 'Failed to sync metrics', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'metrics') {
      loadSyncStatus();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'payout', label: 'Payout Info', icon: Wallet },
    { id: 'metrics', label: 'Metrics Sync', icon: Activity },
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

      {/* Affiliate URL Card */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 shadow-sm border border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Your Affiliate URL</h3>
            <p className="text-xs text-gray-600">Share this link to track referrals</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
          <code className="flex-1 text-sm text-gray-700 font-mono overflow-x-auto whitespace-nowrap">
            {profile?.affiliate_referral_url || 'https://bluecollaracademy.info/?ref=3'}
          </code>
          <button
            onClick={copyAffiliateUrl}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <CheckCheck className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
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

                {/* AffiliateWP Metrics Display */}
                {profile?.affiliatewp_id && profile.commission_rate > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="font-medium text-gray-900 mb-3">AffiliateWP Metrics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Commission Rate:</span>
                        <span className="ml-2 font-semibold text-gray-900">{profile.commission_rate}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Earnings:</span>
                        <span className="ml-2 font-semibold text-gray-900">${profile.affiliatewp_earnings || 0}</span>
                      </div>
                    </div>
                    {profile.last_metrics_sync && (
                      <p className="text-xs text-gray-500 mt-3">
                        Last synced: {new Date(profile.last_metrics_sync).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

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

          {activeTab === 'payout' && (
            <div className="max-w-3xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Information</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">How Payouts Work</h4>
                    <p className="text-sm text-blue-800">
                      Set up your payout method to receive commission payments. Your information is securely stored and synced with AffiliateWP.
                      Payouts are typically processed within 3-5 business days after reaching the minimum threshold.
                    </p>
                  </div>
                </div>
              </div>

              {payoutInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {payoutInfo.verification_status === 'verified' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <h4 className="font-medium text-gray-900">
                      {payoutInfo.verification_status === 'verified' ? 'Payout Method Verified' : 'Payout Method Pending Verification'}
                    </h4>
                  </div>
                  {payoutInfo.account_number_last4 && (
                    <p className="text-sm text-gray-700">
                      Account ending in {payoutInfo.account_number_last4}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    Last updated: {new Date(payoutInfo.updated_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              <form onSubmit={handlePayoutSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payout Method
                  </label>
                  <select
                    value={payoutData.payout_method}
                    onChange={(e) => setPayoutData(prev => ({ ...prev, payout_method: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>

                {payoutData.payout_method === 'bank_transfer' && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Bank Account Information</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={payoutData.account_holder_name}
                        onChange={(e) => setPayoutData(prev => ({ ...prev, account_holder_name: e.target.value }))}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors.accountHolderName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="John Smith"
                      />
                      {validationErrors.accountHolderName && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.accountHolderName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={payoutData.bank_name}
                        onChange={(e) => setPayoutData(prev => ({ ...prev, bank_name: e.target.value }))}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors.bankName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Chase Bank"
                      />
                      {validationErrors.bankName && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.bankName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bank Country
                        </label>
                        <select
                          value={payoutData.bank_country}
                          onChange={(e) => setPayoutData(prev => ({ ...prev, bank_country: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                          <option value="ES">Spain</option>
                          <option value="IT">Italy</option>
                          <option value="AU">Australia</option>
                          <option value="NZ">New Zealand</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={payoutData.bank_currency}
                          onChange={(e) => setPayoutData(prev => ({ ...prev, bank_currency: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                        </select>
                      </div>
                    </div>

                    {payoutData.bank_country === 'US' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Number
                          </label>
                          <input
                            type="text"
                            value={payoutData.account_number}
                            onChange={(e) => setPayoutData(prev => ({ ...prev, account_number: e.target.value }))}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              validationErrors.accountNumber ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter account number"
                          />
                          {validationErrors.accountNumber && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.accountNumber}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Routing Number
                          </label>
                          <input
                            type="text"
                            value={payoutData.routing_number}
                            onChange={(e) => setPayoutData(prev => ({ ...prev, routing_number: formatRoutingNumber(e.target.value) }))}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              validationErrors.routingNumber ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="123456789"
                            maxLength={9}
                          />
                          {validationErrors.routingNumber && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.routingNumber}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {payoutData.bank_country !== 'US' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IBAN
                          </label>
                          <input
                            type="text"
                            value={payoutData.iban}
                            onChange={(e) => setPayoutData(prev => ({ ...prev, iban: formatIBAN(e.target.value) }))}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              validationErrors.iban ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="DE89 3704 0044 0532 0130 00"
                          />
                          {validationErrors.iban && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.iban}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SWIFT/BIC Code
                          </label>
                          <input
                            type="text"
                            value={payoutData.swift_code}
                            onChange={(e) => setPayoutData(prev => ({ ...prev, swift_code: formatSwiftCode(e.target.value) }))}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              validationErrors.swiftCode ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="DEUTDEFF"
                            maxLength={11}
                          />
                          {validationErrors.swiftCode && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.swiftCode}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {payoutData.payout_method === 'paypal' && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">PayPal Information</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PayPal Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          value={payoutData.paypal_email}
                          onChange={(e) => setPayoutData(prev => ({ ...prev, paypal_email: e.target.value }))}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            validationErrors.paypalEmail ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="your.email@paypal.com"
                        />
                      </div>
                      {validationErrors.paypalEmail && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.paypalEmail}</p>
                      )}
                    </div>
                  </div>
                )}

                {payoutData.payout_method === 'stripe' && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h4 className="font-medium text-gray-900 mb-2">Stripe Payouts</h4>
                      <p className="text-sm text-gray-600">
                        Stripe payout integration coming soon. You'll be able to connect your Stripe account directly.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{payoutLoading ? 'Saving...' : 'Save Payout Information'}</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">AffiliateWP Metrics Sync</h3>

              <div className="space-y-6">
                {/* Sync Status Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Sync Status</h4>
                        <p className="text-sm text-gray-600">Automatic hourly sync from AffiliateWP</p>
                      </div>
                    </div>
                    <button
                      onClick={triggerManualSync}
                      disabled={syncing || loadingSyncStatus}
                      className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>

                  {loadingSyncStatus ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading sync status...</p>
                    </div>
                  ) : syncStatus ? (
                    <div className="space-y-4">
                      {/* Health Indicator */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Health:</span>
                        {syncStatus.sync_health === 'healthy' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Healthy
                          </span>
                        ) : syncStatus.sync_health === 'warning' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                            <AlertCircle className="w-4 h-4" />
                            Warning
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            <AlertCircle className="w-4 h-4" />
                            Critical
                          </span>
                        )}
                      </div>

                      {/* Metrics Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Last Updated</p>
                          <p className="text-lg font-bold text-gray-900">{syncStatus.last_metrics_date || 'Never'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Total Affiliates</p>
                          <p className="text-lg font-bold text-gray-900">{syncStatus.total_affiliates || 0}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Recent Metrics</p>
                          <p className="text-lg font-bold text-gray-900">{syncStatus.affiliates_with_recent_metrics || 0}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Total Records</p>
                          <p className="text-lg font-bold text-gray-900">{syncStatus.total_metrics_records || 0}</p>
                        </div>
                      </div>

                      {/* Data Freshness Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="text-blue-900 font-medium mb-1">Automatic Sync Schedule</p>
                            <p className="text-blue-700">
                              Metrics sync automatically every hour. Your dashboard always shows the most recent data from AffiliateWP.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">Click "Sync Now" to fetch current metrics</p>
                    </div>
                  )}
                </div>

                {/* Information Card */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">About Metrics Sync</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Metrics sync automatically every hour from AffiliateWP</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Includes visits, referrals, earnings, and unpaid commissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Data appears in your Dashboard and Commission Tracker</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Click "Sync Now" anytime to get the latest data immediately</span>
                    </li>
                  </ul>
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

                  {!showPasswordModal ? (
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Change Password
                    </button>
                  ) : (
                    <form onSubmit={handleChangePassword} className="space-y-3 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter new password"
                          required
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Confirm new password"
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Updating...' : 'Update Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordModal(false);
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
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

                <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
                  <div className="flex items-start gap-3">
                    <Bug className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">Test Auth Hook Status</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Check if the Custom Access Token Hook is active. This hook adds user_role and company_id to your JWT token for better performance.
                      </p>
                      <button
                        onClick={async () => {
                          toast.loading('Testing auth hook...');
                          try {
                            const result = await testAuthHook();
                            if (result.hookActive) {
                              toast.success('Auth hook is active and working!');
                            } else {
                              toast.error('Auth hook is not active. Check console for details.');
                            }
                          } catch (error) {
                            toast.error('Failed to test auth hook');
                          }
                        }}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                      >
                        <Bug className="w-4 h-4" />
                        Test Hook Status
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Results will be shown in the browser console
                      </p>
                    </div>
                  </div>
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