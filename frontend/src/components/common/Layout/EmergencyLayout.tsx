import React from 'react';
import { Outlet } from 'react-router-dom';

const EmergencyLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 animate-pulse-slow">
      <Outlet />
    </div>
  );
};

export default EmergencyLayout;