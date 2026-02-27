// src/components/common/LoadingSpinner.tsx
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emergency-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-emergency-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-emergency-600 font-medium">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;