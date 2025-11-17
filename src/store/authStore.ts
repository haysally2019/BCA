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
  affiliatewp_id?: number;
  affiliatewp_status?: string;
  must_change_password?: boolean;
  unpaid_earnings?: number;
  paid_lifetime_earnings?: number;
  referral_url?: string;
  affiliate_referral_url?: string;
  subscription_plan?: string;
  affiliatewp_earnings?: number;
  affiliatewp_unpaid_earnings?: number;
  affiliatewp_referrals?: number;
  affiliatewp_visits?: number;
  commission_rate?: number;
  last_metrics_sync?: string;
  preferred_payout_method?: string;
  payout_setup_completed?: boolean;
  last_payout_sync?: string;
  updated_at?: string;
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
    userType?: "sales_rep",
    affiliatewpId?: number
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
 * Logic:
 *  - If user_role === 'manager' -> manager
 *  - Else if no company_id or company_id === user_id -> treat as account owner/manager
 *  - Else -> sales rep
 */
const isManagerProfile = (profile: Profile | null): boolean => {
  if (!profile) return false;
  if (profile.user_role === "manager") return true;

  // Fallback owner logic: account owner is manager if company_id is empty or equal to self
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

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("No user returned from Supabase.");
      }

      const user = data.user;

      // Fetch real profile (no mock)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("[AuthStore] signIn profile error:", profileError);
        // If there's truly no profile yet, the backend trigger should create it soon.
        // But we at least attach the user so the app can proceed.
        set({ user, profile: null, loading: false, initialized: true });
        return;
      }

      set({
        user,
        profile,
        loading: false,
        initialized: true,
      });

      console.log("[AuthStore] signIn complete. Manager?", isManagerProfile(profile));
    } catch (error) {
      set({ loading: false });
      const msg =
        error instanceof Error ? error.message : "Sign in failed. Please try again.";
      console.error("[AuthStore] signIn error:", error);
      throw new Error(msg);
    }
  },

  /* ----------------------------------------------------------
   * SIGN UP
   * -------------------------------------------------------- */
  signUp: async (
    email: string,
    password: string,
    name: string,
    userType: "sales_rep" = "sales_rep",
    affiliatewpId?: number
  ) => {
    try {
      console.log("[AuthStore] Starting signUp for:", email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("[AuthStore] signUp error:", error);
        throw error;
      }

      if (!data.user) {
        throw new Error("No user object returned during signUp.");
      }

      const user = data.user;

      // We assume a DB trigger creates the profile.
      // We'll poll a few times for the new profile.
      let profile: Profile | null = null;
      const maxRetries = 5;
      let attempt = 0;

      while (attempt < maxRetries && !profile) {
        const { data: p, error: pError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (pError) {
          console.warn(
            `[AuthStore] signUp profile fetch attempt ${attempt + 1} error:`,
            pError
          );
        }

        if (p) {
          profile = p as Profile;
          break;
        }

        attempt++;
        if (!profile) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // If profile still isn't found, allow app to proceed but with null profile.
      set({
        user,
        profile: profile ?? null,
        loading: false,
        initialized: true,
      });

      console.log(
        "[AuthStore] signUp completed. Profile found?",
        !!profile,
        "Manager?",
        profile ? isManagerProfile(profile) : false
      );
    } catch (error) {
      console.error("[AuthStore] signUp failed:", error);
      const msg =
        error instanceof Error ? error.message : "Sign up failed. Please try again.";
      throw new Error(msg);
    }
  },

  /* ----------------------------------------------------------
   * SIGN OUT
   * -------------------------------------------------------- */
  signOut: async () => {
    try {
      sessionStorage.removeItem("currentRoute");
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[AuthStore] signOut error:", error);
    } finally {
      set({
        user: null,
        profile: null,
        loading: false,
        initialized: false,
      });
    }
  },

  /* ----------------------------------------------------------
   * INITIALIZE (ON APP LOAD)
   * -------------------------------------------------------- */
  initialize: async () => {
    const { initialized } = get();
    if (initialized) {
      console.log("[AuthStore] initialize called but already initialized");
      return null;
    }

    set({ loading: true });

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[AuthStore] getSession error:", error);
      }

      if (session?.user) {
        const user = session.user;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("[AuthStore] initialize profile error:", profileError);
          set({
            user,
            profile: null,
            loading: false,
            initialized: true,
          });
        } else {
          set({
            user,
            profile: profile ?? null,
            loading: false,
            initialized: true,
          });
        }

        console.log(
          "[AuthStore] initialize complete. Manager?",
          isManagerProfile(profile ?? null)
        );
      } else {
        set({
          user: null,
          profile: null,
          loading: false,
          initialized: true,
        });
      }

      // Auth state subscription
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[AuthStore] Auth event:", event);

        if (event === "SIGNED_OUT") {
          set({
            user: null,
            profile: null,
            loading: false,
          });
          return;
        }

        if (session?.user) {
          const user = session.user;

          const { data: profile, error: pError } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (pError) {
            console.error("[AuthStore] onAuthStateChange profile error:", pError);
            set({ user, profile: null });
          } else {
            set({ user, profile: profile ?? null });
          }

          console.log(
            "[AuthStore] onAuthStateChange. Manager?",
            isManagerProfile(profile ?? null)
          );
        } else {
          set({ user: null, profile: null });
        }
      });

      return {
        unsubscribe: () => {
          subscription.unsubscribe();
        },
      };
    } catch (error) {
      console.error("[AuthStore] initialize error:", error);
      set({
        user: null,
        profile: null,
        loading: false,
        initialized: true,
      });
      return null;
    }
  },

  /* ----------------------------------------------------------
   * SIMPLE STATE SETTER
   * -------------------------------------------------------- */
  setInitialized: (value: boolean) => {
    set({ initialized: value });
  },

  /* ----------------------------------------------------------
   * UPDATE PROFILE
   * -------------------------------------------------------- */
  updateProfile: async (updates: Partial<Profile>) => {
    const { profile } = get();
    if (!profile) {
      console.error("[AuthStore] updateProfile: no profile in state");
      throw new Error("No profile loaded.");
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", profile.user_id)
        .select("*")
        .single();

      if (error) {
        console.error("[AuthStore] updateProfile error:", error);
        throw error;
      }

      set({ profile: data as Profile });
      console.log("[AuthStore] Profile updated. Manager?", isManagerProfile(data));
    } catch (error) {
      console.error("[AuthStore] updateProfile exception:", error);
      throw error;
    }
  },

  /* ----------------------------------------------------------
   * REFRESH PROFILE
   * -------------------------------------------------------- */
  refreshProfile: async () => {
    const { user } = get();
    if (!user) {
      console.log("[AuthStore] refreshProfile: no user logged in");
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[AuthStore] refreshProfile error:", error);
        return;
      }

      if (profile) {
        set({ profile: profile as Profile });
        console.log(
          "[AuthStore] Profile refreshed. Manager?",
          isManagerProfile(profile as Profile)
        );
      }
    } catch (error) {
      console.error("[AuthStore] refreshProfile exception:", error);
    }
  },

  /* ----------------------------------------------------------
   * SILENT SESSION REFRESH
   * -------------------------------------------------------- */
  silentSessionRefresh: async () => {
    const { initialized } = get();
    if (!initialized) {
      console.log(
        "[AuthStore] silentSessionRefresh skipped: store not initialized yet"
      );
      return;
    }

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[AuthStore] silentSessionRefresh getSession error:", error);
        return;
      }

      if (!session?.user) {
        console.log("[AuthStore] silentSessionRefresh: no active session");
        return;
      }

      // If you want to force re-fetch profile here, you can:
      // await get().refreshProfile();
    } catch (error) {
      console.error("[AuthStore] silentSessionRefresh exception:", error);
    }
  },
}));