import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import MobileHeader from './components/MobileHeader';
import Dashboard from './components/Dashboard';
import LeadManagement from './components/LeadManagement';
import Calendar from './components/Calendar';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import AgencyDashboard from './components/AgencyDashboard';
import ProspectsManager from './components/ProspectsManager';
import SalesPipeline from './components/SalesPipeline';
import CommissionsTracker from './components/CommissionsTracker';
import SalesTools from './components/SalesTools';
import AgencyReports from './components/AgencyReports';
import SalesTeam from './components/SalesTeam';
import Auth from './components/Auth';
import ChangePassword from './components/ChangePassword';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
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

      if (initialized && user && profile) {
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
  }, [initialize, initialized, user, profile]);

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
    if (location.pathname !== '/' && user) {
      sessionStorage.setItem('currentRoute', location.pathname);
    }
  }, [location.pathname, user]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('[App] Tab became visible - silently refreshing session');

        try {
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('[App] Session refresh error:', error);
            if (error.message.includes('Invalid Refresh Token') || error.message.includes('Invalid login credentials')) {
              console.log('[App] Invalid token - signing out');
              await useAuthStore.getState().signOut();
              navigate('/');
            }
          } else if (session?.user) {
            console.log('[App] Session refreshed successfully - staying on current page');
          } else {
            console.log('[App] No active session - user will be redirected to login');
          }
        } catch (error) {
          console.error('[App] Error checking session:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, navigate]);

  useEffect(() => {
    const checkPasswordChange = async () => {
      if (!user) {
        console.log('[Password Check] No user, clearing must_change_password flag');
        setMustChangePassword(false);
        return;
      }

      try {
        console.log('[Password Check] Checking must_change_password flag for user:', user.id);

        const timestamp = new Date().getTime();
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('[Password Check] Error fetching profile:', profileError);
          setMustChangePassword(false);
          return;
        }

        if (!profileData) {
          console.warn('[Password Check] No profile found for user');
          setMustChangePassword(false);
          return;
        }

        const mustChange = profileData?.must_change_password === true;
        console.log('[Password Check] Profile data:', {
          must_change_password: profileData?.must_change_password,
          mustChange,
          timestamp
        });

        setMustChangePassword(mustChange);
      } catch (err) {
        console.error('[Password Check] Exception:', err);
        setMustChangePassword(false);
      }
    };

    checkPasswordChange();
  }, [user, profile]);

  useEffect(() => {
    if (profile && initialized && location.pathname === '/') {
      const savedRoute = sessionStorage.getItem('currentRoute');

      if (savedRoute && savedRoute !== '/') {
        console.log('[App] Restoring saved route:', savedRoute);
        navigate(savedRoute, { replace: true });
        return;
      }

      const isAgencyUser = profile?.company_name === 'Blue Collar Academy' ||
                          profile?.company_name === 'Tartan Builders Inc' ||
                          profile?.subscription_plan === 'enterprise' ||
                          profile?.subscription_plan === 'professional';

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
                  {/* Agency/Sales Routes */}
                  <Route path="/agency-dashboard" element={<AgencyDashboard />} />
                  <Route path="/prospects" element={<ProspectsManager />} />
                  <Route path="/sales-pipeline" element={<SalesPipeline />} />
                  <Route path="/commissions" element={<CommissionsTracker />} />
                  <Route path="/sales-tools" element={<SalesTools />} />
                  <Route path="/reports" element={<AgencyReports />} />
                  <Route path="/team" element={isManager ? <SalesTeam /> : <AgencyReports />} />

                  {/* Client Routes */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leads" element={<LeadManagement />} />
                  <Route path="/pipeline" element={<SalesPipeline />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/analytics" element={<Analytics />} />

                  {/* Shared Routes */}
                  <Route path="/settings" element={<Settings />} />

                  {/* Default Route */}
                  <Route path="/" element={<Navigate to={isAgencyUser ? '/agency-dashboard' : '/dashboard'} replace />} />
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
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;