import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  CreditCard, 
  Copy, 
  Link as LinkIcon,
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { profile } = useAuthStore();
  const [metrics, setMetrics] = useState({
    earnings: 0,
    unpaid: 0,
    referrals: 0,
    visits: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_id) {
      loadMetrics();
    }
  }, [profile]);

  const loadMetrics = async () => {
    try {
      // If we have AffiliateWP data synced to the profile, use it
      if (profile) {
        setMetrics({
          earnings: profile.affiliatewp_earnings || 0,
          unpaid: profile.affiliatewp_unpaid_earnings || 0,
          referrals: profile.affiliatewp_referrals || 0,
          visits: profile.affiliatewp_visits || 0
        });
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (profile?.affiliate_referral_url) {
      navigator.clipboard.writeText(profile.affiliate_referral_url);
      toast.success('Referral link copied!');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back, {profile?.full_name?.split(' ')[0] || 'Sales Rep'}.</p>
        </div>
        <div className="text-sm text-slate-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* --- NEW: REFERRAL LINK BANNER --- */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -mr-16 -mt-16 opacity-50 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-600" />
              Your Unique Referral Link
            </h3>
            <p className="text-slate-500 text-sm mt-1 max-w-lg">
              Share this link with your leads. Any sales made through this URL will automatically be tracked and credited to your commission account.
            </p>
          </div>

          {profile?.affiliate_referral_url ? (
            <div className="flex w-full md:w-auto items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 group">
              <code className="flex-1 text-sm font-mono text-slate-700 px-3 py-1 truncate max-w-[240px] md:max-w-[300px] select-all">
                {profile.affiliate_referral_url}
              </code>
              <button 
                onClick={copyLink}
                className="p-2 bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-md transition-all shadow-sm active:scale-95"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-50 text-amber-700 px-4 py-3 rounded-lg border border-amber-100 text-sm">
              {profile?.affiliatewp_id ? (
                // ID exists but URL missing (rare edge case)
                <span>Link unavailable. Contact support.</span>
              ) : (
                // Account creation in progress
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span>Generating your tracking link... (Check back in 1m)</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Paid</span>
          </div>
          <p className="text-slate-500 text-sm">Total Earnings</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            ${metrics.earnings.toFixed(2)}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Pending</span>
          </div>
          <p className="text-slate-500 text-sm">Unpaid Commission</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            ${metrics.unpaid.toFixed(2)}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">Total Sales</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {metrics.referrals}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">Link Visits</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {metrics.visits}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;