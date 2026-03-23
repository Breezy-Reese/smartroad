import React, { useState } from 'react';
import { ClockIcon, TruckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useIncidents } from '../../../hooks/useIncidents';
import ETACountdown from './ETACountdown';

const STATUSES = ['assigned', 'responding', 'dispatched'] as const;

const ETAPage: React.FC = () => {
  const { incidents, loading, error, refetch } = useIncidents();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const activeIncidents = incidents.filter(i =>
    STATUSES.includes(i.status as any)
  );

  const filtered = activeIncidents.filter(i => {
    const matchesSeverity = filter === 'all' || i.severity === filter;
    const matchesSearch =
      search === '' ||
      i.incidentId?.toLowerCase().includes(search.toLowerCase()) ||
      i._id?.toLowerCase().includes(search.toLowerCase()) ||
      i.locationAddress?.toLowerCase().includes(search.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={refetch}
          className="mt-3 text-sm text-red-500 underline hover:text-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ETA Countdown</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Live arrival times for ambulances currently en route
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full">
              <TruckIcon className="h-4 w-4" />
              {activeIncidents.length} en route
            </span>
            <button
              onClick={refetch}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by incident ID or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Severity filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition capitalize ${
                filter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ETA Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">
            {activeIncidents.length === 0
              ? 'No ambulances currently en route'
              : 'No results match your filters'}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {activeIncidents.length === 0
              ? 'This panel will update automatically when ambulances are dispatched.'
              : 'Try adjusting your search or severity filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(incident => {
            const responder = (incident.responders?.[0] as any);
            const shortId = incident.incidentId?.slice(-6) ?? incident._id?.slice(-6);

            const severityColors: Record<string, string> = {
              critical: 'bg-red-100 text-red-700',
              high:     'bg-orange-100 text-orange-700',
              medium:   'bg-yellow-100 text-yellow-700',
              low:      'bg-green-100 text-green-700',
            };
            const badge = severityColors[incident.severity] ?? 'bg-gray-100 text-gray-600';

            return (
              <div
                key={incident._id}
                className="bg-white rounded-xl shadow border border-gray-100 p-4 space-y-3 hover:shadow-md transition"
              >
                {/* Card header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-400 font-medium">
                    #{shortId}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${badge}`}>
                    {incident.severity}
                  </span>
                </div>

                {/* ETA widget */}
                <ETACountdown
                  etaMinutes={
                    typeof responder?.eta === 'number' && !isNaN(responder.eta)
                      ? responder.eta
                      : 8
                  }
                  dispatchedAt={
                    responder?.dispatchedAt
                      ? new Date(responder.dispatchedAt)
                      : incident.timestamp
                        ? new Date(incident.timestamp)
                        : new Date()
                  }
                  incidentId={incident._id}
                  responderName={responder?.name}
                />

                {/* Location */}
                {incident.locationAddress && (
                  <p className="text-xs text-gray-400 truncate">
                    📍 {incident.locationAddress}
                  </p>
                )}

                {/* Status pill */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{incident.status}</span>
                  {incident.timestamp && (
                    <span>
                      {new Date(incident.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ETAPage;
