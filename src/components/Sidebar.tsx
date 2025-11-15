import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Settings, Target, DollarSign, Briefcase } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Sidebar: React.FC = () => {
  const { profile } = useAuthStore();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/leads', label: 'Leads', icon: Users },
    { path: '/prospects', label: 'Leads & Prospects', icon: Target },
    { path: '/commissions', label: 'Commissions', icon: DollarSign },
    { path: '/sales-tools', label: 'Sales Tools', icon: Briefcase },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const getInitials = (name: string) => {
    if (!name) return 'BCA';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const getUserDisplay = () => {
    if (!profile) {
      return {
        name: 'Blue Collar Academy',
        plan: 'Sales Portal',
        initials: 'BCA',
      };
    }

    const displayName = profile.full_name || profile.company_name || 'Sales Rep';
    let planLabel = 'Sales Portal';

    if (profile.subscription_plan === 'enterprise') planLabel = 'Enterprise Plan';
    else if (profile.subscription_plan === 'professional') planLabel = 'Professional Plan';

    return {
      name: displayName,
      plan: planLabel,
      initials: getInitials(displayName),
    };
  };

  const userDisplay = getUserDisplay();

  return (
    <div className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 h-screen shadow-sm overflow-hidden">
      <div className="py-3 px-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <img
              src="/bca.png"
              alt="Blue Collar Academy Logo"
              className="w-24 h-24 object-contain mx-auto -mb-1"
            />
            <div className="text-xs text-gray-500">Sales Portal</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2.5 overflow-y-auto scrollbar-hide">
        <ul className="flex flex-col h-full space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-academy-blue-50 text-academy-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
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

      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center space-x-2.5 p-2.5 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-academy-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">{userDisplay.initials}</span>
          </div>
          <div className="text-xs min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">{userDisplay.name}</p>
            <p className="text-gray-500 truncate">{userDisplay.plan}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;