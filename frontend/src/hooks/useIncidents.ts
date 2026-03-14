import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '../config/axios.config';
import { useSocketEvents } from './useSocketEvents';
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
 * - Loads incidents from REST on mount.
 * - Keeps the list live via socket:
 *     new-incident      → prepend
 *     incident-update   → replace in place
 *     incident-resolved → mark resolved in place
 *     incident-cancelled→ remove from list
 */
export const useIncidents = (): UseIncidentsReturn => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tick, setTick]           = useState(0);

  // ── Initial REST fetch ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get('/admin/incidents');
        const data: Incident[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];
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
  }, [tick]);

  // ── Socket live updates ────────────────────────────────────────
  useSocketEvents({
    onNewIncident: useCallback((incident: Incident) => {
      setIncidents((prev) => {
        // Avoid duplicates if REST and socket race
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
