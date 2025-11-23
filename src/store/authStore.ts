import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  affiliate_id?: string;
  affiliate_url?: string;
  created_at: string;
  user_role?: "admin" | "manager" | "sales_rep";
  company_id?: string;
  company_name?: string;
  phone_number?: string;
  address?: string;
  must_change_password?: boolean;
  affiliate_referral_url?: string;
  subscription_plan?: string;
  commission_rate?: number;
  preferred_payout_method?: string;
  payout_setup_completed?: boolean;
  updated_at?: string;
  // AffiliateWP-specific fields
  affiliatewp_id?: number;
  affiliatewp_earnings?: number;
  affiliatewp_unpaid_earnings?: number;
  affiliatewp_referrals?: number;
  affiliatewp_visits?: number;
  last_metrics_sync?: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    userType?: "sales_rep"
  ) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<{ unsubscribe: () => void } | null>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setInitialized: (value: boolean) => void;
  silentSessionRefresh: () => Promise<void>;
}

/**
 * Helper: determine if profile should be treated as a manager.
 */
const isManagerProfile = (profile: Profile | null): boolean => {
  if (!profile) return false;
  if (profile.user_role === "manager" || profile.user_role === "admin" || profile.user_role === "owner") return true;

  // Fallback owner logic
  if (!profile.company_id || profile.company_id === profile.user_id) {
    return true;
  }
  return false;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  /* ----------------------------------------------------------
   * SIGN IN
   * -------------------------------------------------------- */
  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user returned from Supabase.");

      const user = data.user;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("[AuthStore] signIn profile error:", profileError);
        set({ user, profile: null, loading: false, initialized: true });
        return;
      }

      set({ user, profile, loading: false, initialized: true });
    } catch (error) {
      set({ loading: false });
      const msg = error instanceof Error ? error.message : "Sign in failed.";
      console.error("[AuthStore] signIn error:", error);
      throw new Error(msg);
    }
  },

  /* ----------------------------------------------------------
   * SIGN UP
   * -------------------------------------------------------- */
  signUp: async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned.");

      const user = data.user;
      
      // Poll for profile creation (since it's done by a trigger)
      let profile: Profile | null = null;
      let attempt = 0;
      while (attempt < 5 && !profile) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (p) {
          profile = p as Profile;
          break;
        }
        attempt++;
        await new Promise((r) => setTimeout(r, 1000));
      }

      set({ user, profile: profile ?? null, loading: false, initialized: true });
    } catch (error) {
      console.error("[AuthStore] signUp failed:", error);
      throw new Error(error instanceof Error ? error.message : "Sign up failed.");
    }
  },

  /* ----------------------------------------------------------
   * NUCLEAR SIGN OUT (Fixes "Unable to sign out")
   * -------------------------------------------------------- */
  signOut: async () => {
    try {
      // 1. Clear global state immediately
      set({ user: null, profile: null, loading: false, initialized: false });
      
      // 2. Attempt Supabase sign out
      await supabase.auth.signOut();
      
      // 3. Clear storage manually to be safe
      localStorage.clear(); 
      sessionStorage.clear();

    } catch (error) {
      console.error("[AuthStore] signOut error (ignoring):", error);
    } finally {
      // 4. FORCE RELOAD to clean all memory and reset app
      window.location.href = '/';
    }
  },

  /* ----------------------------------------------------------
   * INITIALIZE
   * -------------------------------------------------------- */
  initialize: async () => {
    if (get().initialized) return null;
    set({ loading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        set({ user: session.user, profile: profile ?? null, loading: false, initialized: true });
      } else {
        set({ user: null, profile: null, loading: false, initialized: true });
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT") {
          set({ user: null, profile: null, loading: false });
        } else if (session?.user) {
           const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();
          set({ user: session.user, profile: profile ?? null });
        }
      });

      return { unsubscribe: () => subscription.unsubscribe() };
    } catch (error) {
      set({ user: null, profile: null, loading: false, initialized: true });
      return null;
    }
  },

  setInitialized: (value) => set({ initialized: value }),

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", profile.user_id)
      .select()
      .single();

    if (error) throw error;
    set({ profile: data as Profile });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) set({ profile: data as Profile });
  },

  silentSessionRefresh: async () => {
    await supabase.auth.getSession();
  },
}));