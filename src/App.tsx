import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import MobileHeader from './components/MobileHeader';
import Dashboard from './components/Dashboard';
import LeadManagement from './components/LeadManagement';
import Settings from './components/Settings';
import ProspectsManager from './components/ProspectsManager';
import CommissionsTracker from './components/CommissionsTracker';
import SalesTools from './components/SalesTools';
import Auth from './components/Auth';
import ChangePassword from './components/ChangePassword';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { supabase } from './lib/supabaseClient';
import { logError } from './lib/errorUtils';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppContent() {
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRecoveryUI, setShowRecoveryUI] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const { user, profile, loading, initialized, initialize, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;
    let initTimeout: NodeJS.Timeout | null = null;

    const initializeAuth = async () => {
      if (!mounted) return;

      if (initialized) {
        console.log('[App] Already initialized, skipping auth initialization');
        return;
      }

      try {
        const initPromise = initialize();

        initTimeout = setTimeout(() => {
          if (mounted && loading) {
            console.warn('[App] Auth initialization timeout - forcing completion');
            setShowRecoveryUI(true);
          }
        }, 10000);

        authSubscription = await initPromise;

        if (initTimeout) {
          clearTimeout(initTimeout);
          initTimeout = null;
        }
      } catch (error) {
        logError(error, 'Failed to initialize auth');
        if (initTimeout) {
          clearTimeout(initTimeout);
          initTimeout = null;
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let recoveryTimeout: NodeJS.Timeout | null = null;

    if (loading) {
      recoveryTimeout = setTimeout(() => {
        if (loading) {
          console.warn('[App] Still loading after 5 seconds - showing recovery UI');
          setShowRecoveryUI(true);
        }
      }, 5000);
    } else {
      setShowRecoveryUI(false);
      setRecoveryAttempts(0);
    }

    return () => {
      if (recoveryTimeout) {
        clearTimeout(recoveryTimeout);
      }
    };
  }, [loading]);

  useEffect(() => {
    if (location.pathname !== '/' && user && profile) {
      console.log('[App] Saving current route to sessionStorage:', location.pathname);
      sessionStorage.setItem('currentRoute', location.pathname);
    }
  }, [location.pathname, user, profile]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      const currentUser = useAuthStore.getState().user;
      const currentProfile = useAuthStore.getState().profile;
      const isInitialized = useAuthStore.getState().initialized;

      if (document.visibilityState === 'hidden' && currentUser && currentProfile && location.pathname !== '/') {
        console.log('[App] Tab becoming hidden - saving current route:', location.pathname);
        sessionStorage.setItem('currentRoute', location.pathname);
      } else if (document.visibilityState === 'visible') {
        console.log('[App] Tab becoming visible - validating session and refreshing data');

        // Validate session in background without disrupting UI
        setTimeout(async () => {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
              console.error('[App] Session validation error on tab focus:', error);
              if (error.message.includes('Invalid Refresh Token') ||
                  error.message.includes('Invalid login credentials') ||
                  error.message.includes('refresh_token_not_found')) {
                console.log('[App] Invalid session detected - signing out');
                await useAuthStore.getState().signOut();
                navigate('/');
              }
            } else if (!session) {
              console.log('[App] No session found on tab focus - signing out');
              await useAuthStore.getState().signOut();
              navigate('/');
            } else {
              console.log('[App] Session validated successfully on tab focus');
              // Refresh profile to ensure latest data is loaded
              await useAuthStore.getState().refreshProfile();

              // Invalidate data cache to trigger fresh data load on next component mount
              useDataStore.getState().invalidateCache();
            }
          } catch (error) {
            console.error('[App] Error during session refresh on tab focus:', error);
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!user || !profile) {
      setMustChangePassword(false);
      return;
    }

    const mustChange = profile.must_change_password === true;
    console.log('[Password Check] Profile must_change_password:', mustChange);
    setMustChangePassword(mustChange);
  }, [user?.id, profile?.must_change_password]);

  useEffect(() => {
    if (!profile || !initialized) return;

    if (location.pathname === '/') {
      const savedRoute = sessionStorage.getItem('currentRoute');
      console.log('[App] On root path, checking for saved route:', savedRoute);

      if (savedRoute && savedRoute !== '/') {
        console.log('[App] Restoring saved route:', savedRoute);
        navigate(savedRoute, { replace: true });
        return;
      }

      const isAgencyUser = profile?.company_name === 'Blue Collar Academy' ||
                          profile?.company_name === 'Tartan Builders Inc' ||
                          profile?.subscription_plan === 'enterprise' ||
                          profile?.subscription_plan === 'professional';

      console.log('[App] No saved route, navigating to default dashboard');
      if (isAgencyUser) {
        navigate('/agency-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [profile, initialized, location.pathname, navigate]);

  const isAgencyUser = profile?.company_name === 'Blue Collar Academy' ||
                      profile?.company_name === 'Tartan Builders Inc' ||
                      profile?.subscription_plan === 'enterprise' ||
                      profile?.subscription_plan === 'professional';

  const isManager = profile?.user_role === 'admin' ||
                   profile?.user_role === 'manager' ||
                   profile?.subscription_plan === 'enterprise';

  const handleRecoveryRetry = async () => {
    setRecoveryAttempts(prev => prev + 1);
    setShowRecoveryUI(false);

    try {
      console.log('[App] Recovery retry attempt:', recoveryAttempts + 1);
      await initialize();
    } catch (error) {
      logError(error, 'Recovery retry failed');
      setShowRecoveryUI(true);
    }
  };

  const handleForceReload = () => {
    console.log('[App] Force reload triggered by user');
    window.location.reload();
  };

  if (loading && !initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-academy-blue-600 mx-auto mb-4"></div>
          {showRecoveryUI && (
            <div className="mt-6 max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-700 mb-4">
                Taking longer than expected...
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleRecoveryRetry}
                  className="w-full px-4 py-2 bg-academy-blue-600 text-white rounded-lg hover:bg-academy-blue-700 transition-colors"
                >
                  Retry Connection
                </button>
                {recoveryAttempts > 1 && (
                  <button
                    onClick={handleForceReload}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Reload Page
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <ErrorBoundary>
        <Auth />
        <Toaster position="top-right" />
      </ErrorBoundary>
    );
  }

  if (user && profile && mustChangePassword) {
    return (
      <ErrorBoundary>
        <ChangePassword
          onSuccess={async () => {
            await refreshProfile();
            setMustChangePassword(false);
          }}
        />
        <Toaster position="top-right" />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <div className="flex h-screen bg-gray-50">
        <ErrorBoundary>
          <Sidebar />
        </ErrorBoundary>
        <ErrorBoundary>
          <MobileNav
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        </ErrorBoundary>
        <div className="flex-1 flex flex-col overflow-hidden">
          <MobileHeader onMenuToggle={() => setMobileMenuOpen(true)} />
          <div className="flex-1 overflow-auto pt-14 md:pt-0">
            <main className="p-3 sm:p-4 lg:p-6">
              <ErrorBoundary>
           <Routes>
  {/* Core Portal Routes */}
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/sales-tools" element={<SalesTools />} />
  <Route path="/leads" element={<LeadManagement />} />
  <Route path="/prospects" element={<ProspectsManager />} />
  <Route path="/commissions" element={<CommissionsTracker />} />
  <Route path="/settings" element={<Settings />} />

  {/* Default Route */}
  <Route path="/" element={<Navigate to="/dashboard" replace />} />
</Routes>
              </ErrorBoundary>
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return <AppContent />;
}

export default App;