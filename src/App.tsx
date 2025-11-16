import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import MobileNav from "./components/layout/MobileNav";

import Dashboard from "./components/Dashboard";
import SalesTools from "./components/SalesTools";
import LeadManagement from "./components/LeadManagement";
import CommissionsTracker from "./components/CommissionsTracker";
import Settings from "./components/Settings";

// NEW: Team Management
import TeamManagement from "./components/TeamManagement";

import { useAuthStore } from "./store/authStore";

const App: React.FC = () => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-700">
        Loading...
      </div>
    );
  }

  // If not signed in, redirect to login screen
  if (!user) {
    return (
      <Navigate to="/auth" replace />
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar for Desktop */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Mobile Navigation */}
          <MobileNav />

          {/* Page Content */}
          <div className="p-4 md:p-6">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sales-tools" element={<SalesTools />} />
              <Route path="/leads" element={<LeadManagement />} />

              {/* NEW TEAM MANAGEMENT ROUTE */}
              <Route path="/team" element={<TeamManagement />} />

              <Route path="/commissions" element={<CommissionsTracker />} />
              <Route path="/settings" element={<Settings />} />

              {/* Default route → dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Catch unwanted paths */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;