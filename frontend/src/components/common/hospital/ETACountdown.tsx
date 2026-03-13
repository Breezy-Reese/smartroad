import React, { useEffect, useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface ETACountdownProps {
  etaMinutes: number;       // ETA in minutes from dispatch time
  dispatchedAt: Date | string; // when the ambulance was dispatched
  incidentId: string;
  responderName?: string;
}

const ETACountdown: React.FC<ETACountdownProps> = ({
  etaMinutes,
  dispatchedAt,
  incidentId,
  responderName,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [arrived, setArrived]         = useState(false);
  const [overdue, setOverdue]         = useState(false);

  useEffect(() => {
    const arrivalTime = new Date(dispatchedAt).getTime() + etaMinutes * 60 * 1000;

    const tick = () => {
      const diff = Math.round((arrivalTime - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        if (diff < -30) setOverdue(true);
        else setArrived(true);
      } else {
        setSecondsLeft(diff);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [etaMinutes, dispatchedAt]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const totalSeconds = etaMinutes * 60;
  const progress = totalSeconds > 0
    ? Math.max(0, Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100))
    : 100;

  const urgencyColor =
    overdue  ? '#ef4444' :
    arrived  ? '#22c55e' :
    mins <= 2 ? '#f97316' :
    mins <= 5 ? '#eab308' :
               '#3b82f6';

  const statusLabel =
    overdue ? 'Overdue' :
    arrived ? 'Arrived' :
              `${mins}m ${secs.toString().padStart(2, '0')}s`;

  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
      <div className="relative w-8 h-8 flex-shrink-0">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="12"
            fill="none"
            stroke={urgencyColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 12}`}
            strokeDashoffset={`${2 * Math.PI * 12 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
          />
        </svg>
        <ClockIcon
          className="absolute inset-0 m-auto h-3.5 w-3.5"
          style={{ color: urgencyColor }}
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: urgencyColor }}
          >
            {statusLabel}
          </span>
          {(arrived || overdue) && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: overdue ? '#fef2f2' : '#f0fdf4',
                color: urgencyColor,
              }}
            >
              {overdue ? 'Late' : '✓ On site'}
            </span>
          )}
        </div>
        {responderName && (
          <p className="text-xs text-gray-500 truncate">{responderName}</p>
        )}
      </div>
    </div>
  );
};

export default ETACountdown;
