import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

      {/* Card automatically shrinks to fit content */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">

        {/* Render Login / Register here */}
        <Outlet />

      </div>

    </div>
  );
};

export default AuthLayout;