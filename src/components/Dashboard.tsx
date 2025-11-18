import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
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

// ==============================
// Types
// ==============================
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

// ==============================
// DARK UI COMPONENTS
// ==============================

const Section = ({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const Tile = ({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue'
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
  color?: string;
}) => (
  <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl hover:bg-slate-900 transition">
    <div className="flex items-start justify-between mb-3">
      <p className="text-[11px] tracking-wide text-slate-400 uppercase font-medium">
        {label}
      </p>
      {Icon && <Icon className="w-5 h-5 text-slate-400" />}
    </div>

    <p className="text-3xl font-semibold text-slate-100 mb-1">{value}</p>

    {sub && <p className="text-xs text-slate-500">{sub}</p>}
  </div>
);

const QuickAction = ({
  icon: Icon,
  label,
  onClick,
  color = 'blue'
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string;
}) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-500',
    green: 'bg-green-600 hover:bg-green-500',
    amber: 'bg-amber-600 hover:bg-amber-500'
  };

  return (
    <button
      onClick={onClick}
      className={`${colorMap[color] || colorMap.blue} text-white rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg transition`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="rounded-xl bg-slate-950/60 border border-slate-800 px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
);

// ==============================
// Utility
// ==============================
const fmtNum = (n: unknown) =>
  typeof n === 'number' ? n.toLocaleString() : '0';

const fmtMoney = (n: unknown) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
    : '$0';

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

// ==============================
// MAIN DASHBOARD
// ==============================
const Dashboard: React.FC = () => {
  const { supabase } = useSupabase();
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [series, setSeries] = useState<MetricsRow[]>([]);
  const [latest, setLatest] = useState<MetricsRow | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);

  const role = (profile?.user_role || '').toLowerCase();
  const isManager = rolesManager.has(role);
  const affiliateId = profile?.affiliatewp_id ?? null;

  // ---------------------------------------
  // Load Leads
  // ---------------------------------------
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
      console.error('[Dashboard] error loading leads', e);
    } finally {
      setLeadsLoading(false);
    }
  }, [supabase]);

  // ---------------------------------------
  // Load Metrics
  // ---------------------------------------
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
          const prev = map.get(r.date) || {
            date: r.date,
            visits: 0,
            referrals: 0,
            earnings: 0,
            unpaid_earnings: 0
          };

          map.set(r.date, {
            date: r.date,
            visits: (prev.visits || 0) + (r.visits || 0),
            referrals: (prev.referrals || 0) + (r.referrals || 0),
            earnings: (prev.earnings || 0) + (r.earnings || 0),
            unpaid_earnings: (prev.unpaid_earnings || 0) + (r.unpaid_earnings || 0)
          });
        });

        const rows = Array.from(map.values()).sort((a, b) =>
          a.date < b.date ? -1 : 1
        );

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

        setSeries(data || []);
        setLatest(data?.length ? data[data.length - 1] : null);
      }
    } catch (e: any) {
      console.error('[Dashboard] metrics error', e);
      setError(e.message || 'Error loading metrics');
      setSeries([]);
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, range, isManager, affiliateId]);

  // ---------------------------------------
  // Load Referrals
  // ---------------------------------------
  const loadReferrals = useCallback(async () => {
    try {
      if (!isManager && !affiliateId) {
        setReferrals([]);
        return;
      }

      const query = supabase
        .from('affiliate_referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data, error } = isManager
        ? await query
        : await query.eq('affiliate_id', affiliateId!);

      if (error) throw error;
      setReferrals(data || []);
    } catch (e) {
      console.error('[Dashboard] referral error', e);
    }
  }, [supabase, isManager, affiliateId]);

  // ---------------------------------------
  // Load All
  // ---------------------------------------
  const loadAll = useCallback(async () => {
    await Promise.all([loadMetrics(), loadReferrals(), loadLeads()]);
  }, [loadMetrics, loadReferrals, loadLeads]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---------------------------------------
  // Totals
  // ---------------------------------------
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

    return {
      visits,
      refs,
      earn,
      unpaid,
      conv: visits ? (refs / visits) * 100 : 0
    };
  }, [series]);

  // ---------------------------------------
  // Dark Status Color Map
  // ---------------------------------------
  const getStatusColor = (s: string) => {
    const map: Record<string, string> = {
      new: 'bg-blue-900/40 text-blue-300 border-blue-700',
      contacted: 'bg-amber-900/40 text-amber-300 border-amber-700',
      qualified: 'bg-purple-900/40 text-purple-300 border-purple-700',
      proposal: 'bg-green-900/40 text-green-300 border-green-700',
      negotiation: 'bg-orange-900/40 text-orange-300 border-orange-700',
      closed: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
      paid: 'bg-green-900/40 text-green-300 border-green-700',
      pending: 'bg-amber-900/40 text-amber-300 border-amber-700',
      unpaid: 'bg-red-900/40 text-red-300 border-red-700'
    };
    return map[s] || 'bg-slate-800 text-slate-300 border-slate-700';
  };

  // ---------------------------------------
  // ERROR SCREEN
  // ---------------------------------------
  if (error) {
    return (
      <div className="p-8 bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center">
        <div className="bg-slate-900 border border-red-900 rounded-xl p-8 max-w-md shadow-xl">
          <h1 className="text-2xl font-semibold text-red-400 mb-3">
            Error loading dashboard
          </h1>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={loadAll}
            className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white px-6 py-3 shadow-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------
  // MAIN RENDER
  // ---------------------------------------
  return (
    <div className="space-y-6 p-4 md:p-6 text-slate-100">

      {/* HEADER CARD */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-100">
              {isManager ? 'Team Dashboard' : 'Sales Dashboard'}
            </h1>
            <p className="text-slate-400 mt-1">
              {isManager
                ? 'Team-wide performance insights'
                : 'Your performance and activity overview'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={String(range)}
              onChange={(e) => setRange(Number(e.target.value) as 7 | 30 | 90)}
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </Select>

            <button
              onClick={loadAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-white transition shadow"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      {!isManager && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 text-slate-100">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction
              icon={Plus}
              label="Add Lead"
              onClick={() => navigate('/leads')}
              color="blue"
            />

            <QuickAction
              icon={Phone}
              label="Call Schedule"
              onClick={() => navigate('/leads')}
              color="green"
            />

            <QuickAction
              icon={DollarSign}
              label="Commissions"
              onClick={() => navigate('/commissions')}
              color="amber"
            />

            <QuickAction
              icon={Target}
              label="Sales Tools"
              onClick={() => navigate('/sales-tools')}
              color="blue"
            />
          </div>
        </div>
      )}

      {/* KPI TILES */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Tile label="Visits" value={fmtNum(totals.visits)} icon={Users} />
        <Tile label="Referrals" value={fmtNum(totals.refs)} icon={TrendingUp} />
        <Tile
          label="Conversion"
          value={`${totals.conv.toFixed(1)}%`}
          sub="Referrals / Visits"
          icon={Target}
        />
        <Tile label="Earnings" value={fmtMoney(totals.earn)} icon={DollarSign} />
        <Tile label="Unpaid" value={fmtMoney(totals.unpaid)} icon={Clock} />
      </div>

      {/* CHART + LEADS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* EARNINGS CHART */}
        <Section title="Earnings Over Time">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-500"></div>
            </div>
          ) : series.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              No data available.
            </div>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid stroke="#334155" strokeDasharray="4" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#e2e8f0'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        {/* RECENT LEADS */}
        <Section
          title="Recent Leads"
          action={
            <button
              onClick={() => navigate('/leads')}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition text-sm"
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          }
        >
          {leadsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-400"></div>
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              No leads yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-slate-100 font-medium">
                        {lead.company_name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {lead.contact_name}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full border font-medium ${getStatusColor(
                        lead.status
                      )}`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {lead.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {lead.phone}
                    </span>

                    {lead.deal_value > 0 && (
                      <span className="flex items-center gap-1 text-green-400 font-medium">
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

      {/* RECENT REFERRALS */}
      <Section
        title="Recent Referrals"
        action={
          <button
            onClick={() => navigate('/commissions')}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition text-sm"
          >
            View All <ArrowUpRight className="w-4 h-4" />
          </button>
        }
      >
        {referrals.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            No recent referrals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                {referrals.map((r) => (
                  <tr
                    key={r.referral_id}
                    className="border-b border-slate-800 hover:bg-slate-900 transition"
                  >
                    <td className="p-3 text-slate-300">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <code className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 text-xs">
                        {r.referral_id}
                      </code>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs border font-medium ${getStatusColor(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-green-400 font-medium">
                      {fmtMoney(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {(profile?.affiliate_referral_url?.length ?? 0) > 0 && (
        <Section title="Your Affiliate Link">
          <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <code className="flex-1 text-sm bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl overflow-x-auto text-slate-300">
                {profile?.affiliate_referral_url}
              </code>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    profile?.affiliate_referral_url || ''
                  );
                  toast.success('Copied to clipboard!');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-white transition shadow"
              >
                Copy
              </button>

              <a
                href={profile?.affiliate_referral_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white/10 border border-white/20 text-slate-100 hover:bg-white/20 rounded-xl transition shadow"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
};

export default Dashboard;