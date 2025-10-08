import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  company_name: string;
  company_phone?: string;
  company_email?: string;
  company_address?: string;
  subscription_plan: string;
  user_role?: string;
  affiliatewp_id?: number;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, userType?: 'management' | 'sales_rep', affiliatewpId?: number) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<{ unsubscribe: () => void } | null>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const createMockProfile = (user: User, name?: string, userType?: 'management' | 'sales_rep'): Profile => ({
  id: user.id,
  user_id: user.id,
  company_name: name || user.email?.split('@')[0] || 'My Company',
  company_email: user.email,
  subscription_plan: userType === 'management' ? 'enterprise' : 'professional',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create mock profile for immediate use
        const mockProfile = createMockProfile(data.user);
        set({ user: data.user, profile: mockProfile });

        // Try to fetch real profile in background
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          if (profile) {
            set({ profile });
          }
        } catch (profileError) {
          // Using mock profile as fallback
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      throw new Error(errorMessage);
    }
  },

  signUp: async (email: string, password: string, name: string, userType: 'management' | 'sales_rep' = 'sales_rep', affiliatewpId?: number) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        const mockProfile = { ...createMockProfile(data.user, name, userType), affiliatewp_id: affiliatewpId };
        set({ user: data.user, profile: mockProfile });

        let profileCreated = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!profileCreated && retryCount < maxRetries) {
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', data.user.id)
              .maybeSingle();

            if (existingProfile) {
              console.log('[AuthStore] Profile already exists for user');
              set({ profile: existingProfile });
              profileCreated = true;
            } else {
              console.log(`[AuthStore] Creating profile (attempt ${retryCount + 1}/${maxRetries})`);

              const { data: profile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  user_id: data.user.id,
                  company_name: name,
                  company_email: email,
                  subscription_plan: userType === 'management' ? 'enterprise' : 'professional',
                  user_role: userType === 'management' ? 'manager' : 'sales_rep',
                  affiliatewp_id: affiliatewpId
                })
                .select()
                .single();

              if (createError) {
                console.error('[AuthStore] Profile creation error:', createError);

                if (createError.code === '23505') {
                  const { data: retryProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', data.user.id)
                    .maybeSingle();

                  if (retryProfile) {
                    console.log('[AuthStore] Profile exists after duplicate key error');
                    set({ profile: retryProfile });
                    profileCreated = true;
                  }
                } else {
                  retryCount++;
                  if (retryCount < maxRetries) {
                    console.warn(`[AuthStore] Retrying profile creation in 1 second...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
              } else if (profile) {
                console.log('[AuthStore] Profile created successfully');
                set({ profile });
                profileCreated = true;
              }
            }
          } catch (profileError) {
            console.error('[AuthStore] Exception during profile creation:', profileError);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (!profileCreated) {
          console.error('[AuthStore] CRITICAL: Failed to create profile after all retries');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      throw new Error(errorMessage);
    }
  },

  signOut: async () => {
    // Clear local state immediately and ensure it stays cleared
    set({ user: null, profile: null, loading: false });
    
    // Try to sign out from server in background
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Sign out error occurred
    }
    
    // Force state to remain cleared
    set({ user: null, profile: null, loading: false });
  },

  initialize: async () => {
    // Don't initialize if user was just signed out
    const { user: currentUser } = get();
    if (currentUser === null && get().loading === false) {
      return null;
    }

    const initTimeout = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('[AuthStore] Initialize timeout - forcing completion');
        set({ loading: false });
        resolve(null);
      }, 8000);
    });

    try {
      set({ loading: true });

      const initPromise = (async () => {
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

        if (getSessionError && getSessionError.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          set({ user: null, profile: null, loading: false });
          return null;
        }

        if (session?.user) {
          const mockProfile = createMockProfile(session.user);
          set({ user: session.user, profile: mockProfile, loading: false });

          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (!profileError && profile) {
              set({ profile });
            }
          } catch (profileError) {
            console.log('[AuthStore] Using mock profile as fallback');
          }
        } else {
          set({ user: null, profile: null, loading: false });
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            set({ user: null, profile: null, loading: false });
            return;
          }

          if (event === 'USER_UPDATED') {
            if (session?.user) {
              set({ user: session.user });

              try {
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', session.user.id)
                  .maybeSingle();

                if (!profileError && profile) {
                  set({ profile });
                }
              } catch (error) {
                console.log('[AuthStore] Error refreshing profile after USER_UPDATED');
              }
            }
            return;
          }

          if (session?.user) {
            const mockProfile = createMockProfile(session.user);
            set({ user: session.user, profile: mockProfile });

            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (!profileError && profile) {
                set({ profile });
              }
            } catch (error) {
              console.log('[AuthStore] Using mock profile due to database error');
            }
          } else {
            set({ user: null, profile: null });
          }
        });

        return subscription;
      })();

      return await Promise.race([initPromise, initTimeout]);
    } catch (error) {
      console.error('[AuthStore] Auth initialization error:', error);
      set({ user: null, profile: null, loading: false });
      return null;
    } finally {
      const currentState = get();
      if (currentState.loading) {
        set({ loading: false });
      }
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { profile } = get();
    if (!profile) return;

    const updatedProfile = { ...profile, ...updates, updated_at: new Date().toISOString() };
    set({ profile: updatedProfile });

    try {
      const { data } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (data) {
        set({ profile: data });
      }
    } catch (error) {
      // Profile update failed, using local update
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) {
      console.log('[AuthStore] Cannot refresh profile: no user logged in');
      return;
    }

    try {
      console.log('[AuthStore] Refreshing profile for user:', user.id);
      const timestamp = new Date().getTime();

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[AuthStore] Error refreshing profile:', error);
        return;
      }

      if (profile) {
        console.log('[AuthStore] Profile refreshed successfully:', {
          profileId: profile.id,
          must_change_password: profile.must_change_password,
          timestamp
        });
        set({ profile });
      } else {
        console.warn('[AuthStore] No profile found for user');
      }
    } catch (error) {
      console.error('[AuthStore] Exception refreshing profile:', error);
    }
  },
}));
