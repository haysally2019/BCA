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

import Auth from "./components/Auth"; // If you have a login screen here
import { useAuthStore } from "./store/authStore";

// ----------------------------
// Protected Route Wrapper
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
// App Component
// ----------------------------

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">

        {/* SIDEBAR */}
        <Sidebar />

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto">
          <MobileNav />

          <div className="p-4 md:p-6">
            <Routes>

              {/* PUBLIC ROUTES */}
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

              {/* DEFAULT ROUTE */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* CATCH-ALL fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;