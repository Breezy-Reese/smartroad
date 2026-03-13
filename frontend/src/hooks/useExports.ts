import { useState, useCallback } from 'react';
import { ExportJob, FleetIncident, IncidentSeverity } from '../types/admin.types';
import { AuditEntry } from '../types/admin.types';
import { toast } from 'react-hot-toast';

export const useExports = () => {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);

  const requestExport = useCallback(async (
    type: ExportJob['type'],
    format: ExportJob['format'],
    filters: ExportJob['filters'] = {},
  ) => {
    setLoading(true);
    const job: ExportJob = {
      id: `exp_${Date.now()}`,
      requestedBy: 'Admin User',
      requestedAt: Date.now(),
      type, format, filters,
      status: 'queued',
    };

    setJobs((prev) => [job, ...prev]);
    toast('Export queued…', { icon: '📋' });

    try {
      // TODO: POST /admin/exports  { type, format, filters }
      await new Promise((r) => setTimeout(r, 1500));
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: 'ready', completedAt: Date.now(), downloadUrl: '#' }
            : j
        )
      );
      toast.success(`${format.toUpperCase()} export ready`);
    } catch {
      setJobs((prev) =>
        prev.map((j) => j.id === job.id ? { ...j, status: 'failed' } : j)
      );
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Client-side CSV generator (fallback / dev) ── */
  const downloadCSV = useCallback((
    data: Record<string, unknown>[],
    filename: string,
  ) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') ? `"${str}"` : str;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename}.csv downloaded`);
  }, []);

  const exportIncidentsCSV = useCallback((incidents: FleetIncident[]) => {
    downloadCSV(
      incidents.map((i) => ({
        id: i.id,
        driver: i.driverName,
        type: i.type,
        severity: i.severity,
        lat: i.lat.toFixed(6),
        lng: i.lng.toFixed(6),
        date: new Date(i.timestamp).toISOString(),
        resolved: i.resolved,
        trip_score: i.tripScore ?? '',
        escalation_level: i.escalationLevel,
        notifications_sent: i.notificationsSent,
      })),
      'incidents',
    );
  }, [downloadCSV]);

  const exportAuditCSV = useCallback((entries: AuditEntry[]) => {
    downloadCSV(
      entries.map((e) => ({
        id: e.id,
        timestamp: new Date(e.timestamp).toISOString(),
        actor: e.actorName,
        role: e.actorRole,
        action: e.action,
        target: e.target ?? '',
        ip: e.ipAddress ?? '',
      })),
      'audit_log',
    );
  }, [downloadCSV]);

  return { jobs, loading, requestExport, exportIncidentsCSV, exportAuditCSV };
};
