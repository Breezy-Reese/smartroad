import { useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../config/axios.config";
import { AuditEntry, AdminRole } from "../types/admin.types";

interface FetchEntriesParams {
  actorRole?: AdminRole;
  action?: string;
  page?: number;
  limit?: number;
}

interface UseAuditLogReturn {
  entries: AuditEntry[];
  loading: boolean;
  error: string | null;
  fetchEntries: (params?: FetchEntriesParams) => Promise<AuditEntry[]>;
  refetch: () => void;
}

export const useAuditLog = (): UseAuditLogReturn => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // ── Initial load — fetch all audit entries (most recent first)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get("/admin/audit-log");
        const data: AuditEntry[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];
        if (!cancelled) setEntries(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load audit log");
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  // ── Filtered fetch — sends query params to the server so filtering
  //    happens on the backend (scales to large logs without loading everything).
  const fetchEntries = useCallback(
    async (params?: FetchEntriesParams): Promise<AuditEntry[]> => {
      try {
        const res = await axiosInstance.get("/admin/audit-log", {
          params: {
            ...(params?.actorRole && { actorRole: params.actorRole }),
            ...(params?.action    && { action:    params.action    }),
            ...(params?.page      && { page:      params.page      }),
            ...(params?.limit     && { limit:     params.limit     }),
          },
        });
        const data: AuditEntry[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];
        return data;
      } catch (err: unknown) {
        throw new Error(
          err instanceof Error ? err.message : "Failed to fetch audit entries"
        );
      }
    },
    []
  );

  const refetch = () => setTick((t) => t + 1);

  return { entries, loading, error, fetchEntries, refetch };
};
