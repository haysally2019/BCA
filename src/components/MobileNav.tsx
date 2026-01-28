import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X, Home, Users, Settings, Target, DollarSign, Briefcase, LogOut, FileText, PhoneCall } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { profile, signOut } = useAuthStore();

  // Lock body scroll when menu is open to prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const isManager =
    profile?.user_role?.toLowerCase() === "manager" ||
    profile?.user_role?.toLowerCase() === "admin" ||
    profile?.user_role?.toLowerCase() === "owner";

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/cold-call', label: 'Cold Call', icon: PhoneCall },
    { path: '/leads', label: 'Leads', icon: Users },
    { path: '/proposals', label: 'Proposals', icon: FileText },
    ...(isManager ? [{ path: '/team', label: 'Team Management', icon: Target }] : []),
    { path: '/commissions', label: 'Commissions', icon: DollarSign },
    { path: '/sales-tools', label: 'Sales Tools', icon: Briefcase },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const displayName = profile?.full_name || profile?.company_name || 'Sales Rep';
  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'SP';

  return (
    <div className={`fixed inset-0 z-50 md:hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      
      {/* 1. Backdrop (Blur + Fade) */}
      <div
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* 2. Drawer Panel */}
      <div
        className={`absolute inset-y-0 left-0 w-[85%] max-w-xs bg-slate-950 border-r border-slate-800 shadow-2xl transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          
          {/* Header Section */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-900/50">
            <span className="text-sm font-bold text-white tracking-wide">MENU</span>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card (Top) */}
          <div className="px-5 py-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-slate-800">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold truncate text-base">{displayName}</p>
                <p className="text-xs text-slate-400 truncate capitalize">
                  {profile?.user_role?.replace('_', ' ') || 'Team Member'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/30">
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MobileNav;