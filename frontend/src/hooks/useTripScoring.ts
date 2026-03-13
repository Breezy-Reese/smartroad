import { useState, useCallback, useRef } from 'react';

export interface TripEvent {
  type: 'harsh_brake' | 'harsh_accel' | 'speeding' | 'sharp_turn' | 'phone_use';
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  penalty: number;
}

export interface TripScore {
  tripId: string;
  score: number;          // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  events: TripEvent[];
  distance: number;       // km
  duration: number;       // seconds
  startTime: number;
  endTime?: number;
}

const GRADE_MAP = (s: number): TripScore['grade'] => {
  if (s >= 90) return 'A';
  if (s >= 75) return 'B';
  if (s >= 60) return 'C';
  if (s >= 45) return 'D';
  return 'F';
};

const PENALTY: Record<TripEvent['type'], Record<TripEvent['severity'], number>> = {
  harsh_brake:  { low: 2,  medium: 5,  high: 10 },
  harsh_accel:  { low: 2,  medium: 4,  high: 8  },
  speeding:     { low: 3,  medium: 6,  high: 12 },
  sharp_turn:   { low: 1,  medium: 3,  high: 6  },
  phone_use:    { low: 5,  medium: 10, high: 15 },
};

export const useTripScoring = () => {
  const [activeTrip, setActiveTrip] = useState<TripScore | null>(null);
  const [history, setHistory] = useState<TripScore[]>([]);
  const tripIdRef = useRef(0);

  const startTrip = useCallback(() => {
    const id = `trip_${Date.now()}_${++tripIdRef.current}`;
    setActiveTrip({
      tripId: id,
      score: 100,
      grade: 'A',
      events: [],
      distance: 0,
      duration: 0,
      startTime: Date.now(),
    });
  }, []);

  const recordEvent = useCallback((
    type: TripEvent['type'],
    severity: TripEvent['severity'] = 'medium',
  ) => {
    setActiveTrip((prev) => {
      if (!prev) return prev;
      const penalty = PENALTY[type][severity];
      const newScore = Math.max(0, prev.score - penalty);
      const event: TripEvent = { type, severity, timestamp: Date.now(), penalty };
      return {
        ...prev,
        score: newScore,
        grade: GRADE_MAP(newScore),
        events: [...prev.events, event],
      };
    });
  }, []);

  const updateDistance = useCallback((km: number) => {
    setActiveTrip((prev) => prev ? { ...prev, distance: prev.distance + km } : prev);
  }, []);

  const endTrip = useCallback(() => {
    setActiveTrip((prev) => {
      if (!prev) return null;
      const finished: TripScore = {
        ...prev,
        endTime: Date.now(),
        duration: Math.floor((Date.now() - prev.startTime) / 1000),
      };
      setHistory((h) => [finished, ...h].slice(0, 50));
      return null;
    });
  }, []);

  const averageScore = history.length
    ? Math.round(history.reduce((sum, t) => sum + t.score, 0) / history.length)
    : null;

  return { activeTrip, history, averageScore, startTrip, recordEvent, updateDistance, endTrip };
};
