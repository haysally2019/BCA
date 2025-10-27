import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  company_name: string;
  full_name?: string;
  company_phone?: string;
  personal_phone?: string;
  company_email?: string;
  company_address?: string;
  personal_address?: string;
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
  signUp: (email: string, password: string, name: string, userType?: 'sales_rep') => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<{ unsubscribe: () => void } | null>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const createMockProfile = (user: User, name?: string): Profile => ({
  id: user.id,
  user_id: user.id,
  company_name: name || user.email?.split('@')[0] || 'User',
  full_name: name || user.email?.split('@')[0] || 'User',
  company_email: user.email,
  subscription_plan: 'professional',
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

  signUp: async (email: string, password: string, name: string, userType: 'sales_rep' = 'sales_rep') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        const mockProfile = createMockProfile(data.user, name);
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
              console.log('[AuthStore] Profile already exists, updating with correct role and subscription');

              const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({
                  company_name: name,
                  full_name: name,
                  company_email: email,
                  subscription_plan: 'professional',
                  user_role: 'sales_rep',
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', data.user.id)
                .select()
                .single();

              if (updateError) {
                console.error('[AuthStore] Failed to update profile:', updateError);
                set({ profile: existingProfile });
              } else if (updatedProfile) {
                console.log('[AuthStore] Profile updated successfully');
                set({ profile: updatedProfile });
              }

              profileCreated = true;
            } else {
              console.log(`[AuthStore] Creating profile (attempt ${retryCount + 1}/${maxRetries})`);

              const { data: profile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  user_id: data.user.id,
                  company_name: name,
                  full_name: name,
                  company_email: email,
                  subscription_plan: 'professional',
                  user_role: 'sales_rep'
                })
                .select()
                .single();

              if (createError) {
                console.error('[AuthStore] Profile creation error:', createError);

                if (createError.code === '23505') {
                  console.log('[AuthStore] Duplicate key error, updating existing profile');

                  const { data: updatedProfile, error: updateError } = await supabase
                    .from('profiles')
                    .update({
                      company_name: name,
                      full_name: name,
                      company_email: email,
                      subscription_plan: userType === 'management' ? 'enterprise' : 'professional',
                      user_role: userType === 'management' ? 'manager' : 'sales_rep',
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', data.user.id)
                    .select()
                    .single();

                  if (!updateError && updatedProfile) {
                    console.log('[AuthStore] Profile updated after duplicate key error');
                    set({ profile: updatedProfile });
                    profileCreated = true;
                  } else {
                    const { data: retryProfile } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('user_id', data.user.id)
                      .maybeSingle();

                    if (retryProfile) {
                      set({ profile: retryProfile });
                      profileCreated = true;
                    }
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

        if (getSessionError) {
          if (getSessionError.message.includes('Invalid Refresh Token') ||
              getSessionError.message.includes('Invalid login credentials') ||
              getSessionError.message.includes('refresh_token_not_found')) {
            console.log('[AuthStore] Invalid or expired session - clearing auth state');
            await supabase.auth.signOut();
            set({ user: null, profile: null, loading: false });
            return null;
          }
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

          if (event === 'TOKEN_REFRESHED') {
            console.log('[AuthStore] Token refreshed event');
            if (session?.user) {
              const currentProfile = get().profile;

              if (currentProfile?.user_id === session.user.id) {
                set({ user: session.user });
              } else {
                set({ user: session.user, profile: createMockProfile(session.user) });

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
                  console.log('[AuthStore] Error fetching profile after token refresh');
                }
              }
            } else {
              console.warn('[AuthStore] Token refresh event with no session - signing out');
              set({ user: null, profile: null, loading: false });
            }
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
    if (!profile) {
      console.error('[AuthStore] Cannot update profile: no profile found');
      throw new Error('No profile found');
    }

    console.log('[AuthStore] Updating profile with data:', updates);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.user_id)
        .select()
        .single();

      if (error) {
        console.error('[AuthStore] Profile update error:', error);
        throw error;
      }

      if (data) {
        console.log('[AuthStore] Profile updated successfully:', data);
        set({ profile: data });
      } else {
        console.warn('[AuthStore] No data returned from profile update');
      }
    } catch (error) {
      console.error('[AuthStore] Exception during profile update:', error);
      throw error;
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
