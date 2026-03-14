import { useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../config/axios.config";
import { ExportJob, AuditEntry, FleetIncident } from "../types/admin.types";

interface UseExportsReturn {
  jobs: ExportJob[];
  loading: boolean;
  error: string | null;
  exportIncidentsCSV: (incidents: FleetIncident[]) => Promise<void>;
  exportAuditCSV: (entries: AuditEntry[]) => Promise<void>;
  triggerExport: (type: ExportJob["type"], format: ExportJob["format"]) => Promise<void>;
  refetch: () => void;
}

// ── Fallback: generate + download a CSV in the browser if the server
//    can't produce one (e.g. the backend export endpoint isn't ready yet).
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

// ── Poll a job until it reaches a terminal state (ready | failed).
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

const pollJob = async (
  jobId: string,
  onUpdate: (job: ExportJob) => void
): Promise<void> => {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await axiosInstance.get(`/admin/exports/${jobId}`);
      const job: ExportJob = res.data?.data ?? res.data;
      onUpdate(job);
      if (job.status === "ready" || job.status === "failed") return;
    } catch {
      // Network blip — keep polling
    }
  }
};

export const useExports = (): UseExportsReturn => {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // ── Load existing export jobs from the server
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get("/admin/exports");
        const data: ExportJob[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];
        if (!cancelled) setJobs(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load export jobs");
          setJobs([]);
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

  // ── Update a single job in state (used by the poller)
  const updateJob = useCallback((updated: ExportJob) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === updated.id ? updated : j))
    );
  }, []);

  // ── POST a new export job to the server, then poll until done
  const triggerExport = useCallback(
    async (type: ExportJob["type"], format: ExportJob["format"]) => {
      // Optimistically add a queued placeholder
      const tempId = `job-${Date.now()}`;
      const placeholder: ExportJob = {
        id: tempId,
        requestedBy: "",        // server will fill this from the JWT
        requestedAt: Date.now(),
        type,
        format,
        status: "queued",
        filters: {},
      };
      setJobs((prev) => [placeholder, ...prev]);

      try {
        const res = await axiosInstance.post("/admin/exports", { type, format });
        const created: ExportJob = res.data?.data ?? res.data;

        // Replace the placeholder with the real job from the server
        setJobs((prev) =>
          prev.map((j) => (j.id === tempId ? created : j))
        );

        // Poll until the server finishes generating the file
        if (created.status === "queued" || created.status === "processing") {
          await pollJob(created.id, updateJob);
        }
      } catch (err: unknown) {
        // Mark placeholder as failed
        setJobs((prev) =>
          prev.map((j) =>
            j.id === tempId ? { ...j, status: "failed" as const } : j
          )
        );
        throw err;
      }
    },
    [updateJob]
  );

  // ── Incidents CSV — try server first, fall back to browser-side generation
  const exportIncidentsCSV = useCallback(
    async (incidents: FleetIncident[]) => {
      try {
        await triggerExport("incidents", "csv");
      } catch {
        // Server export failed — generate locally so the user still gets a file
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
      }
    },
    [triggerExport]
  );

  // ── Audit CSV — try server first, fall back to browser-side generation
  const exportAuditCSV = useCallback(
    async (entries: AuditEntry[]) => {
      try {
        await triggerExport("audit_log", "csv");
      } catch {
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
      }
    },
    [triggerExport]
  );

  const refetch = () => setTick((t) => t + 1);

  return { jobs, loading, error, exportIncidentsCSV, exportAuditCSV, triggerExport, refetch };
};
