import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import MobileHeader from "./components/MobileHeader";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">

      {/* ONLY SHOW SIDEBAR IF LOGGED IN */}
      {user && <Sidebar />}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">

        {/* MOBILE HEADER */}
        {user && <MobileHeader onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />}

        {/* MOBILE NAV */}
        {user && <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />}

        <div className="p-4 md:p-6 pt-16 md:pt-4">
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