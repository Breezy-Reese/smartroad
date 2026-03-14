import { useState, useEffect } from "react";
import { ExportJob } from "../types/admin.types";
import { AuditEntry } from "../types/admin.types";
import { FleetIncident } from "../types/admin.types";

interface UseExportsReturn {
  jobs: ExportJob[];
  loading: boolean;
  error: string | null;
  exportIncidentsCSV: (incidents: FleetIncident[]) => void;
  exportAuditCSV: (entries: AuditEntry[]) => void;
  triggerExport: (type: ExportJob["type"], format: ExportJob["format"]) => void;
  refetch: () => void;
}

const now = Date.now();
const day = 86400000;

const PLACEHOLDER_JOBS: ExportJob[] = [
  {
    id: "job-001",
    requestedBy: "admin@smartroad.com",
    requestedAt: now - day * 2,
    type: "incidents",
    format: "csv",
    status: "ready",
    downloadUrl: "#",
    completedAt: now - day * 2 + 5000,
    filters: { from: now - day * 30, to: now },
  },
  {
    id: "job-002",
    requestedBy: "admin@smartroad.com",
    requestedAt: now - day * 5,
    type: "audit_log",
    format: "pdf",
    status: "ready",
    downloadUrl: "#",
    completedAt: now - day * 5 + 8000,
    filters: {},
  },
  {
    id: "job-003",
    requestedBy: "fleet@smartroad.com",
    requestedAt: now - day * 7,
    type: "driver_scores",
    format: "csv",
    status: "failed",
    filters: {},
  },
  {
    id: "job-004",
    requestedBy: "admin@smartroad.com",
    requestedAt: now - day * 0.1,
    type: "notifications",
    format: "csv",
    status: "queued",
    filters: {},
  },
];

// Utility: download data as a CSV file in the browser
const downloadCSV = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const useExports = (): UseExportsReturn => {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
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
        // const res = await fetch("/api/admin/exports");
        // if (!res.ok) throw new Error("Failed to fetch export jobs");
        // const data: ExportJob[] = await res.json();
        if (!cancelled) setJobs(PLACEHOLDER_JOBS);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setJobs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tick]);

  const exportIncidentsCSV = (incidents: FleetIncident[]) => {
    // TODO: swap for API-generated export when backend is ready
    downloadCSV(
      `incidents_${Date.now()}.csv`,
      incidents.map((i) => ({
        id: i.id,
        driverName: i.driverName,
        type: i.type,
        severity: i.severity,
        timestamp: new Date(i.timestamp).toISOString(),
        resolved: i.resolved,
        lat: i.lat,
        lng: i.lng,
      }))
    );
    addJob("incidents", "csv");
  };

  const exportAuditCSV = (entries: AuditEntry[]) => {
    // TODO: swap for API-generated export when backend is ready
    downloadCSV(
      `audit_log_${Date.now()}.csv`,
      entries.map((e) => ({
        id: e.id,
        timestamp: new Date(e.timestamp).toISOString(),
        actorName: e.actorName,
        actorRole: e.actorRole,
        action: e.action,
        target: e.target ?? "",
        ipAddress: e.ipAddress ?? "",
      }))
    );
    addJob("audit_log", "csv");
  };

  const addJob = (type: ExportJob["type"], format: ExportJob["format"]) => {
    const newJob: ExportJob = {
      id: `job-${Date.now()}`,
      requestedBy: "admin@smartroad.com",
      requestedAt: Date.now(),
      type,
      format,
      status: "queued",
      filters: {},
    };
    setJobs((prev) => [newJob, ...prev]);
  };

  const triggerExport = (type: ExportJob["type"], format: ExportJob["format"]) => {
    addJob(type, format);
    // TODO: POST to /api/admin/exports and poll for status
  };

  const refetch = () => setTick((t) => t + 1);

  return { jobs, loading, error, exportIncidentsCSV, exportAuditCSV, triggerExport, refetch };
};
