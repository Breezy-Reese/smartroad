import { useState, useEffect } from "react";
import { axiosInstance } from "../config/axios.config";
import { FleetIncident } from "../types/admin.types";

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
        const [dashboardRes, incidentsRes] = await Promise.all([
          axiosInstance.get("/admin/dashboard"),
          axiosInstance.get("/admin/incidents"),
        ]);

        // Backend wraps responses in { data: ... } — unwrap safely
        const dashboard = dashboardRes.data?.data ?? dashboardRes.data;
        const incidentList: FleetIncident[] =
          Array.isArray(incidentsRes.data)
            ? incidentsRes.data
            : incidentsRes.data?.data ?? [];

        if (!cancelled) {
          setStats({
            totalUsers:      dashboard.totalUsers      ?? 0,
            activeDrivers:   dashboard.activeDrivers   ?? 0,
            totalTrips:      dashboard.totalTrips      ?? 0,
            completedTrips:  dashboard.completedTrips  ?? 0,
            pendingTrips:    dashboard.pendingTrips    ?? 0,
            cancelledTrips:  dashboard.cancelledTrips  ?? 0,
            totalExports:    dashboard.totalExports    ?? 0,
            lastExportDate:  dashboard.lastExportDate  ?? null,
            openIncidents:   dashboard.openIncidents   ?? 0,
            incidentsWeek:   dashboard.incidentsWeek   ?? 0,
          });
          setIncidents(incidentList);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load admin stats");
          setStats(DEFAULT_STATS);
          setIncidents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  return { stats, incidents, loading, error, refresh, refetch: refresh };
};
