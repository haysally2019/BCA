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
      <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-slate-100">
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
    <div
      className="
        min-h-screen flex 
        bg-[#05070B]
        text-slate-100
        bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_60%)]
      "
    >

      {/* MOBILE HEADER */}
      {user && (
        <MobileHeader onMenuToggle={() => setMobileMenuOpen(true)} />
      )}

      {/* MOBILE NAV DRAWER */}
      {user && (
        <MobileNav
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}

      {/* DESKTOP SIDEBAR */}
      {user && (
        <div className="hidden md:flex">
          <Sidebar />
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 h-screen overflow-y-auto pt-14 md:pt-0 px-3 md:px-6 pb-6">
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
  );
};

export default App;