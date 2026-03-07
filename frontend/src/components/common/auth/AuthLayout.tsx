import React from 'react';

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<Props> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-10 max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {title}
          </h2>

          <p className="text-sm text-gray-600 mt-2">
            {subtitle}
          </p>
        </div>

        {/* CONTENT */}
        {children}

      </div>

    </div>
  );
};

export default AuthLayout;