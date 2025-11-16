import React from "react";
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
// PROTECTED ROUTE
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
// MAIN APP CONTENT
// ----------------------------

const App: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
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