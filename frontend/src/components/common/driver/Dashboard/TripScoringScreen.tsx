import React from 'react';
import { useTripScoring, TripScore } from '../../../hooks/useTripScoring';
import {
  TruckIcon,
  ExclamationCircleIcon,
  CheckBadgeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

/* ── Score ring ── */
const ScoreRing: React.FC<{ score: number; grade: TripScore['grade'] }> = ({ score, grade }) => {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  const gradeColor: Record<TripScore['grade'], string> = {
    A: '#16a34a', B: '#65a30d', C: '#ca8a04', D: '#ea580c', F: '#dc2626',
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r}
          fill="none"
          stroke={gradeColor[grade]}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: '28px' }}>
        <span className="text-3xl font-bold text-gray-900" style={{ color: gradeColor[grade] }}>{score}</span>
        <span className="text-sm font-semibold text-gray-500">Grade {grade}</span>
      </div>
    </div>
  );
};

/* ── Event label ── */
const EVENT_LABELS: Record<string, string> = {
  harsh_brake: 'Harsh braking',
  harsh_accel: 'Harsh acceleration',
  speeding: 'Speeding',
  sharp_turn: 'Sharp turn',
  phone_use: 'Phone use',
};

const SEVERITY_COLOR: Record<string, string> = {
  low: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
};

/* ── Trip history card ── */
const TripCard: React.FC<{ trip: TripScore }> = ({ trip }) => {
  const duration = `${Math.floor(trip.duration / 60)}m ${trip.duration % 60}s`;
  const gradeColor: Record<TripScore['grade'], string> = {
    A: 'text-green-600', B: 'text-lime-600', C: 'text-yellow-600', D: 'text-orange-600', F: 'text-red-600',
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
      <div className="text-center min-w-[48px]">
        <p className={`text-2xl font-bold ${gradeColor[trip.grade]}`}>{trip.grade}</p>
        <p className="text-xs text-gray-400">{trip.score}/100</p>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{trip.distance.toFixed(1)} km</p>
        <p className="text-xs text-gray-500">{duration} · {trip.events.length} event(s)</p>
      </div>
      <p className="text-xs text-gray-400">{new Date(trip.startTime).toLocaleDateString()}</p>
    </div>
  );
};

/* ── Main screen ── */
const TripScoringScreen: React.FC = () => {
  const { activeTrip, history, averageScore, startTrip, recordEvent, updateDistance, endTrip } = useTripScoring();

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trip scoring</h1>
        <p className="text-sm text-gray-500 mt-1">Safety score is calculated in real-time during each trip.</p>
      </div>

      {/* Average score banner */}
      {averageScore !== null && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <CheckBadgeIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Average score: {averageScore}/100</p>
            <p className="text-xs text-blue-600">{history.length} trip(s) recorded</p>
          </div>
        </div>
      )}

      {/* Active trip */}
      {activeTrip ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-base font-semibold text-gray-900">Trip in progress</h2>
          </div>

          <div className="relative flex justify-center mb-6">
            <ScoreRing score={activeTrip.score} grade={activeTrip.grade} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Distance</p>
              <p className="font-semibold">{activeTrip.distance.toFixed(1)} km</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Events</p>
              <p className="font-semibold">{activeTrip.events.length}</p>
            </div>
          </div>

          {/* Recent events */}
          {activeTrip.events.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Recent events</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...activeTrip.events].reverse().map((ev, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <ExclamationCircleIcon className="h-4 w-4 text-gray-400" />
                      <span>{EVENT_LABELS[ev.type] ?? ev.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLOR[ev.severity]}`}>
                        {ev.severity}
                      </span>
                      <span className="text-red-500 text-xs">-{ev.penalty}pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dev controls — remove in production */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-xs text-gray-400 mb-2">Simulate event (dev only)</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(EVENT_LABELS).map((type) => (
                <button
                  key={type}
                  onClick={() => recordEvent(type as any, 'medium')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg transition-colors"
                >
                  {EVENT_LABELS[type]}
                </button>
              ))}
              <button
                onClick={() => updateDistance(1)}
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg transition-colors"
              >
                +1 km
              </button>
            </div>
          </div>

          <button
            onClick={endTrip}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            End trip
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 flex flex-col items-center gap-4">
          <div className="bg-gray-50 rounded-full p-5">
            <TruckIcon className="h-10 w-10 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">No active trip</p>
            <p className="text-sm text-gray-500 mt-1">Start a trip to begin scoring your drive.</p>
          </div>
          <button
            onClick={startTrip}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Start trip
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Trip history</h2>
          </div>
          <div className="space-y-3">
            {history.map((trip) => <TripCard key={trip.tripId} trip={trip} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripScoringScreen;
