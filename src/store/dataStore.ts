import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseService, type Commission } from '../lib/supabaseService';
import { commissionService, type CommissionEntry } from '../lib/commissionService';

interface Contact {
  id?: string;
  name: string;
  phone: string;
  email: string;
  affiliate_id?: string;
}

interface CachedData {
  data: any;
  timestamp: number;
  expiry: number;
}

interface AffiliateReferral {
  id: number;
  affiliate_id: number;
  referral_id: string;
  status?: string | null;
  amount?: number | null;
  description?: string | null;
  origin_url?: string | null;
  order_id?: string | null;
  created_at?: string | null;
}

interface AffiliateMetricPoint {
  date: string;
  visits: number;
  referrals: number;
  earnings: number;
  unpaid_earnings: number;
}

interface AffiliateDashboardSnapshot {
  overview: {
    totalEarnings: number;
    paidEarnings: number;
    unpaidEarnings: number;
    referrals: number;
    visits: number;
    conversionRate: number;
    commissionRate: number;
  };
  syncStatus: {
    lastSync: string | null;
  };
  referralFeed: AffiliateReferral[];
  performance: AffiliateMetricPoint[];
  payoutQueue: CommissionEntry[];
}

interface DashboardProfileContext {
  id: string;
  affiliatewp_id?: number | null;
  affiliatewp_earnings?: number | null;
  affiliatewp_unpaid_earnings?: number | null;
  affiliatewp_referrals?: number | null;
  affiliatewp_visits?: number | null;
  commission_rate?: number | null;
  last_metrics_sync?: string | null;
}

interface DataState {
  // Cache storage
  cache: Map<string, CachedData>;

  // Loading states
  dashboardLoading: boolean;
  commissionsLoading: boolean;

  // Cached data
  affiliateDashboard: AffiliateDashboardSnapshot | null;
  commissions: Commission[];
  affiliateCommissions: CommissionEntry[];
  contacts: Contact[];

  // Actions
  loadDashboardData: (profile: DashboardProfileContext, timeRange?: string, force?: boolean) => Promise<void>;
  loadCommissionsData: (companyId: string, force?: boolean) => Promise<void>;
  addContact: (contact: Contact) => void;
  setContacts: (contacts: Contact[]) => void;
  clearContacts: () => void;
  clearCache: () => void;
  invalidateCache: (keys?: string[]) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE = 60 * 60 * 1000; // 60 minutes - show stale data for up to 1 hour

let lastVisibilityChange = Date.now();

// Track visibility changes but DON'T clear cache
// The stale-while-revalidate pattern will handle updates automatically
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lastVisibilityChange = Date.now();
    } else if (document.visibilityState === 'visible') {
      const hiddenDuration = Date.now() - lastVisibilityChange;
      console.log('[DataStore] Tab became visible after', Math.round(hiddenDuration / 1000), 'seconds');
      // Don't clear cache - let stale-while-revalidate handle it
      // This prevents "No Data Available" flash when returning to tab
    }
  });
}

export const useDataStore = create<DataState>((set, get) => ({
  cache: new Map(),
  dashboardLoading: false,
  commissionsLoading: false,
  affiliateDashboard: null,
  commissions: [],
  affiliateCommissions: [],
  contacts: [],

  loadDashboardData: async (
    profile: DashboardProfileContext,
    timeRange: string = '30d',
    force: boolean = false
  ) => {
    const affiliateId = profile.affiliatewp_id ?? null;
    const cacheKey = `affiliate_dashboard_${profile.id}_${affiliateId ?? 'none'}_${timeRange}`;
    const { cache } = get();
    const cached = cache.get(cacheKey);
    const now = Date.now();

    const buildSnapshot = (
      referrals: AffiliateReferral[],
      performance: AffiliateMetricPoint[],
      payoutQueue: CommissionEntry[]
    ): AffiliateDashboardSnapshot => {
      const paid = profile.affiliatewp_earnings ?? 0;
      const unpaid = profile.affiliatewp_unpaid_earnings ?? 0;
      const visits = profile.affiliatewp_visits ?? 0;
      const totalReferrals = profile.affiliatewp_referrals ?? 0;
      const conversion = visits > 0 ? (totalReferrals / visits) * 100 : 0;

      return {
        overview: {
          totalEarnings: paid + unpaid,
          paidEarnings: paid,
          unpaidEarnings: unpaid,
          referrals: totalReferrals,
          visits,
          conversionRate: Number(conversion.toFixed(2)),
          commissionRate: profile.commission_rate ?? 0,
        },
        syncStatus: {
          lastSync: profile.last_metrics_sync ?? null,
        },
        referralFeed: referrals,
        performance,
        payoutQueue,
      };
    };

    if (!force && cached && now < cached.expiry) {
      set({
        affiliateDashboard: cached.data as AffiliateDashboardSnapshot,
        dashboardLoading: false,
      });
      return;
    }

    if (!force && cached && now < cached.timestamp + STALE_WHILE_REVALIDATE) {
      set({
        affiliateDashboard: cached.data as AffiliateDashboardSnapshot,
        dashboardLoading: false,
      });

      setTimeout(async () => {
        try {
          const refreshed = await get().loadDashboardData(profile, timeRange, true);
          return refreshed;
        } catch (error) {
          console.error('Background affiliate dashboard refresh failed:', error);
        }
      }, 100);
      return;
    }

    if (!affiliateId) {
      const snapshot = buildSnapshot([], [], []);
      set({ affiliateDashboard: snapshot, dashboardLoading: false });
      const newCache = new Map(cache);
      newCache.set(cacheKey, {
        data: snapshot,
        timestamp: now,
        expiry: now + CACHE_DURATION,
      });
      set({ cache: newCache });
      return;
    }

    try {
      set({ dashboardLoading: true });

      const rangeToDays = (range: string) => {
        switch (range) {
          case '7d':
            return 7;
          case '90d':
            return 90;
          default:
            return 30;
        }
      };

      const days = rangeToDays(timeRange);

      const [referrals, dailyMetrics, commissionEntries] = await Promise.all([
        commissionService.getAffiliateReferrals(affiliateId, 50),
        commissionService.getAffiliateMetrics(affiliateId, days),
        commissionService.getCommissionEntries(),
      ]);

      const normalizedMetrics: AffiliateMetricPoint[] = (dailyMetrics || []).map((metric: any) => ({
        date: metric.date,
        visits: Number(metric.visits ?? 0),
        referrals: Number(metric.referrals ?? 0),
        earnings: Number(metric.earnings ?? 0),
        unpaid_earnings: Number(metric.unpaid_earnings ?? 0),
      }));

      const payoutQueue = commissionEntries
        .filter((entry) =>
          entry.affiliate?.affiliatewp_id === affiliateId &&
          (entry.status === 'pending' || entry.status === 'approved')
        )
        .slice(0, 20);

      const snapshot = buildSnapshot(referrals || [], normalizedMetrics, payoutQueue);

      const newCache = new Map(cache);
      newCache.set(cacheKey, {
        data: snapshot,
        timestamp: now,
        expiry: now + CACHE_DURATION,
      });

      set({
        cache: newCache,
        affiliateDashboard: snapshot,
      });
    } catch (error) {
      console.error('Error loading affiliate dashboard data:', error);
      if (cached) {
        set({
          affiliateDashboard: cached.data as AffiliateDashboardSnapshot,
        });
      }
    } finally {
      set({ dashboardLoading: false });
    }
  },

  loadCommissionsData: async (companyId: string, force: boolean = false) => {
    const cacheKey = `commissions_${companyId}`;
    const { cache } = get();
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Return cached data if valid and not forced
    if (!force && cached && now < cached.expiry) {
      set({ 
        commissions: cached.data.commissions || [],
        affiliateCommissions: cached.data.affiliateCommissions || []
      });
      return;
    }

    // Use stale data while revalidating
    if (!force && cached && now < cached.timestamp + STALE_WHILE_REVALIDATE) {
      set({ 
        commissions: cached.data.commissions || [],
        affiliateCommissions: cached.data.affiliateCommissions || []
      });
      
      // Revalidate in background
      setTimeout(() => get().loadCommissionsData(companyId, true), 100);
      return;
    }

    try {
      set({ commissionsLoading: true });

      // Load data in parallel
      const [commissions, affiliateCommissions] = await Promise.all([
        supabaseService.getCommissions(companyId),
        commissionService.getCommissionEntries()
      ]);

      const data = { commissions, affiliateCommissions };

      // Update cache
      const newCache = new Map(cache);
      newCache.set(cacheKey, {
        data,
        timestamp: now,
        expiry: now + CACHE_DURATION
      });

      set({
        cache: newCache,
        commissions: commissions,
        affiliateCommissions: affiliateCommissions
      });

    } catch (error) {
      // Error loading commissions data
      // Use cached data if available on error
      if (cached) {
        set({ 
          commissions: cached.data.commissions || [],
          affiliateCommissions: cached.data.affiliateCommissions || []
        });
      }
    } finally {
      set({ commissionsLoading: false });
    }
  },

  addContact: (contact) =>
    set((state) => ({
      contacts: [...state.contacts, contact],
    })),

  setContacts: (contacts) => set({ contacts }),

  clearContacts: () => set({ contacts: [] }),

  clearCache: () => {
    set({ cache: new Map() });
  },

  invalidateCache: (keys?: string[]) => {
    const { cache } = get();
    const newCache = new Map(cache);

    if (keys) {
      keys.forEach(key => newCache.delete(key));
    } else {
      newCache.clear();
    }

    set({ cache: newCache });
  }
}));

interface ContactsStore {
  contacts: Contact[];
  addContact: (contact: Contact) => void;
  setContacts: (contacts: Contact[]) => void;
  clearContacts: () => void;
}

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set) => ({
      contacts: [],
      addContact: (contact) =>
        set((state) => ({ contacts: [...state.contacts, contact] })),
      setContacts: (contacts) => set({ contacts }),
      clearContacts: () => set({ contacts: [] }),
    }),
    {
      name: "bca-datastore",
    }
  )
);