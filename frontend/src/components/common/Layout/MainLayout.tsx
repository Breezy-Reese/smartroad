import React, { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import { useAuth } from '../../../hooks/useAuth';

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex">
        {/* Sidebar — sticks to the left as you scroll */}
        {user && (
          <aside className="sticky top-0 h-screen flex-shrink-0 overflow-y-auto">
            <Sidebar />
          </aside>
        )}

        {/* Main content — scrolls normally with the page */}
        <main className="flex-1 p-6">
          {children ? children : <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
