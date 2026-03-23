import React, { useState } from 'react';
import { useExports } from '../../hooks/useExports';
import { useAdminStats } from '../../hooks/useAdminStats';
import { useAuditLog } from '../../hooks/useAuditLog';
import { ExportJob } from '../../types/admin.types';
import { axiosInstance } from '../../config/axios.config';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

/* ── Job status badge ── */
const StatusBadge: React.FC<{ status: ExportJob['status'] }> = ({ status }) => {
  const map: Record<ExportJob['status'], { cls: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string }> = {
    queued:     { cls: 'bg-gray-100 text-gray-600',   icon: ClockIcon,       label: 'Queued'     },
    processing: { cls: 'bg-blue-100 text-blue-700',   icon: ArrowPathIcon,   label: 'Processing' },
    ready:      { cls: 'bg-green-100 text-green-700', icon: CheckCircleIcon, label: 'Ready'      },
    failed:     { cls: 'bg-red-100 text-red-700',     icon: XCircleIcon,     label: 'Failed'     },
  };
  const { cls, icon: Icon, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
};

/* ── Quick export card ── */
const ExportCard: React.FC<{
  title: string;
  description: string;
  onCsv: () => void;
  loading: boolean;
}> = ({ title, description, onCsv, loading }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5">
    <div className="flex items-start gap-3 mb-4">
      <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
        <DocumentTextIcon className="h-5 w-5 text-blue-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <button
        onClick={onCsv}
        disabled={loading}
        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
        CSV
      </button>
    </div>
  </div>
);

/* ── Date range picker ── */
const DateRangePicker: React.FC<{
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}> = ({ from, to, onFromChange, onToChange }) => (
  <div className="flex gap-3 items-center flex-wrap">
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
);

/* ── Main screen ── */
const ExportsScreen: React.FC = () => {
  const { jobs, loading, exportIncidentsCSV, exportAuditCSV } = useExports();
  const { incidents } = useAdminStats();
  const { entries } = useAuditLog();

  const today   = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom]                   = useState(weekAgo);
  const [to, setTo]                       = useState(today);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const filteredIncidents = incidents.filter((i) => {
    const d = new Date(i.timestamp).toISOString().slice(0, 10);
    return d >= from && d <= to;
  });

  const filteredAudit = entries.filter((e) => {
    const d = new Date(e.timestamp).toISOString().slice(0, 10);
    return d >= from && d <= to;
  });

  // ── Programmatic download — uses axiosInstance so the auth token is sent
  const handleDownload = async (job: ExportJob) => {
    if (downloadingId) return;
    setDownloadingId(job.id);
    setDownloadError(null);
    try {
      const res = await axiosInstance.get(`/admin/exports/${job.id}/download`, {
        responseType: 'blob',
      });

      // Check if the server returned a JSON error wrapped in a blob
      const contentType = res.headers['content-type'] ?? '';
      if (contentType.includes('application/json')) {
        const text = await (res.data as Blob).text();
        const json = JSON.parse(text);
        throw new Error(json.error ?? 'Download failed');
      }

      const blob = new Blob([res.data], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${job.type}_${job.id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download failed:', err);
      setDownloadError(err?.message ?? 'Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download incident data and audit logs.</p>
      </div>

      {/* Download error banner */}
      {downloadError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <span>⚠ {downloadError}</span>
          <button
            onClick={() => setDownloadError(null)}
            className="ml-4 text-red-400 hover:text-red-600 font-bold text-base leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Date range */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">Date range</p>
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        <p className="text-xs text-gray-400 mt-3">
          {filteredIncidents.length} incidents · {filteredAudit.length} audit entries in range
        </p>
      </div>

      {/* Quick export cards */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Quick exports</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ExportCard
            title="Incidents"
            description="All fleet incidents with severity, location, driver, and resolution status."
            onCsv={() => exportIncidentsCSV(filteredIncidents)}
            loading={loading}
          />
          <ExportCard
            title="Audit log"
            description="Full admin action history with actor, role, timestamp, and IP."
            onCsv={() => exportAuditCSV(filteredAudit)}
            loading={loading}
          />
        </div>
      </div>

      {/* Job history */}
      {jobs.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Export history</p>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 px-5 py-3">
                <DocumentTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {job.type.replace('_', ' ')} · {job.format.toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(job.requestedAt).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={job.status} />
                {job.status === 'ready' && (
                  <button
                    onClick={() => handleDownload(job)}
                    disabled={downloadingId === job.id}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowDownTrayIcon
                      className={`h-3.5 w-3.5 ${downloadingId === job.id ? 'animate-bounce' : ''}`}
                    />
                    {downloadingId === job.id ? 'Downloading…' : 'Download'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportsScreen;
