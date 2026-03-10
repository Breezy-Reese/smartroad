import React from 'react';
import { useAuth } from '../../../../../hooks/useAuth';

const DriverProfile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <div className="mt-4 space-y-2">
          <p><span className="font-medium">Name:</span> {user?.name}</p>
          <p><span className="font-medium">Email:</span> {user?.email}</p>
          <p><span className="font-medium">Role:</span> {user?.role}</p>
        </div>
      </div>
    </div>
  );
};

export default DriverProfile;
