import React, { useState, useEffect } from 'react';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useExports } from '../../hooks/useExports';
import { AuditEntry, AdminRole } from '../../types/admin.types';
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin:   'bg-purple-100 text-purple-700',
  fleet_manager: 'bg-blue-100 text-blue-700',
  dispatcher:    'bg-green-100 text-green-700',
  viewer:        'bg-gray-100 text-gray-600',
};

const ACTION_COLORS: Record<string, string> = {
  EMERGENCY:   'text-red-600',
  POLICY:      'text-orange-600',
  DRIVER:      'text-blue-600',
  EXPORT:      'text-purple-600',
  NOTIFICATION:'text-green-600',
  ROLE:        'text-amber-600',
};

const actionColor = (action: string) => {
  const prefix = Object.keys(ACTION_COLORS).find((k) => action.startsWith(k));
  return prefix ? ACTION_COLORS[prefix] : 'text-gray-700';
};

/* ── Entry row ── */
const EntryRow: React.FC<{ entry: AuditEntry; index: number }> = ({ entry, index }) => (
  <div className={`flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 ${index % 2 === 0 ? '' : 'bg-gray-50/40'} px-4`}>
    {/* Timestamp */}
    <div className="flex-shrink-0 w-28">
      <p className="text-xs text-gray-500 font-mono">
        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-xs text-gray-400 font-mono">
        {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
      </p>
    </div>

    {/* Actor */}
    <div className="flex-shrink-0 w-36">
      <p className="text-xs font-medium text-gray-900">{entry.actorName}</p>
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[entry.actorRole]}`}>
        {entry.actorRole.replace('_', ' ')}
      </span>
    </div>

    {/* Action */}
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-mono font-semibold ${actionColor(entry.action)}`}>
        {entry.action}
      </p>
      {entry.target && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">→ {entry.target}</p>
      )}
    </div>

    {/* IP */}
    <p className="flex-shrink-0 text-xs text-gray-400 font-mono w-24 text-right">
      {entry.ipAddress ?? '—'}
    </p>
  </div>
);

/* ── Main screen ── */
const AuditLogScreen: React.FC = () => {
  const { entries, loading, fetchEntries } = useAuditLog();
  const { exportAuditCSV } = useExports();

  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'all'>('all');
  const [filtered, setFiltered]   = useState<AuditEntry[]>(entries);
  const [page, setPage]           = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const apply = async () => {
      const result = await fetchEntries({
        actorRole: roleFilter === 'all' ? undefined : roleFilter,
        action: search || undefined,
      });
      setFiltered(result);
      setPage(0);
    };
    apply();
  }, [search, roleFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const roles: (AdminRole | 'all')[] = ['all', 'super_admin', 'fleet_manager', 'dispatcher', 'viewer'];

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Immutable record of all admin actions</p>
        </div>
        <button
          onClick={() => exportAuditCSV(filtered)}
          className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                roleFilter === r ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r === 'all' ? 'All roles' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <ShieldCheckIcon className="h-4 w-4" />
        <span>{filtered.length} entries</span>
        {search && <span>matching "{search}"</span>}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span className="w-28">Time</span>
          <span className="w-36">Actor</span>
          <span className="flex-1">Action</span>
          <span className="w-24 text-right">IP</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : paginated.length > 0 ? (
          paginated.map((entry, i) => <EntryRow key={entry.id} entry={entry} index={i} />)
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">No entries found</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogScreen;
