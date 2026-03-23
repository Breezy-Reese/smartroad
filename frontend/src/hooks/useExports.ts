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

// ── Normalize MongoDB _id → id so the rest of the app uses job.id consistently
const normalizeJob = (raw: Record<string, unknown>): ExportJob => ({
  ...raw,
  id: (raw.id ?? raw._id) as string,   // ✅ fix: accept either field
} as ExportJob);

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

const pollJob = async (
  jobId: string,
  onUpdate: (job: ExportJob) => void
): Promise<void> => {
  // ✅ fix: guard against undefined before even starting
  if (!jobId || jobId === "undefined") {
    console.error("pollJob called with invalid jobId:", jobId);
    return;
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await axiosInstance.get(`/admin/exports/${jobId}`);
      const raw = res.data?.data ?? res.data;
      const job = normalizeJob(raw);
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get("/admin/exports");
        const raw: Record<string, unknown>[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];
        if (!cancelled) setJobs(raw.map(normalizeJob)); // ✅ normalize on load too
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
    return () => { cancelled = true; };
  }, [tick]);

  const updateJob = useCallback((updated: ExportJob) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === updated.id ? updated : j))
    );
  }, []);

  const triggerExport = useCallback(
    async (type: ExportJob["type"], format: ExportJob["format"]) => {
      const tempId = `job-${Date.now()}`;
      const placeholder: ExportJob = {
        id: tempId,
        requestedBy: "",
        requestedAt: Date.now(),
        type,
        format,
        status: "queued",
        filters: {},
      };
      setJobs((prev) => [placeholder, ...prev]);

      try {
        const res = await axiosInstance.post("/admin/exports", { type, format });
        const raw = res.data?.data ?? res.data;
        const created = normalizeJob(raw); // ✅ normalize _id → id

        // ✅ Fail loudly if the server didn't return a usable ID
        if (!created.id) {
          console.error("Export job created but no id returned:", raw);
          throw new Error("Server did not return a job ID");
        }

        setJobs((prev) =>
          prev.map((j) => (j.id === tempId ? created : j))
        );

        if (created.status === "queued" || created.status === "processing") {
          await pollJob(created.id, updateJob);
        }
      } catch (err: unknown) {
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

  const exportIncidentsCSV = useCallback(
    async (incidents: FleetIncident[]) => {
      try {
        await triggerExport("incidents", "csv");
      } catch {
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