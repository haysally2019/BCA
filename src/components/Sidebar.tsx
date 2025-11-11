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
          { path: '/prospects', label: 'Leads & Pipeline', icon: Target },
          { path: '/team', label: 'Team Management', icon: Building2 },
          { path: '/commissions', label: 'Revenue & Payments', icon: DollarSign },
          { path: '/reports', label: 'Reports & Analytics', icon: FileText },
          { path: '/sales-tools', label: 'Sales Tools', icon: Briefcase },
          { path: '/settings', label: 'Settings', icon: Settings },
        ];
      }

      // Sales Rep Menu - No team management features
      return [
        { path: '/agency-dashboard', label: 'Dashboard', icon: Home },
        { path: '/prospects', label: 'Leads & Pipeline', icon: Target },
        { path: '/commissions', label: 'Performance & Payouts', icon: DollarSign },
        { path: '/sales-tools', label: 'Tools', icon: Briefcase },
        { path: '/reports', label: 'My Reports', icon: FileText },
        { path: '/settings', label: 'Settings', icon: Settings },
      ];
    } else {
      // Default Menu
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/leads', label: 'Leads', icon: Users },
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
    <div className="app-sidebar">
      <div className="app-sidebar__logo">
        <div className="app-sidebar__logo-inner">
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

      <nav className="app-sidebar__nav">
        <ul className="app-sidebar__nav-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `app-sidebar__link ${
                      isActive ? 'app-sidebar__link--active' : 'app-sidebar__link--inactive'
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

      <div className="app-sidebar__footer">
        <div className="app-sidebar__user">
          <div className="app-sidebar__avatar">
            <span className="text-white">{userDisplay.initials}</span>
          </div>
          <div className="app-sidebar__user-details flex-1">
            <p className="app-sidebar__user-name">{userDisplay.name}</p>
            <p className="app-sidebar__user-plan">{userDisplay.plan}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
