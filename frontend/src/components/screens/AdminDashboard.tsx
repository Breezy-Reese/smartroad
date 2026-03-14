import React, { useState } from 'react';
import { useAdminStats } from '../../hooks/useAdminStats';
import { useExports } from '../../hooks/useExports';
import { FleetIncident, IncidentSeverity } from '../../types/admin.types';
import {
  TruckIcon,
  ExclamationTriangleIcon,
  BellIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

/* ── Severity badge ── */
const SeverityBadge: React.FC<{ severity: IncidentSeverity }> = ({ severity }) => {
  const map: Record<IncidentSeverity, string> = {
    low:      'bg-gray-100 text-gray-600',
    medium:   'bg-yellow-100 text-yellow-700',
    high:     'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[severity]}`}>
      {severity}
    </span>
  );
};

/* ── Stat card ── */
const Stat: React.FC<{
  label: string;
  value: string | number;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  sub?: string;
  highlight?: boolean;
}> = ({ label, value, icon: Icon, sub, highlight }) => (
  <div className={`rounded-xl p-4 border ${highlight ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className={`p-1.5 rounded-lg ${highlight ? 'bg-red-100' : 'bg-gray-50'}`}>
        <Icon className={`h-4 w-4 ${highlight ? 'text-red-600' : 'text-gray-500'}`} />
      </div>
    </div>
    <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

/* ── Mini bar chart using divs ── */
const MiniBarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map(({ label, value, color }) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-sm ${color} transition-all duration-500`}
            style={{ height: `${(value / max) * 64}px`, minHeight: value > 0 ? '4px' : '0' }}
          />
          <span className="text-xs text-gray-400 truncate w-full text-center">{label}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Incident row ── */
const IncidentRow: React.FC<{ incident: FleetIncident }> = ({ incident }) => (
  <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${
      incident.severity === 'critical' ? 'bg-red-500' :
      incident.severity === 'high'     ? 'bg-orange-400' :
      incident.severity === 'medium'   ? 'bg-yellow-400' : 'bg-gray-300'
    }`} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{incident.driverName}</p>
      <p className="text-xs text-gray-500 truncate">{incident.type}</p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <SeverityBadge severity={incident.severity} />
      {incident.resolved
        ? <CheckCircleIcon className="h-4 w-4 text-green-500" />
        : <XCircleIcon className="h-4 w-4 text-red-400" />
      }
    </div>
    <p className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">
      {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </p>
  </div>
);

/* ── Main screen ── */
const AdminDashboard: React.FC = () => {
  const { stats, incidents, loading, refresh } = useAdminStats();
  const { exportIncidentsCSV } = useExports();
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all');

  const filtered = severityFilter === 'all'
    ? incidents
    : incidents.filter((i) => i.severity === severityFilter);

  const recent = filtered
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);

  // Build last-7-days bar data
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const barData = dayLabels.map((label, i) => {
    const dayStart = Date.now() - (6 - i) * 86400000;
    const dayEnd   = dayStart + 86400000;
    return {
      label,
      value: incidents.filter((inc) => inc.timestamp >= dayStart && inc.timestamp < dayEnd).length,
      color: 'bg-blue-400',
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live incident and driver summary</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportIncidentsCSV(incidents)}
            className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-2 text-sm px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Active drivers"     value={`${stats.activeDrivers} / ${stats.totalDrivers}`} icon={TruckIcon}              sub="on the road"            />
          <Stat label="Open incidents"     value={stats.openIncidents}                               icon={ExclamationTriangleIcon} sub="need resolution"        highlight={stats.openIncidents > 0} />
          <Stat label="Alerts today"       value={stats.notificationsSentToday}                     icon={BellIcon}                sub={`${Math.round(stats.deliveryRate * 100)}% delivered`} />
          <Stat label="Avg trip score"     value={`${stats.avgTripScore}%`}                         icon={ChartBarIcon}            sub="fleet average"          />
        </div>
      )}

      {/* Chart + incident list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Incidents this week */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Incidents this week</p>
          <MiniBarChart data={barData} />
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold text-gray-900">{stats?.incidentsWeek ?? '—'}</span>
          </div>
        </div>

        {/* Severity breakdown */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">By severity</p>
          <MiniBarChart data={[
            { label: 'Low',      value: incidents.filter((i) => i.severity === 'low').length,      color: 'bg-gray-300'    },
            { label: 'Medium',   value: incidents.filter((i) => i.severity === 'medium').length,   color: 'bg-yellow-400'  },
            { label: 'High',     value: incidents.filter((i) => i.severity === 'high').length,     color: 'bg-orange-400'  },
            { label: 'Critical', value: incidents.filter((i) => i.severity === 'critical').length, color: 'bg-red-500'     },
          ]} />
        </div>
      </div>

      {/* Recent incidents table */}
      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-900">Recent incidents</p>
          <div className="flex gap-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSeverityFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  severityFilter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5">
          {recent.length > 0
            ? recent.map((inc) => <IncidentRow key={inc.id} incident={inc} />)
            : <p className="py-8 text-center text-sm text-gray-400">No incidents found</p>
          }
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
