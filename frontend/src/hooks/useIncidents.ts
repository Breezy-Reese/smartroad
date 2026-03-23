import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '../config/axios.config';
import { useSocketEvents } from './useSocketEvents';
import { useAuth } from './useAuth';
import { Incident } from '../types/emergency.types';

interface UseIncidentsReturn {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useIncidents
 *
 * - Loads incidents from REST on mount using the correct endpoint per role.
 * - Keeps the list live via socket:
 *     new-incident       → prepend
 *     incident-update    → replace in place
 *     incident-resolved  → mark resolved in place
 *     incident-cancelled → remove from list
 */
export const useIncidents = (): UseIncidentsReturn => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tick, setTick]           = useState(0);

  // ── Pick the right endpoint based on role ─────────────────────
  const getEndpoint = useCallback(() => {
    switch (user?.role) {
      case 'admin':      return '/admin/incidents';
      case 'hospital':   return '/hospitals/incidents';
      case 'responder':  return '/responders/incidents';
      default:           return '/hospitals/incidents';
    }
  }, [user?.role]);

  // ── Initial REST fetch ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get(getEndpoint());
        const raw = res.data?.data ?? res.data;
        // Hospital endpoint wraps in { incidents: [...] }
        const data: Incident[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.incidents)
          ? raw.incidents
          : [];
        if (!cancelled) setIncidents(data);
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load incidents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [tick, getEndpoint, user]);

  // ── Socket live updates ────────────────────────────────────────
  useSocketEvents({
    onNewIncident: useCallback((incident: Incident) => {
      setIncidents((prev) => {
        if (prev.some((i) => i._id === incident._id)) return prev;
        return [incident, ...prev];
      });
    }, []),
    onIncidentUpdated: useCallback((updated: Incident) => {
      setIncidents((prev) =>
        prev.map((i) => (i._id === updated._id ? updated : i))
      );
    }, []),
    onIncidentResolved: useCallback((incidentId: string) => {
      setIncidents((prev) =>
        prev.map((i) =>
          i._id === incidentId ? { ...i, status: 'resolved' as const } : i
        )
      );
    }, []),
    onIncidentCancelled: useCallback((incidentId: string) => {
      setIncidents((prev) => prev.filter((i) => i._id !== incidentId));
    }, []),
  });

  const refetch = () => setTick((t) => t + 1);
  return { incidents, loading, error, refetch };
};