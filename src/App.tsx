import React, { useState, useEffect, useRef } from "react";
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
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
  const { user, silentSessionRefresh } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // ------------------------------------------------------------
  // FIX: NON-DESTRUCTIVE SESSION CHECK
  // ------------------------------------------------------------
  useEffect(() => {
    const handleFocus = () => {
      // Instead of forcing a hard reload (which wipes form state),
      // we silently verify the session is still active.
      silentSessionRefresh().catch(console.error);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [silentSessionRefresh]);

  return (
    // LAYOUT FIX: h-screen + overflow-hidden locks the outer body
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden text-slate-900 font-sans">

      {/* DESKTOP SIDEBAR */}
      {user && (
        <div className="hidden md:flex h-full shrink-0 z-20 relative">
          <Sidebar />
        </div>
      )}

      {/* MAIN LAYOUT COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">

        {/* MOBILE HEADER - Stays fixed at top of this column */}
        {user && (
          <div className="md:hidden flex-shrink-0 z-30 relative">
            <MobileHeader onMenuToggle={() => setMobileMenuOpen(true)} />
          </div>
        )}

        {/* CONTENT SCROLL AREA - This is the ONLY thing that scrolls */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 scroll-smooth">
          <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
            <Routes>
              <Route path="/auth" element={<Auth />} />

              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/sales-tools" element={<ProtectedRoute><SalesTools /></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute><LeadManagement /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
              <Route path="/commissions" element={<ProtectedRoute><CommissionsTracker /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>

        {/* MOBILE DRAWER OVERLAY */}
        {user && (
          <MobileNav 
            isOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)} 
          />
        )}

      </div>
    </div>
  );
};

export default App;