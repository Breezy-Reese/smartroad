import { useState, useEffect } from "react";
import { AuditEntry, AdminRole } from "../types/admin.types";

interface FetchEntriesParams {
  actorRole?: AdminRole;
  action?: string;
}

interface UseAuditLogReturn {
  entries: AuditEntry[];
  loading: boolean;
  error: string | null;
  fetchEntries: (params?: FetchEntriesParams) => Promise<AuditEntry[]>;
  refetch: () => void;
}

const now = Date.now();
const min = 60000;

const PLACEHOLDER_ENTRIES: AuditEntry[] = [
  {
    id: "aud-001",
    timestamp: now - min * 5,
    actorId: "usr-001",
    actorName: "Admin User",
    actorRole: "super_admin",
    action: "POLICY_UPDATED",
    target: "Escalation Policy #3",
    ipAddress: "192.168.1.10",
  },
  {
    id: "aud-002",
    timestamp: now - min * 20,
    actorId: "usr-002",
    actorName: "Fleet Manager",
    actorRole: "fleet_manager",
    action: "DRIVER_ASSIGNED",
    target: "James Mwangi",
    ipAddress: "10.0.0.5",
  },
  {
    id: "aud-003",
    timestamp: now - min * 45,
    actorId: "usr-001",
    actorName: "Admin User",
    actorRole: "super_admin",
    action: "EXPORT_TRIGGERED",
    target: "Trips CSV - March 2025",
    ipAddress: "192.168.1.10",
  },
  {
    id: "aud-004",
    timestamp: now - min * 90,
    actorId: "usr-003",
    actorName: "Dispatcher",
    actorRole: "dispatcher",
    action: "TRIP_CANCELLED",
    target: "Trip #512",
    ipAddress: "10.0.0.8",
  },
  {
    id: "aud-005",
    timestamp: now - min * 200,
    actorId: "usr-002",
    actorName: "Fleet Manager",
    actorRole: "fleet_manager",
    action: "EMERGENCY_TRIGGERED",
    target: "Driver: Aisha Odhiambo",
    ipAddress: "10.0.0.5",
  },
  {
    id: "aud-006",
    timestamp: now - min * 400,
    actorId: "usr-004",
    actorName: "Viewer",
    actorRole: "viewer",
    action: "REPORT_VIEWED",
    target: "Q1 2025 Summary",
    ipAddress: "10.0.0.12",
  },
  {
    id: "aud-007",
    timestamp: now - min * 600,
    actorId: "usr-001",
    actorName: "Admin User",
    actorRole: "super_admin",
    action: "USER_CREATED",
    target: "driver128@smartroad.com",
    ipAddress: "192.168.1.10",
  },
  {
    id: "aud-008",
    timestamp: now - min * 800,
    actorId: "usr-003",
    actorName: "Dispatcher",
    actorRole: "dispatcher",
    action: "TRIP_UPDATED",
    target: "Trip #498",
    ipAddress: "10.0.0.8",
  },
];

export const useAuditLog = (): UseAuditLogReturn => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: replace with your real API endpoint
        // const res = await fetch("/api/admin/audit-log");
        // if (!res.ok) throw new Error("Failed to fetch audit log");
        // const data: AuditEntry[] = await res.json();
        if (!cancelled) setEntries(PLACEHOLDER_ENTRIES);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tick]);

  // Filters entries locally and returns results.
  // When ready, replace the body with a real API call using params.
  const fetchEntries = async (params?: FetchEntriesParams): Promise<AuditEntry[]> => {
    let result = [...PLACEHOLDER_ENTRIES];
    if (params?.actorRole) {
      result = result.filter((e) => e.actorRole === params.actorRole);
    }
    if (params?.action) {
      const q = params.action.toLowerCase();
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.actorName.toLowerCase().includes(q) ||
          (e.target ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  };

  const refetch = () => setTick((t) => t + 1);

  return { entries, loading, error, fetchEntries, refetch };
};
