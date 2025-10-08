import { create } from 'zustand';
import { supabaseService, type AnalyticsData, type Deal, type Commission, type Prospect } from '../lib/supabaseService';
import { commissionService, type CommissionEntry } from '../lib/commissionService';

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
  
  // Cached data
  analyticsData: AnalyticsData | null;
  deals: Deal[];
  commissions: Commission[];
  affiliateCommissions: CommissionEntry[];
  prospects: Prospect[];
  
  // Actions
  loadDashboardData: (companyId: string, timeRange?: string, force?: boolean) => Promise<void>;
  loadPipelineData: (companyId: string, force?: boolean) => Promise<void>;
  loadCommissionsData: (companyId: string, force?: boolean) => Promise<void>;
  clearCache: () => void;
  invalidateCache: (keys?: string[]) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE = 10 * 60 * 1000; // 10 minutes

export const useDataStore = create<DataState>((set, get) => ({
  cache: new Map(),
  dashboardLoading: false,
  pipelineLoading: false,
  commissionsLoading: false,
  analyticsData: null,
  deals: [],
  commissions: [],
  affiliateCommissions: [],
  prospects: [],

  loadDashboardData: async (companyId: string, timeRange: string = '30d', force: boolean = false) => {
    const cacheKey = `dashboard_${companyId}_${timeRange}`;
    const { cache } = get();
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Return cached data if valid and not forced
    if (!force && cached && now < cached.expiry) {
      set({ 
        analyticsData: cached.data.analytics,
        prospects: cached.data.prospects || []
      });
      return;
    }

    // Use stale data while revalidating
    if (!force && cached && now < cached.timestamp + STALE_WHILE_REVALIDATE) {
      set({ 
        analyticsData: cached.data.analytics,
        prospects: cached.data.prospects || []
      });
      
      // Revalidate in background
      setTimeout(() => get().loadDashboardData(companyId, timeRange, true), 100);
      return;
    }

    try {
      set({ dashboardLoading: true });

      // Load data in parallel
      const [analytics, prospects] = await Promise.all([
        supabaseService.getAnalyticsData(companyId, timeRange),
        supabaseService.getProspects(companyId)
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
        prospects: prospects
      });

    } catch (error) {
      // Error loading dashboard data
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