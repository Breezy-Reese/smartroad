import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12">

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-10">

        {/* Routes Render Here */}
        <Outlet />

      </div>

    </div>
  );
};

export default AuthLayout;