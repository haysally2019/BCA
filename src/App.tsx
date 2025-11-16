import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";

import Dashboard from "./components/Dashboard";
import SalesTools from "./components/SalesTools";
import LeadManagement from "./components/LeadManagement";
import CommissionsTracker from "./components/CommissionsTracker";
import Settings from "./components/Settings";
import TeamManagement from "./components/TeamManagement";
import Auth from "./components/Auth";

import ProtectedRoute from "./components/ProtectedRoute";

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        
        {/* Sidebar should only show when logged in */}
        <ProtectedRoute>
          <Sidebar />
        </ProtectedRoute>

        <div className="flex-1 overflow-y-auto">

          {/* Mobile Nav only when logged in */}
          <ProtectedRoute>
            <MobileNav />
          </ProtectedRoute>

          <div className="p-4 md:p-6">
            <Routes>

              {/* Public Route */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes */}
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

              {/* Redirect root → dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;