import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";

import Dashboard from "./components/Dashboard";
import SalesTools from "./components/SalesTools";
import LeadManagement from "./components/LeadManagement";
import CommissionsTracker from "./components/CommissionsTracker";
import Settings from "./components/Settings";
import TeamManagement from "./components/TeamManagement";
import Auth from "./components/Auth";

import { useAuthStore } from "./store/authStore";

// ----------------------------
// Protected Route Component
// ----------------------------
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// ----------------------------
// Main App Component
// ----------------------------
const App: React.FC = () => {
  const { user } = useAuthStore();
  
  // 1. State to force a re-render of the app tree
  const [appKey, setAppKey] = useState(0);
  
  // 2. Ref to track when the user left the tab
  const lastBlurTime = useRef<number>(0);

  // 3. Effect to detect tab switching and force refresh instantly
  useEffect(() => {
    const handleBlur = () => {
      lastBlurTime.current = Date.now();
    };

    const handleFocus = () => {
      const now = Date.now();
      // CHECK: If user was away for more than 1 second (1000ms)
      // We assume the connection might be stale and force a refresh.
      if (lastBlurTime.current > 0 && (now - lastBlurTime.current > 1000)) {
        console.log("[App] Tab focus regained. Forcing UI refresh...");
        
        // This updates the key, causing the entire UI to re-mount
        // and re-fetch data immediately.
        setAppKey(prev => prev + 1);
      }
      lastBlurTime.current = 0;
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    // 4. The 'key' prop ensures the App re-mounts fresh on return
    <div key={appKey} className="flex h-screen bg-gray-50">

      {/* ONLY SHOW SIDEBAR IF LOGGED IN */}
      {user && <Sidebar />}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">

        {/* ONLY SHOW MOBILE NAV IF LOGGED IN */}
        {user && <MobileNav />}

        <div className="p-4 md:p-6">
          <Routes>

            {/* PUBLIC ROUTE */}
            <Route path="/auth" element={<Auth />} />

            {/* PROTECTED ROUTES */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales-tools"
              element={
                <ProtectedRoute>
                  <SalesTools />
                </ProtectedRoute>
              }
            />

            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <LeadManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/commissions"
              element={
                <ProtectedRoute>
                  <CommissionsTracker />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* DEFAULT REDIRECT */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* CATCH-ALL */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;