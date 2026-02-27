import React, { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface EmergencyButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  size = 'lg',
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const sizeClasses = {
    sm: 'w-24 h-24 text-lg',
    md: 'w-32 h-32 text-xl',
    lg: 'w-48 h-48 text-2xl',
  };

  const handleClick = () => {
    if (!disabled && !loading) {
      setIsPressed(true);
      onClick();
      setTimeout(() => setIsPressed(false), 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative ${sizeClasses[size]} rounded-full 
        bg-gradient-to-br from-red-500 to-red-700
        hover:from-red-600 hover:to-red-800
        text-white font-bold shadow-lg
        transform transition-all duration-200
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        animate-pulse-slow
        focus:outline-none focus:ring-4 focus:ring-red-300
      `}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <ExclamationTriangleIcon className="h-1/3 w-1/3 mb-2" />
        <span className="text-center px-2">
          {loading ? 'SENDING...' : 'EMERGENCY'}
        </span>
      </div>
      
      {/* Ripple effect */}
      <span className="absolute inset-0 rounded-full animate-ping-slow bg-red-400 opacity-30"></span>
    </button>
  );
};

export default EmergencyButton;