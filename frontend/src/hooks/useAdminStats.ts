import { useState, useEffect, useCallback } from 'react';
import { AdminStats, FleetIncident, IncidentSeverity } from '../types/admin.types';

/* ── Seed realistic mock data ── */
const DRIVER_NAMES = [
  'James Mwangi', 'Aisha Kamau', 'Peter Odhiambo', 'Grace Wanjiku',
  'Samuel Otieno', 'Faith Njeri', 'David Kimani', 'Mary Achieng',
];

const INCIDENT_TYPES = [
  'Harsh braking', 'Speeding', 'Sharp turn', 'Emergency SOS',
  'Geofence breach', 'Phone use', 'Fatigue alert',
];

const SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/* Nairobi-area bounding box */
const randomLat = () => -1.28 + (Math.random() - 0.5) * 0.18;
const randomLng = () => 36.82 + (Math.random() - 0.5) * 0.22;

export const generateMockIncidents = (count = 60): FleetIncident[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `inc_${i + 1}`,
    driverId: `drv_${(i % DRIVER_NAMES.length) + 1}`,
    driverName: DRIVER_NAMES[i % DRIVER_NAMES.length],
    type: INCIDENT_TYPES[i % INCIDENT_TYPES.length],
    severity: SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
    lat: randomLat(),
    lng: randomLng(),
    timestamp: Date.now() - randomBetween(0, 7 * 24 * 60 * 60 * 1000),
    resolved: Math.random() > 0.3,
    resolvedAt: Math.random() > 0.3 ? Date.now() - randomBetween(0, 3600 * 1000) : undefined,
    notificationsSent: randomBetween(1, 6),
    escalationLevel: [1, 2, 3][Math.floor(Math.random() * 3)] as 1 | 2 | 3,
    tripScore: randomBetween(42, 100),
  }));

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [incidents, setIncidents] = useState<FleetIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: GET /admin/stats
      await new Promise((r) => setTimeout(r, 600));
      const mock = generateMockIncidents(60);
      const now = Date.now();
      const dayAgo = now - 86400000;
      const weekAgo = now - 7 * 86400000;

      setIncidents(mock);
      setStats({
        totalDrivers: DRIVER_NAMES.length,
        activeDrivers: randomBetween(3, DRIVER_NAMES.length),
        incidentsToday: mock.filter((i) => i.timestamp > dayAgo).length,
        incidentsWeek: mock.filter((i) => i.timestamp > weekAgo).length,
        avgTripScore: Math.round(mock.reduce((s, i) => s + (i.tripScore ?? 0), 0) / mock.length),
        openIncidents: mock.filter((i) => !i.resolved).length,
        notificationsSentToday: mock
          .filter((i) => i.timestamp > dayAgo)
          .reduce((s, i) => s + i.notificationsSent, 0),
        deliveryRate: 0.91,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, incidents, loading, refresh: fetchStats };
};
