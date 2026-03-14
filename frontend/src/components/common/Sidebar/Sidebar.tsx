import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  HomeIcon,
  TruckIcon,
  UserGroupIcon,
  MapIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PhoneIcon,
  ClockIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  // Admin routes
  {
    name: 'Dashboard',
    to: '/admin',
    icon: HomeIcon,
    roles: ['admin'],
  },
  {
    name: 'Fleet',
    to: '/admin/fleet',
    icon: TruckIcon,
    roles: ['admin'],
  },
  {
    name: 'Audit Log',
    to: '/admin/audit',
    icon: DocumentChartBarIcon,
    roles: ['admin'],
  },
  {
    name: 'Exports',
    to: '/admin/exports',
    icon: ChartBarIcon,
    roles: ['admin'],
  },
  {
    name: 'User Management',
    to: '/admin/users',
    icon: UsersIcon,
    roles: ['admin'],
  },
  {
    name: 'System Health',
    to: '/admin/system',
    icon: WrenchScrewdriverIcon,
    roles: ['admin'],
  },
  {
    name: 'Reports',
    to: '/admin/reports',
    icon: DocumentChartBarIcon,
    roles: ['admin'],
  },

    // Hospital routes
  {
    name: 'Dashboard',
    to: '/hospital',
    icon: HomeIcon,
    roles: ['hospital'],
  },
  {
    name: 'Incidents',
    to: '/hospital/incidents',
    icon: TruckIcon,
    roles: ['hospital'],
  },
  {
    name: 'Responders',
    to: '/hospital/responders',
    icon: UserGroupIcon,
    roles: ['hospital'],
  },
  {
    name: 'Ambulances',
    to: '/hospital/ambulances',
    icon: MapIcon,
    roles: ['hospital'],
  },
  {
    name: 'Analytics',
    to: '/hospital/analytics',
    icon: ChartBarIcon,
    roles: ['hospital'],
  },
  {
    name: 'Bed Tracker',
    to: '/hospital/beds',
    icon: UserGroupIcon,
    roles: ['hospital'],
  },
  {
    name: 'ETA Countdown',
    to: '/hospital/eta',
    icon: ClockIcon,
    roles: ['hospital'],
  },
  {
    name: 'Shift Manager',
    to: '/hospital/shifts',
    icon: WrenchScrewdriverIcon,
    roles: ['hospital'],
  },
  {
    name: 'Settings',
    to: '/hospital/settings',
    icon: Cog6ToothIcon,
    roles: ['hospital'],
  },
  // Driver routes
  {
    name: 'Dashboard',
    to: '/driver',
    icon: HomeIcon,
    roles: ['driver'],
  },
  {
    name: 'My Trips',
    to: '/driver/trips',
    icon: ClockIcon,
    roles: ['driver'],
  },
  {
    name: 'Emergency Contacts',
    to: '/driver/contacts',
    icon: PhoneIcon,
    roles: ['driver'],
  },
  {
    name: 'Medical Profile',
    to: '/driver/medical',
    icon: UserGroupIcon,
    roles: ['driver'],
  },
  {
    name: 'Trip Scoring',
    to: '/driver/scoring',
    icon: ChartBarIcon,
    roles: ['driver'],
  },
  {
    name: 'Offline Mode',
    to: '/driver/offline',
    icon: WrenchScrewdriverIcon,
    roles: ['driver'],
  },
  {
    name: 'Preferences',
    to: '/driver/preferences',
    icon: Cog6ToothIcon,
    roles: ['driver'],
  },
  {
    name: 'Next of Kin',
    to: '/driver/next-of-kin',
    icon: UsersIcon,
    roles: ['driver'],
  },
  {
    name: 'Escalation Policy',
    to: '/driver/escalation',
    icon: PhoneIcon,
    roles: ['driver'],
  },
  {
    name: 'Notifications',
    to: '/driver/notification-settings',
    icon: DocumentChartBarIcon,
    roles: ['driver'],
  },
  {
    name: 'Delivery Receipts',
    to: '/driver/delivery-receipts',
    icon: TruckIcon,
    roles: ['driver'],
  },
  {
    name: 'Profile',
    to: '/driver/profile',
    icon: Cog6ToothIcon,
    roles: ['driver'],
  },
];
const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-white shadow-lg min-h-screen">
      <nav className="mt-5 px-2">
        {filteredItems.map((item) => (
  <NavLink
    key={item.to}
    to={item.to}
    end={item.to === '/admin' || item.to === '/hospital' || item.to === '/driver'}
    className={({ isActive }) =>
      `group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1 ${
        isActive
          ? 'bg-red-100 text-red-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`
    }
  >
  <item.icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
  {item.name}
</NavLink>
))}
      </nav>
    </aside>
  );
};

export default Sidebar;