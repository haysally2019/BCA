import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useSupabase } from '../context/SupabaseProvider';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// Types matching your database structure
type Referral = {
  affiliate_id: number;
  referral_id: string;
  status: 'paid' | 'unpaid' | 'pending' | 'rejected';
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  created_at: string;
};

const CommissionsTracker: React.FC = () => {
  const { supabase } = useSupabase();
  const { profile, refreshProfile } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------------------------------------------------
  // 1. LOAD DATA
  // ---------------------------------------------------------
  const loadCommissions = useCallback(async () => {
    if (!profile?.affiliatewp_id && !isManager(profile?.user_role)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('affiliate_referrals')
        .select('*')
        .order('date', { ascending: false });

      // If not a manager, restrict to own data
      if (!isManager(profile?.user_role)) {
        query = query.eq('affiliate_id', profile?.affiliatewp_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReferrals(data || []);

    } catch (err: any) {
      console.error('Error loading commissions:', err);
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  }, [supabase, profile]);

  // ---------------------------------------------------------
  // 2. SYNC ACTION (Triggers Edge Function)
  // ---------------------------------------------------------
  const handleSync = async () => {
    try {
      setSyncing(true);
      const { error } = await supabase.functions.invoke('sync-affiliatewp');
      if (error) throw error;
      
      await refreshProfile(); // Update header stats if any
      await loadCommissions(); // Reload table
      toast.success('Commissions synced successfully');
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  // ---------------------------------------------------------
  // 3. CALCULATE METRICS (Live from list)
  // ---------------------------------------------------------
  const stats = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let rejected = 0;
    let totalCount = 0;

    referrals.forEach(r => {
      if (r.status === 'paid') {
        paid += r.amount;
      } else if (r.status === 'unpaid' || r.status === 'pending') {
        pending += r.amount;
      } else if (r.status === 'rejected') {
        rejected += r.amount;
      }
      totalCount++;
    });

    return { paid, pending, rejected, totalCount };
  }, [referrals]);

  // ---------------------------------------------------------
  // 4. FILTER LOGIC
  // ---------------------------------------------------------
  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      const matchesSearch = 
        (r.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        r.referral_id.toString().includes(searchQuery);
      
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [referrals, searchQuery, filterStatus]);

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------
  const fmtMoney = (val: number) => 
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
          </span>
        );
      case 'pending':
      case 'unpaid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </span>
        );
      default:
        return <span className="capitalize text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
          <p className="text-slate-500 mt-1">Track your earnings, payouts, and referral status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-200 transition">
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
        </div>
      </div>

      {/* STATS TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Earnings" 
          value={fmtMoney(stats.paid)} 
          icon={DollarSign} 
          color="emerald"
          sub="Paid out to date"
        />
        <StatsCard 
          title="Pending Payout" 
          value={fmtMoney(stats.pending)} 
          icon={Clock} 
          color="amber"
          sub="Awaiting clearance"
        />
        <StatsCard 
          title="Rejected / Void" 
          value={fmtMoney(stats.rejected)} 
          icon={XCircle} 
          color="red"
          sub="Cancelled referrals"
        />
        <StatsCard 
          title="Total Sales" 
          value={stats.totalCount.toString()} 
          icon={TrendingUp} 
          color="blue"
          sub="All time referrals"
        />
      </div>

      {/* FILTERS & TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search commissions..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full sm:w-48 pl-3 pr-10 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Pending/Unpaid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading commission data...</p>
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No commissions found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Referral ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredReferrals.map((item) => (
                  <tr key={item.referral_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                      #{item.referral_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {item.description || 'Commission'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                      item.status === 'rejected' ? 'text-slate-400 line-through decoration-slate-400' : 'text-slate-900'
                    }`}>
                      {fmtMoney(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Component for the Top Cards
const StatsCard = ({ title, value, icon: Icon, color, sub }: any) => {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${colorStyles[color as keyof typeof colorStyles]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
};

// Simple role check helper
const isManager = (role?: string) => {
  return ['admin', 'manager', 'owner'].includes(role?.toLowerCase() || '');
};

export default CommissionsTracker;