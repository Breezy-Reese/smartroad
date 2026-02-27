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
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    to: '/dashboard',
    icon: HomeIcon,
    roles: ['driver', 'hospital', 'admin'],
  },
  {
    name: 'Live Tracking',
    to: '/tracking',
    icon: MapIcon,
    roles: ['hospital', 'admin'],
  },
  {
    name: 'Incidents',
    to: '/incidents',
    icon: TruckIcon,
    roles: ['hospital', 'admin'],
  },
  {
    name: 'Responders',
    to: '/responders',
    icon: UserGroupIcon,
    roles: ['hospital', 'admin'],
  },
  {
    name: 'Analytics',
    to: '/analytics',
    icon: ChartBarIcon,
    roles: ['hospital', 'admin'],
  },
  {
    name: 'My Trips',
    to: '/trips',
    icon: ClockIcon,
    roles: ['driver'],
  },
  {
    name: 'Emergency Contacts',
    to: '/contacts',
    icon: PhoneIcon,
    roles: ['driver'],
  },
  {
    name: 'Settings',
    to: '/settings',
    icon: Cog6ToothIcon,
    roles: ['driver', 'hospital', 'admin'],
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
            className={({ isActive }) =>
              `group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1 ${
                isActive
                  ? 'bg-emergency-100 text-emergency-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-emergency-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;