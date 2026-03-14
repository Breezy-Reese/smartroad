import { useState, useEffect } from "react";
import { FleetIncident, IncidentSeverity } from "../types/admin.types";

export interface AdminStats {
  totalUsers: number;
  activeDrivers: number;
  totalTrips: number;
  completedTrips: number;
  pendingTrips: number;
  cancelledTrips: number;
  totalExports: number;
  lastExportDate: string | null;
  openIncidents: number;
  incidentsWeek: number;
}

interface UseAdminStatsReturn {
  stats: AdminStats;
  incidents: FleetIncident[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  refetch: () => void;
}

const DEFAULT_STATS: AdminStats = {
  totalUsers: 0,
  activeDrivers: 0,
  totalTrips: 0,
  completedTrips: 0,
  pendingTrips: 0,
  cancelledTrips: 0,
  totalExports: 0,
  lastExportDate: null,
  openIncidents: 0,
  incidentsWeek: 0,
};

const now = Date.now();
const day = 86400000;

const PLACEHOLDER_INCIDENTS: FleetIncident[] = [
  {
    id: "inc-001",
    driverId: "drv-01",
    driverName: "James Mwangi",
    type: "Harsh Braking",
    severity: "medium" as IncidentSeverity,
    lat: -1.2921,
    lng: 36.8219,
    timestamp: now - day * 0.5,
    resolved: false,
    notificationsSent: 2,
    escalationLevel: 1,
  },
  {
    id: "inc-002",
    driverId: "drv-02",
    driverName: "Aisha Odhiambo",
    type: "Speeding",
    severity: "high" as IncidentSeverity,
    lat: -1.3001,
    lng: 36.8100,
    timestamp: now - day * 1,
    resolved: false,
    notificationsSent: 3,
    escalationLevel: 2,
  },
  {
    id: "inc-003",
    driverId: "drv-03",
    driverName: "Peter Kamau",
    type: "Accident",
    severity: "critical" as IncidentSeverity,
    lat: -1.2750,
    lng: 36.8350,
    timestamp: now - day * 2,
    resolved: true,
    resolvedAt: now - day * 1.5,
    notificationsSent: 5,
    escalationLevel: 3,
    tripScore: 42,
  },
  {
    id: "inc-004",
    driverId: "drv-04",
    driverName: "Grace Wanjiru",
    type: "Idling",
    severity: "low" as IncidentSeverity,
    lat: -1.2850,
    lng: 36.8200,
    timestamp: now - day * 3,
    resolved: true,
    resolvedAt: now - day * 2.8,
    notificationsSent: 1,
    escalationLevel: 1,
    tripScore: 78,
  },
  {
    id: "inc-005",
    driverId: "drv-05",
    driverName: "Brian Otieno",
    type: "Sharp Cornering",
    severity: "medium" as IncidentSeverity,
    lat: -1.2650,
    lng: 36.8400,
    timestamp: now - day * 4,
    resolved: false,
    notificationsSent: 2,
    escalationLevel: 1,
  },
  {
    id: "inc-006",
    driverId: "drv-06",
    driverName: "Mercy Njeri",
    type: "Speeding",
    severity: "high" as IncidentSeverity,
    lat: -1.3100,
    lng: 36.8050,
    timestamp: now - day * 5,
    resolved: false,
    notificationsSent: 4,
    escalationLevel: 2,
  },
];

export const useAdminStats = (): UseAdminStatsReturn => {
  const [stats, setStats] = useState<AdminStats>(DEFAULT_STATS);
  const [incidents, setIncidents] = useState<FleetIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: replace with your real API endpoints
        // const [statsRes, incidentsRes] = await Promise.all([
        //   fetch("/api/admin/stats"),
        //   fetch("/api/admin/incidents"),
        // ]);

        const openIncidents = PLACEHOLDER_INCIDENTS.filter((i) => !i.resolved).length;
        const weekAgo = now - day * 7;
        const incidentsWeek = PLACEHOLDER_INCIDENTS.filter((i) => i.timestamp >= weekAgo).length;

        const data: AdminStats = {
          totalUsers: 128,
          activeDrivers: 34,
          totalTrips: 512,
          completedTrips: 480,
          pendingTrips: 18,
          cancelledTrips: 14,
          totalExports: 27,
          lastExportDate: new Date().toISOString(),
          openIncidents,
          incidentsWeek,
        };

        if (!cancelled) {
          setStats(data);
          setIncidents(PLACEHOLDER_INCIDENTS);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setStats(DEFAULT_STATS);
          setIncidents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  return { stats, incidents, loading, error, refresh, refetch: refresh };
};
