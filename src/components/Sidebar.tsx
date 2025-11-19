// src/components/Sidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  Settings,
  DollarSign,
  Briefcase,
  Building2,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

const Sidebar: React.FC = () => {
  const { profile } = useAuthStore();

  const isManager =
    profile?.user_role?.toLowerCase() === "manager" ||
    profile?.user_role?.toLowerCase() === "admin" ||
    profile?.user_role?.toLowerCase() === "owner";

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/leads", label: "Leads", icon: Users },
    ...(isManager
      ? [
          {
            path: "/team",
            label: "Team Management",
            icon: Building2,
          },
        ]
      : []),
    { path: "/commissions", label: "Commissions", icon: DollarSign },
    { path: "/sales-tools", label: "Sales Tools", icon: Briefcase },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const getInitials = (name: string) => {
    if (!name) return "BCA";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const getUserDisplay = () => {
    if (!profile) {
      return {
        name: "Blue Collar Academy",
        plan: "Sales Portal",
        initials: "BCA",
      };
    }

    const displayName = profile.full_name || profile.company_name || "User";

    return {
      name: displayName,
      plan: isManager ? "Manager" : "Sales Rep",
      initials: getInitials(displayName),
    };
  };

  const userDisplay = getUserDisplay();

  return (
    <div
      className="
        hidden md:flex md:flex-col w-64
        h-screen
        bg-slate-950/90
        border-r border-slate-800
        shadow-[12px_0_32px_rgba(0,0,0,0.85)]
        text-slate-100
        backdrop-blur-2xl
        overflow-hidden
      "
    >
      {/* Logo / header */}
      <div className="py-5 px-6 border-b border-slate-800/80 flex-shrink-0 bg-slate-950">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <img
              src="/bca.png"
              alt="Blue Collar Academy Logo"
              className="w-20 h-20 object-contain mx-auto mb-1 rounded-xl border border-slate-800 bg-slate-900"
            />
            <div className="text-[11px] text-slate-400 tracking-wide">
              Sales Portal
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="flex flex-col h-full space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-slate-800 text-slate-50 border border-slate-700"
                        : "text-slate-300 hover:bg-slate-900 hover:text-slate-50 border border-transparent hover:border-slate-800",
                    ].join(" ")
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom user card */}
      <div className="p-4 border-t border-slate-800/80 flex-shrink-0">
        <div className="flex items-center space-x-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-slate-50">
              {userDisplay.initials}
            </span>
          </div>
          <div className="text-xs min-w-0 flex-1">
            <p className="font-medium text-slate-100 truncate">
              {userDisplay.name}
            </p>
            <p className="text-slate-400 truncate">{userDisplay.plan}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;