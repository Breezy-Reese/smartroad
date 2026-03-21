import { useState, useEffect } from "react";
import { axiosInstance } from "../config/axios.config";
import { FleetIncident } from "../types/admin.types";

export interface AdminStats {
  totalUsers: number;
  totalDrivers: number;
  activeDrivers: number;
  totalHospitals: number;
  totalResponders: number;
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  incidentsWeek: number;
  // Fleet screen extras — derived or defaulted if not in API
  totalTrips: number;
  completedTrips: number;
  pendingTrips: number;
  cancelledTrips: number;
  totalExports: number;
  lastExportDate: string | null;
  notificationsSentToday: number;
  deliveryRate: number;
  avgTripScore: number;
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
  totalDrivers: 0,
  activeDrivers: 0,
  totalHospitals: 0,
  totalResponders: 0,
  totalIncidents: 0,
  openIncidents: 0,
  resolvedIncidents: 0,
  incidentsWeek: 0,
  totalTrips: 0,
  completedTrips: 0,
  pendingTrips: 0,
  cancelledTrips: 0,
  totalExports: 0,
  lastExportDate: null,
  notificationsSentToday: 0,
  deliveryRate: 0,
  avgTripScore: 0,
};

export const useAdminStats = (): UseAdminStatsReturn => {
  const [stats, setStats]       = useState<AdminStats>(DEFAULT_STATS);
  const [incidents, setIncidents] = useState<FleetIncident[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tick, setTick]         = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const [dashboardRes, incidentsRes, exportsRes] = await Promise.all([
          axiosInstance.get("/admin/dashboard"),
          axiosInstance.get("/admin/incidents"),
          axiosInstance.get("/admin/exports").catch(() => ({ data: { data: [] } })), // non-fatal
        ]);

        // Backend shape: { success, data: { stats: {...}, recentIncidents, recentUsers } }
        const payload  = dashboardRes.data?.data ?? dashboardRes.data;
        const s        = payload?.stats ?? payload ?? {};

        const incidentList: FleetIncident[] =
          Array.isArray(incidentsRes.data)
            ? incidentsRes.data
            : incidentsRes.data?.data ?? [];

        const exportList = Array.isArray(exportsRes.data?.data)
          ? exportsRes.data.data
          : [];

        if (!cancelled) {
          setStats({
            // ── Fields returned by getDashboardStats ──────────────────────
            totalUsers:       s.totalUsers       ?? 0,
            totalDrivers:     s.totalDrivers     ?? 0,
            totalHospitals:   s.totalHospitals   ?? 0,
            totalResponders:  s.totalResponders  ?? 0,
            totalIncidents:   s.totalIncidents   ?? 0,
            resolvedIncidents: s.resolvedIncidents ?? 0,

            // activeIncidents from backend = openIncidents for the fleet screen
            openIncidents:    s.activeIncidents  ?? s.openIncidents ?? 0,

            // activeDrivers isn't returned by backend — derive from totalDrivers
            // Replace with real field if you add it to the backend later
            activeDrivers:    s.activeDrivers    ?? s.totalDrivers ?? 0,

            // ── Fields not yet in backend — default to 0 ─────────────────
            incidentsWeek:    s.incidentsWeek    ?? incidentList.filter(i => {
              const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
              return (i.timestamp ?? 0) >= weekAgo;
            }).length,

            totalTrips:           s.totalTrips           ?? 0,
            completedTrips:       s.completedTrips        ?? 0,
            pendingTrips:         s.pendingTrips          ?? 0,
            cancelledTrips:       s.cancelledTrips        ?? 0,
            totalExports:         exportList.length,
            lastExportDate:       exportList[0]?.createdAt ?? null,
            notificationsSentToday: s.notificationsSentToday ?? 0,
            deliveryRate:         s.deliveryRate          ?? 0,
            avgTripScore:         s.avgTripScore          ?? 0,
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
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);
  return { stats, incidents, loading, error, refresh, refetch: refresh };
};