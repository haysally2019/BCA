import React from 'react';
import { NavLink } from 'react-router-dom';
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

const Sidebar: React.FC = () => {
  const { profile } = useAuthStore();

  // Different menu items based on user type
  const getMenuItems = () => {
    // Check if this is an agency/sales user based on company name or other indicators
    const isAgencyUser = profile?.company_name === 'Blue Collar Academy' ||
                        profile?.company_name === 'Tartan Builders Inc' ||
                        profile?.subscription_plan === 'enterprise' ||
                        profile?.subscription_plan === 'professional';

    // Check if user is manager/admin based on user_role
    const isManager = profile?.user_role === 'admin' ||
                     profile?.user_role === 'manager' ||
                     profile?.subscription_plan === 'enterprise';

    if (isAgencyUser) {
      // Management Menu - Full access including team management
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

      // Sales Rep Menu - No team management features
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
      // Default Menu
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

  const getCompanyDisplay = () => {
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

    if (isAgencyUser && isManager) {
      return {
        name: profile?.company_name || 'Blue Collar Academy',
        plan: 'Manager/Admin',
        initials: getInitials(profile?.company_name || 'BCA')
      };
    } else if (isAgencyUser) {
      return {
        name: profile?.company_name || 'Blue Collar Academy',
        plan: 'Sales Rep',
        initials: getInitials(profile?.company_name || 'BCA')
      };
    } else {
      return {
        name: profile?.company_name || 'Blue Collar Academy',
        plan: 'Premium Plan',
        initials: getInitials(profile?.company_name || 'BCA')
      };
    }
  };

  const companyDisplay = getCompanyDisplay();

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
                    `w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive
                        ? 'bg-academy-blue-50 text-academy-blue-700 border border-academy-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center space-x-2.5 p-2.5 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-academy-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">{companyDisplay.initials}</span>
          </div>
          <div className="text-xs min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">{companyDisplay.name}</p>
            <p className="text-gray-500 truncate">{companyDisplay.plan}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;