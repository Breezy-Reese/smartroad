import React, { useEffect } from 'react';
import { ActiveAlert } from '../../hooks/useEmergencyAlerts';

interface AlertBannerProps {
  alerts: ActiveAlert[];
  onAcknowledge: (id: string) => void;
  onAcknowledgeAll: () => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-600 border-red-800 text-white',
  high:     'bg-orange-500 border-orange-700 text-white',
  medium:   'bg-yellow-400 border-yellow-600 text-gray-900',
  low:      'bg-blue-500 border-blue-700 text-white',
  info:     'bg-blue-500 border-blue-700 text-white',
  success:  'bg-green-500 border-green-700 text-white',
};

const SEVERITY_ICON: Record<string, string> = {
  critical: '🚨',
  high:     '⚠️',
  medium:   '⚡',
  low:      'ℹ️',
  panic:    '🆘',
};

/**
 * AlertBanner
 *
 * Drop this at the top of your dashboard layouts (Admin, Hospital).
 * It renders a stacked list of unacknowledged emergency alerts.
 *
 * Usage:
 *   const { activeAlerts, acknowledgeAlert, acknowledgeAll } = useEmergencyAlerts();
 *   <AlertBanner
 *     alerts={activeAlerts}
 *     onAcknowledge={acknowledgeAlert}
 *     onAcknowledgeAll={acknowledgeAll}
 *   />
 */
const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onAcknowledge,
  onAcknowledgeAll,
}) => {
  // Play a sound on critical/panic alerts
  useEffect(() => {
    const hasCritical = alerts.some(
      (a) => a.severity === 'critical' || a.type === 'panic'
    );
    if (hasCritical) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch {
        // AudioContext not available (e.g. SSR) — silently ignore
      }
    }
  }, [alerts.length]); // Only re-run when a new alert arrives

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-1 p-2 pointer-events-none">
      {/* Acknowledge all button — only show when there are multiple alerts */}
      {alerts.length > 1 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={onAcknowledgeAll}
            className="text-xs bg-gray-800 text-white px-3 py-1 rounded shadow hover:bg-gray-700 transition"
          >
            Dismiss all ({alerts.length})
          </button>
        </div>
      )}

      {alerts.map((alert) => {
        const styleKey = alert.severity ?? (alert.type === 'system' ? 'info' : 'high');
        const style    = SEVERITY_STYLES[styleKey] ?? SEVERITY_STYLES.high;
        const icon     = SEVERITY_ICON[alert.type === 'panic' ? 'panic' : (alert.severity ?? 'high')];

        return (
          <div
            key={alert.id}
            className={`
              flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg
              pointer-events-auto animate-slide-down
              ${style}
            `}
            role="alert"
            aria-live="assertive"
          >
            {/* Icon */}
            <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">{alert.title}</p>
              <p className="text-sm opacity-90 mt-0.5 leading-snug">{alert.message}</p>
              <p className="text-xs opacity-70 mt-1">
                {alert.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="flex-shrink-0 opacity-80 hover:opacity-100 transition text-lg leading-none"
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AlertBanner;
