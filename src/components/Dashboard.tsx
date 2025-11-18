import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useSupabase } from '../context/SupabaseProvider';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

type MetricsRow = {
  date: string;
  visits: number | null;
  referrals: number | null;
  earnings: number | null;
  unpaid_earnings: number | null;
};

type ReferralRow = {
  affiliate_id: number;
  referral_id: string;
  status: string;
  amount: number;
  description: string | null;
  origin_url: string | null;
  order_id: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  deal_value: number;
};

const rolesManager = new Set(['owner', 'admin', 'manager']);

const Section = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const Tile = ({ label, value, sub, icon: Icon, color = 'blue' }: { label: string; value: string; sub?: string; icon?: React.ElementType; color?: string }) => {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    amber: 'from-amber-50 to-amber-100 border-amber-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    red: 'from-red-50 to-red-100 border-red-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} border rounded-xl p-6 hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{label}</p>
        {Icon && <Icon className="w-5 h-5 text-gray-600" />}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, onClick, color = 'blue' }: { icon: React.ElementType; label: string; onClick: () => void; color?: string }) => {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} text-white rounded-lg px-4 py-3 flex items-center gap-2 font-medium text-sm transition-all shadow-sm hover:shadow-md`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...p}
    className="rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-150"
  />
);

const fmtNum = (n: unknown) => (typeof n === 'number' ? n.toLocaleString() : '0');
const fmtMoney = (n: unknown) =>
  typeof n === 'number' ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '$0';
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const Dashboard: React.FC = () => {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(true);

  const [series, setSeries] = useState<MetricsRow[]>([]);
  const [latest, setLatest] = useState<MetricsRow | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);

  const role = (profile?.user_role || '').toLowerCase();
  const isManager = rolesManager.has(role);
  const affiliateId = profile?.affiliatewp_id ?? null;

  const loadLeads = useCallback(async () => {
    try {
      setLeadsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentLeads(data || []);
    } catch (e) {
      console.error('[Dashboard] leads error', e);
    } finally {
      setLeadsLoading(false);
    }
  }, [supabase]);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const since = toISODate(new Date(Date.now() - range * 86400000));

      if (isManager) {
        const { data, error } = await supabase
          .from('affiliate_metrics_daily')
          .select('date, visits, referrals, earnings, unpaid_earnings')
          .gte('date', since);

        if (error) throw error;

        const map = new Map<string, MetricsRow>();

        (data || []).forEach((r: any) => {
          const key = r.date;
          const prev = map.get(key) || {
            date: key,
            visits: 0,
            referrals: 0,
            earnings: 0,
            unpaid_earnings: 0,
          };

          map.set(key, {
            date: key,
            visits: (prev.visits || 0) + (r.visits || 0),
            referrals: (prev.referrals || 0) + (r.referrals || 0),
            earnings: (prev.earnings || 0) + (r.earnings || 0),
            unpaid_earnings: (prev.unpaid_earnings || 0) + (r.unpaid_earnings || 0),
          });
        });

        const rows = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
        setSeries(rows);
        setLatest(rows.length ? rows[rows.length - 1] : null);
      } else {
        if (!affiliateId) {
          setSeries([]);
          setLatest(null);
          return;
        }

        const { data, error } = await supabase
          .from('affiliate_metrics_daily')
          .select('date, visits, referrals, earnings, unpaid_earnings')
          .eq('affiliate_id', affiliateId)
          .gte('date', since)
          .order('date', { ascending: true });

        if (error) throw error;

        const rows = (data || []) as MetricsRow[];
        setSeries(rows);
        setLatest(rows.length ? rows[rows.length - 1] : null);
      }
    } catch (e: any) {
      console.error('[Dashboard] metrics error', e);
      setError(e.message || 'Failed to load metrics');
      setSeries([]);
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, isManager, affiliateId, range]);

  const loadReferrals = useCallback(async () => {
    try {
      if (!isManager && !affiliateId) {
        setReferrals([]);
        return;
      }

      const query = supabase
        .from('affiliate_referrals')
        .select('affiliate_id, referral_id, status, amount, description, origin_url, order_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data, error } = isManager ? await query : await query.eq('affiliate_id', affiliateId as number);

      if (error) throw error;
      setReferrals((data || []) as ReferralRow[]);
    } catch (e) {
      console.error('[Dashboard] referrals error', e);
    }
  }, [supabase, isManager, affiliateId]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadMetrics(), loadReferrals(), loadLeads()]);
  }, [loadMetrics, loadReferrals, loadLeads]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const totals = useMemo(() => {
    let visits = 0;
    let refs = 0;
    let earn = 0;
    let unpaid = 0;

    series.forEach((r) => {
      visits += r.visits || 0;
      refs += r.referrals || 0;
      earn += r.earnings || 0;
      unpaid += r.unpaid_earnings || 0;
    });

    const conv = visits > 0 ? (refs / visits) * 100 : 0;
    return { visits, refs, earn, unpaid, conv };
  }, [series]);

  const leadsByStatus = useMemo(() => {
    const counts = { new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, closed: 0 };
    recentLeads.forEach(lead => {
      if (counts[lead.status as keyof typeof counts] !== undefined) {
        counts[lead.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [recentLeads]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-amber-100 text-amber-800',
      qualified: 'bg-purple-100 text-purple-800',
      proposal: 'bg-green-100 text-green-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closed: 'bg-emerald-100 text-emerald-800',
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-amber-100 text-amber-800',
      unpaid: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (error) {
    return (
      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md border border-red-200">
          <h1 className="text-2xl font-bold text-red-600 mb-3">Error loading dashboard</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={loadAll}
            className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors duration-150 shadow-md hover:shadow-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isManager ? 'Team Dashboard' : 'Sales Dashboard'}
          </h1>
          <p className="text-gray-600">
            {isManager
              ? 'Team performance and affiliate metrics at a glance.'
              : 'Your performance, earnings, and leads at a glance.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Range</label>
          <Select value={String(range)} onChange={(e) => setRange(Number(e.target.value) as 7 | 30 | 90)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <button
            onClick={loadAll}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors duration-150 shadow-sm hover:shadow-md"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {!isManager && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction icon={Plus} label="Add New Lead" onClick={() => navigate('/leads')} color="blue" />
            <QuickAction icon={Phone} label="Call Schedule" onClick={() => navigate('/leads')} color="green" />
            <QuickAction icon={DollarSign} label="View Commissions" onClick={() => navigate('/commissions')} color="amber" />
            <QuickAction icon={Target} label="Sales Tools" onClick={() => navigate('/sales-tools')} color="blue" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Tile label="Visits" value={fmtNum(totals.visits)} icon={Users} color="blue" />
        <Tile label="Referrals" value={fmtNum(totals.refs)} icon={TrendingUp} color="green" />
        <Tile label="Conversion" value={`${totals.conv.toFixed(1)}%`} sub="Referrals / Visits" icon={Target} color="purple" />
        <Tile label="Earnings" value={fmtMoney(totals.earn)} icon={DollarSign} color="green" />
        <Tile label="Unpaid" value={fmtMoney(totals.unpaid)} icon={Clock} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Earnings Over Time">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 ml-3">Loading chart…</p>
            </div>
          ) : series.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No data for this range yet.</p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4" style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section
          title="Recent Leads"
          action={
            <button
              onClick={() => navigate('/leads')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          }
        >
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No leads yet.</p>
              <button
                onClick={() => navigate('/leads')}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Lead
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{lead.company_name}</h4>
                      <p className="text-sm text-gray-600">{lead.contact_name}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {lead.phone}
                    </span>
                    {lead.deal_value > 0 && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="w-3 h-3" />
                        {fmtMoney(lead.deal_value)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section
        title="Recent Referrals"
        action={
          <button
            onClick={() => navigate('/commissions')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-4 h-4" />
          </button>
        }
      >
        {referrals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No recent referrals to display.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="p-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="p-3 text-right font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.referral_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-gray-700">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{r.referral_id}</code>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold text-green-600">{fmtMoney(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {profile?.affiliate_referral_url && (
        <Section title="Your Affiliate Link">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <code className="flex-1 text-sm bg-white px-4 py-2 rounded border border-gray-200 font-mono text-gray-700 overflow-x-auto">
                {profile.affiliate_referral_url}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profile.affiliate_referral_url || '');
                  toast.success('Link copied to clipboard!');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Copy Link
              </button>
              <a
                href={profile.affiliate_referral_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Visit
              </a>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
};

export default Dashboard;
