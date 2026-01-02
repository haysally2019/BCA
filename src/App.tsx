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
import Proposals from "./components/Proposals";
import Auth from "./components/Auth";

import { useAuthStore } from "./store/authStore";

// ----------------------------
// Protected Route Component
// ----------------------------
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, initialized } = useAuthStore();

  if (loading || !initialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
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

  // Ref to track when the user left the tab (Auto-refresh logic)
  const lastBlurTime = useRef<number>(0);

  // ------------------------------------------------------------
  // CRASH FIX: AUTO-REFRESH LOGIC (DISABLED FOR DEBUGGING)
  // ------------------------------------------------------------
  // useEffect(() => {
  //   const handleBlur = () => {
  //     lastBlurTime.current = Date.now();
  //   };

  //   const handleFocus = () => {
  //     const now = Date.now();

  //     // CHECK: If user was away for more than 2 seconds (2000ms)
  //     // We force a hard browser reload to restore the database connection.
  //     if (lastBlurTime.current > 0 && (now - lastBlurTime.current > 2000)) {
  //       console.log("[App] Connection stale. Forcing hard reload...");
  //       window.location.reload();
  //     }

  //     lastBlurTime.current = 0;
  //   };

  //   window.addEventListener("blur", handleBlur);
  //   window.addEventListener("focus", handleFocus);

  //   return () => {
  //     window.removeEventListener("blur", handleBlur);
  //     window.removeEventListener("focus", handleFocus);
  //   };
  // }, []);

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
              <Route path="/proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
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