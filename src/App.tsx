import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";

import Dashboard from "./components/Dashboard";
import SalesTools from "./components/SalesTools";
import LeadManagement from "./components/LeadManagement";
import CommissionsTracker from "./components/CommissionsTracker";
import Settings from "./components/Settings";

import TeamManagement from "./components/TeamManagement";

import { useAuthStore } from "./store/authStore";

const App: React.FC = () => {
  const { loading } = useAuthStore(); // we are NOT blocking on `user` anymore

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-700">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
          <MobileNav />

          <div className="p-4 md:p-6">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sales-tools" element={<SalesTools />} />
              <Route path="/leads" element={<LeadManagement />} />

              {/* Team Management */}
              <Route path="/team" element={<TeamManagement />} />

              <Route path="/commissions" element={<CommissionsTracker />} />
              <Route path="/settings" element={<Settings />} />

              {/* Default route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;