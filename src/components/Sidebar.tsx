import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  Settings,
  DollarSign,
  Briefcase,
  Building2,
  ChevronRight,
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
        hidden md:flex md:flex-col w-72
        h-screen
        bg-slate-950
        border-r border-slate-800
        text-slate-300
        flex-shrink-0
      "
    >
      {/* Logo / header */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800/60 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg opacity-75 blur group-hover:opacity-100 transition duration-200"></div>
            <div className="relative flex items-center justify-center w-10 h-10 bg-slate-900 rounded-lg border border-slate-800">
               <img
                src="/bca.png"
                alt="BCA"
                className="w-8 h-8 object-contain"
              />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              Sales Portal
            </h1>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Blue Collar Academy
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
        <p className="px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Main Menu
        </p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "group flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                    ].join(" ")
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 opacity-75 group-hover:opacity-100" />
                    <span>{item.label}</span>
                  </div>
                  {/* Active Indicator Dot */}
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => (isActive ? "block" : "hidden")}
                  >
                     <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  </NavLink>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom user card */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/50">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center shadow-inner">
            <span className="text-xs font-bold text-white tracking-wider">
              {userDisplay.initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
              {userDisplay.name}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {userDisplay.plan}
            </p>
          </div>
          <Settings className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;