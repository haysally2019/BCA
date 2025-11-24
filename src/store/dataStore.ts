import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseService, type AnalyticsData, type Deal, type Commission, type Prospect } from '../lib/supabaseService';
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

interface DataState {
  // Cache storage
  cache: Map<string, CachedData>;

  // Loading states
  dashboardLoading: boolean;
  pipelineLoading: boolean;
  commissionsLoading: boolean;
  prospectsLoadingMore: boolean;

  // Cached data
  analyticsData: AnalyticsData | null;
  deals: Deal[];
  commissions: Commission[];
  affiliateCommissions: CommissionEntry[];
  prospects: Prospect[];
  hasMoreProspects: boolean;
  totalProspectsCount: number;
  contacts: Contact[];

  // Actions
  loadDashboardData: (companyId: string, timeRange?: string, force?: boolean) => Promise<void>;
  loadMoreProspects: (companyId: string) => Promise<void>;
  loadPipelineData: (companyId: string, force?: boolean) => Promise<void>;
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
  pipelineLoading: false,
  commissionsLoading: false,
  prospectsLoadingMore: false,
  analyticsData: null,
  deals: [],
  commissions: [],
  affiliateCommissions: [],
  prospects: [],
  hasMoreProspects: true,
  totalProspectsCount: 0,
  contacts: [],

  loadDashboardData: async (companyId: string, timeRange: string = '30d', force: boolean = false) => {
    const cacheKey = `dashboard_${companyId}_${timeRange}`;
    const { cache } = get();
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Always get total count (it's fast and needed for hasMoreProspects)
    const totalCount = await supabaseService.getProspectsCount(companyId);

    // Return cached data immediately if valid and not forced
    if (!force && cached && now < cached.expiry) {
      set({
        analyticsData: cached.data.analytics,
        prospects: cached.data.prospects || [],
        totalProspectsCount: totalCount,
        hasMoreProspects: (cached.data.prospects || []).length < totalCount,
        dashboardLoading: false
      });
      return;
    }

    // Use stale data while revalidating (but don't trigger loading state)
    if (!force && cached && now < cached.timestamp + STALE_WHILE_REVALIDATE) {
      set({
        analyticsData: cached.data.analytics,
        prospects: cached.data.prospects || [],
        totalProspectsCount: totalCount,
        hasMoreProspects: (cached.data.prospects || []).length < totalCount,
        dashboardLoading: false
      });

      // Revalidate in background without showing loading state
      setTimeout(async () => {
        try {
          const [analytics, prospects, updatedTotalCount] = await Promise.all([
            supabaseService.getAnalyticsData(companyId, timeRange),
            supabaseService.getProspects(companyId, 50),
            supabaseService.getProspectsCount(companyId)
          ]);

          const data = { analytics, prospects };
          const newCache = new Map(get().cache);
          newCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + CACHE_DURATION
          });

          set({
            cache: newCache,
            analyticsData: analytics,
            prospects: prospects,
            totalProspectsCount: updatedTotalCount,
            hasMoreProspects: prospects.length < updatedTotalCount
          });
        } catch (error) {
          console.error('Background revalidation failed:', error);
        }
      }, 100);
      return;
    }

    try {
      set({ dashboardLoading: true });

      // Load data in parallel - only first 50 prospects for initial load + total count
      const [analytics, prospects, totalCount] = await Promise.all([
        supabaseService.getAnalyticsData(companyId, timeRange),
        supabaseService.getProspects(companyId, 50),
        supabaseService.getProspectsCount(companyId)
      ]);

      const data = { analytics, prospects };

      // Update cache
      const newCache = new Map(cache);
      newCache.set(cacheKey, {
        data,
        timestamp: now,
        expiry: now + CACHE_DURATION
      });

      set({
        cache: newCache,
        analyticsData: analytics,
        prospects: prospects,
        totalProspectsCount: totalCount,
        hasMoreProspects: prospects.length < totalCount
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use cached data if available on error
      if (cached) {
        set({
          analyticsData: cached.data.analytics,
          prospects: cached.data.prospects || []
        });
      }
    } finally {
      set({ dashboardLoading: false });
    }
  },

  loadMoreProspects: async (companyId: string) => {
    const { prospects, prospectsLoadingMore, hasMoreProspects, totalProspectsCount } = get();

    // Don't load if already loading or no more data
    if (prospectsLoadingMore || !hasMoreProspects) return;

    try {
      set({ prospectsLoadingMore: true });

      // Fetch next batch starting from current length
      const offset = prospects.length;
      const newProspects = await supabaseService.getProspects(companyId, 50, offset);

      const updatedProspects = [...prospects, ...newProspects];
      set({
        prospects: updatedProspects,
        hasMoreProspects: updatedProspects.length < totalProspectsCount
      });
    } catch (error) {
      console.error('Error loading more prospects:', error);
    } finally {
      set({ prospectsLoadingMore: false });
    }
  },

  loadPipelineData: async (companyId: string, force: boolean = false) => {
    const cacheKey = `pipeline_${companyId}`;
    const { cache } = get();
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Return cached data if valid and not forced
    if (!force && cached && now < cached.expiry) {
      set({ deals: cached.data.deals || [] });
      return;
    }

    // Use stale data while revalidating
    if (!force && cached && now < cached.timestamp + STALE_WHILE_REVALIDATE) {
      set({ deals: cached.data.deals || [] });
      
      // Revalidate in background
      setTimeout(() => get().loadPipelineData(companyId, true), 100);
      return;
    }

    try {
      set({ pipelineLoading: true });

      const [deals, stages] = await Promise.all([
        supabaseService.getDeals(companyId),
        supabaseService.getDealStages(companyId)
      ]);

      const data = { deals, stages };

      // Update cache
      const newCache = new Map(cache);
      newCache.set(cacheKey, {
        data,
        timestamp: now,
        expiry: now + CACHE_DURATION
      });

      set({
        cache: newCache,
        deals: deals
      });

    } catch (error) {
      // Error loading pipeline data
      // Use cached data if available on error
      if (cached) {
        set({ deals: cached.data.deals || [] });
      }
    } finally {
      set({ pipelineLoading: false });
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

      // Load data in parallel from both internal commissions and AffiliateWP referrals
      const [commissions, affiliateCommissions, affiliateReferrals] = await Promise.all([
        supabaseService.getCommissions(companyId),
        commissionService.getCommissionEntries(),
        supabaseService.getAffiliateReferrals()
      ]);

      // Merge affiliate referrals into the commissions display
      const mergedCommissions = [
        ...affiliateCommissions,
        ...(affiliateReferrals || []).map((ref: any) => ({
          id: ref.id,
          affiliate_id: ref.affiliate_id,
          affiliatewp_referral_id: ref.affiliatewp_referral_id,
          commission_type: 'affiliate',
          customer_name: ref.description || 'Affiliate Referral',
          customer_email: '',
          product_name: ref.reference || 'Referral Commission',
          product_id: 0,
          order_total: ref.amount || 0,
          commission_amount: ref.amount || 0,
          commission_rate: 0,
          status: ref.status || 'pending',
          payment_date: null,
          notes: ref.context,
          webhook_data: ref.custom,
          created_at: ref.date || ref.created_at,
          updated_at: ref.updated_at
        }))
      ];

      const data = { commissions, affiliateCommissions: mergedCommissions };

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
        affiliateCommissions: mergedCommissions
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