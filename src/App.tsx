import React, { useState, useEffect } from 'react';
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

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, loading, initialize, refreshProfile } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      if (mounted) {
        try {
          authSubscription = await initialize();
        } catch (error) {
          logError(error, 'Failed to initialize auth');
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
    };
  }, [initialize]);

  useEffect(() => {
    const checkPasswordChange = async () => {
      if (!user) {
        setMustChangePassword(false);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          setMustChangePassword(false);
          return;
        }

        const mustChange = profileData?.must_change_password === true;
        setMustChangePassword(mustChange);
      } catch (err) {
        setMustChangePassword(false);
      }
    };

    checkPasswordChange();
  }, [user, profile]);

  useEffect(() => {
    // Set default view based on user type
    const isAgencyUser = profile?.company_name === 'Blue Collar Academy' || 
                        profile?.subscription_plan === 'enterprise' ||
                        profile?.subscription_plan === 'professional';
    
    if (isAgencyUser) {
      setActiveView('agency-dashboard');
    } else {
      setActiveView('dashboard');
    }
  }, [profile]);

  const renderActiveView = () => {
    // Management and Sales Rep Views
    const isAgencyUser = profile?.company_name === 'Blue Collar Academy' ||
                        profile?.subscription_plan === 'enterprise' ||
                        profile?.subscription_plan === 'professional';

    const isManager = profile?.user_role === 'admin' ||
                     profile?.user_role === 'manager' ||
                     profile?.subscription_plan === 'enterprise';

    if (isAgencyUser) {
      switch (activeView) {
        case 'agency-dashboard':
          return <AgencyDashboard />;
        case 'prospects':
          return <ProspectsManager />;
        case 'sales-pipeline':
          return <SalesPipeline />;
        case 'commissions':
          return <CommissionsTracker />;
        case 'sales-tools':
          return <SalesTools />;
        case 'reports':
          return <AgencyReports />;
        case 'team':
          return isManager ? <SalesTeam /> : <AgencyReports />;
        case 'settings':
          return <Settings />;
        default:
          return <AgencyDashboard />;
      }
    }

    // Client Views (Roofing Company)
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'leads':
        return <LeadManagement />;
      case 'pipeline':
        return <SalesPipeline />;
      case 'calendar':
        return <Calendar />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-academy-blue-600"></div>
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
      <div className="flex h-screen bg-gray-50">
        <ErrorBoundary>
          <Sidebar activeView={activeView} onViewChange={setActiveView} />
        </ErrorBoundary>
        <ErrorBoundary>
          <MobileNav
            activeView={activeView}
            onViewChange={setActiveView}
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        </ErrorBoundary>
        <div className="flex-1 flex flex-col overflow-hidden">
          <MobileHeader onMenuToggle={() => setMobileMenuOpen(true)} />
          <div className="flex-1 overflow-auto pt-14 md:pt-0">
            <main className="p-3 sm:p-4 lg:p-6">
              <ErrorBoundary>
                {renderActiveView()}
              </ErrorBoundary>
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}

export default App;