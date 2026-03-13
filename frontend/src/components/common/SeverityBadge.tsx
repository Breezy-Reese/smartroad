import React from 'react';

interface SeverityBadgeProps {
  severity: string;
  status?: string;
  timestamp?: string | Date;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Calculates a 0–100 crash severity score based on:
 * - Base severity level   (50% weight)
 * - Response status       (30% weight)
 * - Time elapsed urgency  (20% weight)
 */
export const calculateSeverityScore = (
  severity: string,
  status?: string,
  timestamp?: string | Date
): number => {
  // Base score from severity level
  const severityBase: Record<string, number> = {
    low:      10,
    medium:   35,
    high:     60,
    critical: 85,
    fatal:    100,
  };

  // Status modifier — unresolved incidents score higher
  const statusModifier: Record<string, number> = {
    pending:    15,
    reported:   12,
    assigned:    8,
    responding:  4,
    resolved:   -10,
    closed:     -15,
    cancelled:  -20,
  };

  // Time urgency — incidents older than 10 min without resolution score higher
  let timeModifier = 0;
  if (timestamp) {
    const ageMinutes = (Date.now() - new Date(timestamp).getTime()) / 60000;
    if (ageMinutes > 30) timeModifier = 15;
    else if (ageMinutes > 15) timeModifier = 10;
    else if (ageMinutes > 10) timeModifier = 5;
    else if (ageMinutes > 5)  timeModifier = 2;
  }

  const base   = severityBase[severity]   ?? 20;
  const mod    = statusModifier[status ?? ''] ?? 0;
  const score  = Math.min(100, Math.max(0, base + mod + timeModifier));

  return Math.round(score);
};

const getScoreColor = (score: number) => {
  if (score >= 80) return { bar: '#ef4444', text: 'text-red-700',   bg: 'bg-red-100',    border: 'border-red-200'    };
  if (score >= 60) return { bar: '#f97316', text: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200' };
  if (score >= 35) return { bar: '#eab308', text: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' };
  if (score >= 15) return { bar: '#3b82f6', text: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-200'   };
  return             { bar: '#22c55e', text: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200'  };
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 35) return 'Moderate';
  if (score >= 15) return 'Low';
  return 'Minimal';
};

const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  status,
  timestamp,
  showScore = false,
  size = 'sm',
}) => {
  const score  = calculateSeverityScore(severity, status, timestamp);
  const colors = getScoreColor(score);
  const label  = getScoreLabel(score);

  // Simple pill — used in tables (showScore=false)
  if (!showScore) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
        <span
          className="inline-block rounded-full flex-shrink-0"
          style={{
            width: size === 'sm' ? 6 : 8,
            height: size === 'sm' ? 6 : 8,
            background: colors.bar,
          }}
        />
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  }

  // Expanded card — used in detail views (showScore=true)
  return (
    <div className={`inline-flex flex-col gap-1.5 px-3 py-2 rounded-xl border ${colors.bg} ${colors.border} min-w-[120px]`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
          {label}
        </span>
        <span className={`text-sm font-black ${colors.text}`}>
          {score}
          <span className="text-xs font-normal opacity-60">/100</span>
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full h-1.5 rounded-full bg-white/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: colors.bar }}
        />
      </div>

      <span className="text-xs opacity-70 capitalize">{severity} severity</span>
    </div>
  );
};

export default SeverityBadge;
