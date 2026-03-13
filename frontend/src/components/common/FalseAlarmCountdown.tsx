import React, { useEffect, useState, useCallback } from 'react';
import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface FalseAlarmCountdownProps {
  onConfirm: () => void;   // called when countdown reaches 0 — alert goes out
  onCancel: () => void;    // called when driver taps cancel
  seconds?: number;        // default 10
}

const FalseAlarmCountdown: React.FC<FalseAlarmCountdownProps> = ({
  onConfirm,
  onCancel,
  seconds = 10,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled) return;

    if (remaining <= 0) {
      onConfirm();
      return;
    }

    const tick = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(tick);
  }, [remaining, cancelled, onConfirm]);

  const handleCancel = useCallback(() => {
    setCancelled(true);
    onCancel();
  }, [onCancel]);

  const progress = ((seconds - remaining) / seconds) * 100;

  // Colour shifts red as time runs out
  const urgencyColor =
    remaining <= 3 ? 'text-red-600' :
    remaining <= 6 ? 'text-orange-500' :
                     'text-yellow-500';

  const ringColor =
    remaining <= 3 ? '#dc2626' :
    remaining <= 6 ? '#f97316' :
                     '#eab308';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Top urgency bar — fills as countdown progresses */}
        <div className="h-2 bg-gray-100">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%`, background: ringColor }}
          />
        </div>

        <div className="p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24">
              {/* SVG ring countdown */}
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle
                  cx="48" cy="48" r="40"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (remaining / seconds)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                />
              </svg>
              {/* Number in centre */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-black tabular-nums ${urgencyColor}`}>
                  {remaining}
                </span>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Crash Detected</h2>
          </div>

          <p className="text-gray-500 text-sm mb-1">
            Emergency alert will be sent in{' '}
            <span className={`font-bold ${urgencyColor}`}>{remaining}s</span>
          </p>
          <p className="text-gray-400 text-xs mb-8">
            If this was a false alarm, tap the button below to cancel.
          </p>

          {/* Cancel button */}
          <button
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 active:scale-95 text-white font-bold py-4 rounded-xl transition-all duration-150 text-lg"
          >
            <XCircleIcon className="h-6 w-6" />
            False Alarm — Cancel
          </button>

          <p className="text-xs text-gray-400 mt-4">
            No action needed if you are in an accident.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FalseAlarmCountdown;
