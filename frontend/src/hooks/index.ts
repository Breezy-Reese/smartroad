// src/api/hooks/index.ts
// Ready-to-use React hooks wrapping all services

import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../api/services/auth.service';
import { incidentService, type IncidentFilters } from '../api/services/incident.service';
import { tokenStorage } from '../api/client';
import type {
  IUser,
  IIncident,
  LoginPayload,
  RegisterPayload,
  CreateIncidentPayload,
  ICoordinates,
  ResponderStatusType,
} from '../api/types/index';

// ─── Generic Async Hook ───────────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (promise: Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await promise;
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'An unexpected error occurred';
      setState({ data: null, loading: false, error: message });
      throw err;
    }
  }, []);

  return { ...state, execute };
}

// ─── useAuth ──────────────────────────────────────────────────────────────────

export function useAuth() {
  const [user, setUser] = useState<IUser | null>(tokenStorage.getUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.login(payload);
      setUser(res.data!.user);
      return res;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.register(payload);
      setUser(res.data!.user);
      return res;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authService.getMe();
      setUser(freshUser);
      return freshUser;
    } catch {
      setUser(null);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };
}

// ─── useIncidents ─────────────────────────────────────────────────────────────

export function useIncidents(filters: IncidentFilters = {}) {
  const [incidents, setIncidents] = useState<IIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetch = useCallback(async (overrideFilters?: IncidentFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await incidentService.getAll(overrideFilters ?? filtersRef.current);
      setIncidents(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { incidents, loading, error, pagination, refetch: fetch };
}

// ─── useMyIncidents ───────────────────────────────────────────────────────────

export function useMyIncidents(filters: IncidentFilters = {}) {
  const [incidents, setIncidents] = useState<IIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await incidentService.getMyIncidents(filters);
      setIncidents(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetch(); }, [fetch]);

  return { incidents, loading, error, refetch: fetch };
}

// ─── useIncident ──────────────────────────────────────────────────────────────

export function useIncident(id: string | null) {
  const [incident, setIncident] = useState<IIncident | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    incidentService
      .getById(id)
      .then(setIncident)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  return { incident, loading, error };
}

// ─── useReportAccident ────────────────────────────────────────────────────────

export function useReportAccident() {
  const { data, loading, error, execute } = useAsync<IIncident>();

  const report = useCallback(
    (payload: CreateIncidentPayload) => execute(incidentService.create(payload)),
    [execute]
  );

  return { incident: data, loading, error, report };
}

// ─── useActiveIncidents ───────────────────────────────────────────────────────

export function useActiveIncidents(pollIntervalMs = 15000) {
  const [incidents, setIncidents] = useState<IIncident[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await incidentService.getActive();
      setIncidents(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    if (!pollIntervalMs) return;
    const id = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetch, pollIntervalMs]);

  return { incidents, loading, refetch: fetch };
}

// ─── useResponderLocation ─────────────────────────────────────────────────────
// Watches GPS and pushes updates to the backend

export function useResponderLocation(
  incidentId: string | null,
  responderId: string | null,
  enabled = false
) {
  const watchIdRef = useRef<number | null>(null);
  const [location, setLocation] = useState<ICoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !incidentId || !responderId) return;
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: ICoordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocation(coords);
        incidentService
          .updateResponderLocation(incidentId, responderId, coords)
          .catch(console.error);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, incidentId, responderId]);

  return { location, error };
}

// ─── useResponderStatus (for responder's own status) ─────────────────────────

export function useResponderStatus() {
  const [status, setStatus] = useState<ResponderStatusType>('available');
  const [loading, setLoading] = useState(false);

  // Dynamically import to avoid circular deps
  const update = useCallback(async (newStatus: ResponderStatusType) => {
    setLoading(true);
    try {
      const { responderService } = await import('../services/index');
      await responderService.updateStatus(newStatus);
      setStatus(newStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, updateStatus: update };
}
