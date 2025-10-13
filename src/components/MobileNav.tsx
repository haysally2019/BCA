import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Menu } from 'lucide-react';
import {
  Home,
  Users,
  Calendar,
  Settings,
  BarChart3,
  Building2,
  Target,
  DollarSign,
  FileText,
  Briefcase
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuthStore();

  const getMenuItems = () => {
    const isAgencyUser = profile?.company_name === 'Blue Collar Academy' ||
                        profile?.company_name === 'Tartan Builders Inc' ||
                        profile?.subscription_plan === 'enterprise' ||
                        profile?.subscription_plan === 'professional';

    const isManager = profile?.user_role === 'admin' ||
                     profile?.user_role === 'manager' ||
                     profile?.subscription_plan === 'enterprise';

    if (isAgencyUser) {
      if (isManager) {
        return [
          { path: '/agency-dashboard', label: 'Dashboard', icon: Home },
          { path: '/prospects', label: 'Leads', icon: Users },
          { path: '/sales-pipeline', label: 'Pipeline', icon: Target },
          { path: '/team', label: 'Team Management', icon: Building2 },
          { path: '/commissions', label: 'Commissions', icon: DollarSign },
          { path: '/reports', label: 'Reports & Analytics', icon: FileText },
          { path: '/sales-tools', label: 'Sales Tools', icon: Briefcase },
          { path: '/settings', label: 'Settings', icon: Settings },
        ];
      }

      return [
        { path: '/agency-dashboard', label: 'Dashboard', icon: Home },
        { path: '/prospects', label: 'Leads', icon: Users },
        { path: '/sales-pipeline', label: 'Pipeline', icon: Target },
        { path: '/commissions', label: 'Commissions', icon: DollarSign },
        { path: '/sales-tools', label: 'Tools', icon: Briefcase },
        { path: '/reports', label: 'My Reports', icon: FileText },
        { path: '/settings', label: 'Settings', icon: Settings },
      ];
    } else {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/leads', label: 'Leads', icon: Users },
        { path: '/pipeline', label: 'Pipeline', icon: Target },
        { path: '/calendar', label: 'Calendar', icon: Calendar },
        { path: '/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/settings', label: 'Settings', icon: Settings },
      ];
    }
  };

  const menuItems = getMenuItems();

  const getUserDisplay = () => {
    const isAgencyUser = profile?.company_name === 'Blue Collar Academy' ||
                        profile?.company_name === 'Tartan Builders Inc' ||
                        profile?.subscription_plan === 'enterprise' ||
                        profile?.subscription_plan === 'professional';

    const isManager = profile?.user_role === 'admin' ||
                     profile?.user_role === 'manager' ||
                     profile?.subscription_plan === 'enterprise';

    const getInitials = (name: string) => {
      return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 3);
    };

    const displayName = profile?.full_name || profile?.company_name || 'User';

    if (isAgencyUser && isManager) {
      return {
        name: displayName,
        plan: 'Manager/Admin',
        initials: getInitials(displayName)
      };
    } else if (isAgencyUser) {
      return {
        name: displayName,
        plan: 'Sales Rep',
        initials: getInitials(displayName)
      };
    } else {
      return {
        name: displayName,
        plan: 'Premium Plan',
        initials: getInitials(displayName)
      };
    }
  };

  const userDisplay = getUserDisplay();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div className={`fixed inset-y-0 left-0 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-out z-50 md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="py-3.5 px-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/bca.png"
                alt="Blue Collar Academy Logo"
                className="w-10 h-10 object-contain"
              />
              <div>
                <div className="text-sm font-semibold text-gray-900">BCA Sales Portal</div>
                <div className="text-xs text-gray-500">Blue Collar Academy</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            <ul className="space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium touch-manipulation ${
                          isActive
                            ? 'bg-academy-blue-50 text-academy-blue-700 border border-academy-blue-200 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-9 h-9 bg-academy-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-white">{userDisplay.initials}</span>
              </div>
              <div className="text-sm min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{userDisplay.name}</p>
                <p className="text-gray-500 text-xs">{userDisplay.plan}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
