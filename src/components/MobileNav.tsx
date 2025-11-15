import React from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { Home, Users, Settings, Target, DollarSign, Briefcase } from 'lucide-react';
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
      className={`fixed inset-0 z-40 md:hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity ${
          isOpen ? 'opacity-40' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute inset-y-0 left-0 w-72 bg-white shadow-xl transform transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">Blue Collar Academy</p>
            <p className="text-xs text-gray-500 truncate">{displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-3 py-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      [
                        'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                        isActive
                          ? 'bg-academy-blue-50 text-academy-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                      ].join(' ')
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default MobileNav;