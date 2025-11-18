import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Home, Users, Settings, Target, DollarSign, Briefcase } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuthStore();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/leads', label: 'Leads', icon: Users },
    { path: '/prospects', label: 'Leads & Prospects', icon: Target },
    { path: '/commissions', label: 'Commissions', icon: DollarSign },
    { path: '/sales-tools', label: 'Sales Tools', icon: Briefcase },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const displayName = profile?.full_name || profile?.company_name || 'Sales Rep';

  return (
    <div
      className={`
        fixed inset-0 z-40 md:hidden
        ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}
      `}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black 
          transition-opacity duration-200
          ${isOpen ? 'opacity-50' : 'opacity-0'}
        `}
        onClick={onClose}
      />

      {/* Side drawer */}
      <div
        className={`
          absolute inset-y-0 left-0 w-72 max-w-[80%]
          transform transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div
          className="
            h-full
            bg-slate-950/95
            backdrop-blur-2xl
            border-r border-slate-800
            shadow-[12px_0_32px_rgba(0,0,0,0.85)]
            flex flex-col
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                Blue Collar Academy
              </p>
              <p className="text-xs text-slate-400 truncate">
                {displayName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="
                p-1.5 rounded-full
                text-slate-400
                hover:text-slate-100
                hover:bg-slate-800/80
                transition
              "
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="px-3 py-3 flex-1 overflow-y-auto">
            <ul className="space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-slate-800 text-slate-50 border border-slate-700'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-slate-50 border border-transparent hover:border-slate-800',
                        ].join(' ')
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

          {/* Footer hint */}
          <div className="px-4 py-3 border-t border-slate-800/80 text-[11px] text-slate-500">
            Optimized for mobile reps. Swipe from the left edge or tap the menu icon to open.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileNav;