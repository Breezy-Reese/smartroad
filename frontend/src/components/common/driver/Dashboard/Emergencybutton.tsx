import React, { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

type ButtonSize = 'sm' | 'md' | 'lg';

interface EmergencyButtonProps {
  onClick: () => void;
  loading?: boolean;
  size?: ButtonSize;
  disabled?: boolean;
}

const sizeMap: Record<ButtonSize, { outer: string; inner: string; icon: string; label: string }> = {
  sm: { outer: 'w-24 h-24', inner: 'w-20 h-20',  icon: 'h-8 w-8',   label: 'text-xs' },
  md: { outer: 'w-36 h-36', inner: 'w-32 h-32',  icon: 'h-10 w-10', label: 'text-sm' },
  lg: { outer: 'w-48 h-48', inner: 'w-44 h-44',  icon: 'h-14 w-14', label: 'text-base' },
};

const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  onClick,
  loading = false,
  size = 'lg',
  disabled = false,
}) => {
  const [pressed, setPressed] = useState(false);
  const { outer, inner, icon, label } = sizeMap[size];

  const handlePress = () => {
    if (disabled || loading) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onClick();
  };

  return (
    <div className="flex flex-col items-center gap-4 select-none">

      {/* Pulsing ring + button */}
      <div className={`relative flex items-center justify-center ${outer}`}>

        {/* Animated pulse rings (only when idle) */}
        {!loading && !disabled && (
          <>
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping" />
            <span className="absolute inline-flex rounded-full bg-red-300 opacity-10"
              style={{ width: '115%', height: '115%', animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite 0.5s' }}
            />
          </>
        )}

        {/* Button */}
        <button
          onClick={handlePress}
          disabled={disabled || loading}
          aria-label="Trigger emergency"
          className={`
            ${inner} rounded-full z-10
            flex flex-col items-center justify-center gap-1
            font-bold tracking-wide uppercase text-white
            transition-all duration-150 ease-in-out
            shadow-[0_8px_32px_rgba(220,38,38,0.5)]
            focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400
            ${disabled
              ? 'bg-gray-300 shadow-none cursor-not-allowed'
              : loading
                ? 'bg-red-400 cursor-wait'
                : pressed
                  ? 'bg-red-800 scale-95 shadow-[0_4px_12px_rgba(220,38,38,0.4)]'
                  : 'bg-red-600 hover:bg-red-700 active:scale-95'
            }
          `}
        >
          {loading ? (
            <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
            </svg>
          ) : (
            <>
              <ExclamationTriangleIcon className={`${icon} text-white`} />
              <span className={`${label} font-black tracking-widest`}>SOS</span>
            </>
          )}
        </button>
      </div>

      <p className="text-sm text-gray-500 text-center max-w-xs">
        {loading
          ? 'Sending alert…'
          : disabled
            ? 'Emergency button disabled'
            : 'Press and hold in an emergency'}
      </p>
    </div>
  );
};

export default EmergencyButton;
