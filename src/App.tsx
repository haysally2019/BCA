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
import Auth from "./components/Auth"; // make sure this matches your auth screen

import ProtectedRoute from "./components/ProtectedRoute";

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">

        {/* Sidebar only shows when logged in (ProtectedRoute handles redirect) */}
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
          {/* Mobile navbar */}
          <MobileNav />

          <div className="p-4 md:p-6">
            <Routes>

              {/* Public Route (login screen) */}
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