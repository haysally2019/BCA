import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useSupabase } from '../context/SupabaseProvider';
import { useAuthStore } from '../store/authStore';

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

const rolesManager = new Set(['owner', 'admin', 'manager']);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
    <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-100">{title}</h2>
    {children}
  </div>
);

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:shadow-md transition-all duration-200 hover:scale-105">
    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{label}</p>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    {sub && <p className="text-xs text-gray-500">{sub}</p>}
  </div>
);

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

  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [series, setSeries] = useState<MetricsRow[]>([]);
  const [latest, setLatest] = useState<MetricsRow | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  const role = (profile?.user_role || '').toLowerCase();
  const isManager = rolesManager.has(role);
  const affiliateId = profile?.affiliatewp_id ?? null;

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const since = toISODate(new Date(Date.now() - range * 86400000));

      if (isManager) {
        // TEAM VIEW: all affiliates aggregated by date
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
        .limit(10);

      const { data, error } = isManager ? await query : await query.eq('affiliate_id', affiliateId as number);

      if (error) throw error;
      setReferrals((data || []) as ReferralRow[]);
    } catch (e) {
      console.error('[Dashboard] referrals error', e);
      // don't hard fail dashboard if referrals fail
    }
  }, [supabase, isManager, affiliateId]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadMetrics(), loadReferrals()]);
  }, [loadMetrics, loadReferrals]);

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
    <div className="p-6 md:p-8 space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isManager ? 'Team Dashboard' : 'My Affiliate Dashboard'}
          </h1>
          <p className="text-gray-600">
            {isManager
              ? 'AffiliateWP performance across your entire team.'
              : 'Your AffiliateWP visits, referrals, and commissions.'}
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
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Tile label="Visits" value={fmtNum(totals.visits)} />
        <Tile label="Referrals" value={fmtNum(totals.refs)} />
        <Tile label="Conversion" value={`${totals.conv.toFixed(1)}%`} sub="Referrals / Visits" />
        <Tile label="Earnings" value={fmtMoney(totals.earn)} />
        <Tile label="Unpaid" value={fmtMoney(totals.unpaid)} />
      </div>

      {/* Earnings chart */}
      <Section title="Earnings Over Time">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 ml-3">Loading chart…</p>
          </div>
        ) : series.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No data for this range yet.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4" style={{ width: '100%', height: 360 }}>
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

      {/* Latest day snapshot */}
      <Section title="Most Recent Day">
        {loading ? (
          <div className="flex items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 ml-3">Loading…</p>
          </div>
        ) : latest ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-700">Date</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Visits</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Referrals</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Earnings</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="p-4 font-medium text-gray-900">{latest.date}</td>
                  <td className="p-4 text-gray-700">{fmtNum(latest.visits)}</td>
                  <td className="p-4 text-gray-700">{fmtNum(latest.referrals)}</td>
                  <td className="p-4 font-semibold text-green-600">{fmtMoney(latest.earnings)}</td>
                  <td className="p-4 font-semibold text-blue-600">{fmtMoney(latest.unpaid_earnings)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent day metrics yet.</p>
          </div>
        )}
      </Section>

      {/* Recent referrals */}
      <Section title="Recent Referrals">
        {referrals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No recent referrals to display.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-700">Date</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Referral ID</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Status</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Amount</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Description</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Order</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.referral_id + r.created_at} className="border-b hover:bg-gray-50 transition-colors duration-150">
                    <td className="p-4 text-gray-700">
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-600">{r.referral_id}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 capitalize">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-green-600">{fmtMoney(r.amount)}</td>
                    <td className="p-4 max-w-xs truncate text-gray-700">{r.description || '-'}</td>
                    <td className="p-4 text-gray-600">{r.order_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Rep affiliate link */}
      {!isManager && affiliateId && profile?.affiliate_referral_url && (
        <Section title="My Affiliate Link">
          <p className="text-gray-600 mb-4">
            Share this link to get credit for new sales through AffiliateWP.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
            <code className="text-sm font-mono break-all text-blue-900">{profile.affiliate_referral_url}</code>
          </div>
        </Section>
      )}
    </div>
  );
};

export default Dashboard;