import React, { useState } from 'react';
import { useExports } from '../../../hooks/useExports';
import { useAdminStats } from '../../../hooks/useAdminStats';
import { useAuditLog } from '../../../hooks/useAuditLog';
import { ExportJob } from '../../../types/admin.types';
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
    queued:     { cls: 'bg-gray-100 text-gray-600',    icon: ClockIcon,        label: 'Queued'     },
    processing: { cls: 'bg-blue-100 text-blue-700',    icon: ArrowPathIcon,    label: 'Processing' },
    ready:      { cls: 'bg-green-100 text-green-700',  icon: CheckCircleIcon,  label: 'Ready'      },
    failed:     { cls: 'bg-red-100 text-red-700',      icon: XCircleIcon,      label: 'Failed'     },
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

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo]     = useState(today);

  const filteredIncidents = incidents.filter((i) => {
    const d = new Date(i.timestamp).toISOString().slice(0, 10);
    return d >= from && d <= to;
  });

  const filteredAudit = entries.filter((e) => {
    const d = new Date(e.timestamp).toISOString().slice(0, 10);
    return d >= from && d <= to;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download incident data and audit logs.</p>
      </div>

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
                {job.status === 'ready' && job.downloadUrl && (
                  <a
                    href={job.downloadUrl}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                    Download
                  </a>
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
