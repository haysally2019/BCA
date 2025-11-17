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
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
    <h2 className="text-lg font-bold text-gray-800 mb-4">{title}</h2>
    {children}
  </div>
);

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...p}
    className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error loading dashboard</h1>
        <p className="text-gray-700">{error}</p>
        <button
          onClick={loadAll}
          className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isManager ? 'Team Dashboard' : 'My Affiliate Dashboard'}
          </h1>
          <p className="text-gray-600 text-sm">
            {isManager
              ? 'AffiliateWP performance across your entire team.'
              : 'Your AffiliateWP visits, referrals, and commissions.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Range</label>
          <Select value={String(range)} onChange={(e) => setRange(Number(e.target.value) as 7 | 30 | 90)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <button
            onClick={loadAll}
            className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Visits" value={fmtNum(totals.visits)} />
        <Tile label="Referrals" value={fmtNum(totals.refs)} />
        <Tile label="Conversion" value={`${totals.conv.toFixed(1)}%`} sub="Referrals / Visits" />
        <Tile label="Earnings" value={fmtMoney(totals.earn)} />
        <Tile label="Unpaid" value={fmtMoney(totals.unpaid)} />
      </div>

      {/* Earnings chart */}
      <Section title="Earnings Over Time">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading chart…</p>
        ) : series.length === 0 ? (
          <p className="text-gray-500 text-sm">No data for this range yet.</p>
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Line type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Latest day snapshot */}
      <Section title="Most Recent Day">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : latest ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Visits</th>
                  <th className="p-2 text-left">Referrals</th>
                  <th className="p-2 text-left">Earnings</th>
                  <th className="p-2 text-left">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">{latest.date}</td>
                  <td className="p-2">{fmtNum(latest.visits)}</td>
                  <td className="p-2">{fmtNum(latest.referrals)}</td>
                  <td className="p-2">{fmtMoney(latest.earnings)}</td>
                  <td className="p-2">{fmtMoney(latest.unpaid_earnings)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No recent day metrics yet.</p>
        )}
      </Section>

      {/* Recent referrals */}
      <Section title="Recent Referrals">
        {referrals.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent referrals to display.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Referral ID</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-left">Order</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.referral_id + r.created_at} className="border-b">
                    <td className="p-2">
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-2">{r.referral_id}</td>
                    <td className="p-2 capitalize">{r.status}</td>
                    <td className="p-2">{fmtMoney(r.amount)}</td>
                    <td className="p-2 max-w-xs truncate">{r.description || '-'}</td>
                    <td className="p-2">{r.order_id || '-'}</td>
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
          <p className="text-sm text-gray-600 mb-2">
            Share this link to get credit for new sales through AffiliateWP.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <code className="text-sm break-all">{profile.affiliate_referral_url}</code>
          </div>
        </Section>
      )}
    </div>
  );
};

export default Dashboard;