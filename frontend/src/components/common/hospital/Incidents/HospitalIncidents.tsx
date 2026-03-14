import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FunnelIcon, MagnifyingGlassIcon, ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { emergencyService } from '../../../../services/api/emergency.service';
import { useIncidents } from '../../../../hooks/useIncidents';
import { Incident } from '../../../../types/emergency.types';
import IncidentMap from '../../Maps/IncidentMap';
import SeverityBadge from '../../SeverityBadge';

const getStatusColor = (s: string): string => ({
  pending:    'bg-yellow-100 text-yellow-800',
  reported:   'bg-orange-100 text-orange-800',
  assigned:   'bg-blue-100 text-blue-800',
  responding: 'bg-purple-100 text-purple-800',
  resolved:   'bg-green-100 text-green-800',
  closed:     'bg-gray-100 text-gray-800',
  cancelled:  'bg-red-100 text-red-800',
} as Record<string, string>)[s] || 'bg-gray-100 text-gray-800';

const STATUSES   = ['pending', 'reported', 'assigned', 'responding', 'resolved', 'closed', 'cancelled'];
const SEVERITIES = ['low', 'medium', 'high', 'critical', 'fatal'];

const HospitalIncidents: React.FC = () => {
  const navigate = useNavigate();

  // ── Live incident list from socket + REST (Phase 2) ───────────────────────
  const { incidents, loading, refetch } = useIncidents();

  const [filtered, setFiltered]                 = useState<Incident[]>([]);
  const [view, setView]                         = useState<'table' | 'map'>('table');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filters, setFilters] = useState({
    search: '', status: '', severity: '', startDate: '', endDate: '',
  });

  // ── Re-apply filters whenever incidents or filter values change ───────────
  useEffect(() => {
    let result = [...incidents];
    if (filters.status)    result = result.filter(i => i.status === filters.status);
    if (filters.severity)  result = result.filter(i => i.severity === filters.severity);
    if (filters.startDate) result = result.filter(i => new Date(i.timestamp ?? new Date()) >= new Date(filters.startDate));
    if (filters.endDate)   result = result.filter(i => new Date(i.timestamp ?? new Date()) <= new Date(filters.endDate));
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(i =>
        (i.incidentId ?? '').toLowerCase().includes(s) ||
        (i.driverName ?? (i as any).driver?.name ?? '').toLowerCase().includes(s) ||
        (i.vehicleNumber ?? '').toLowerCase().includes(s)
      );
    }
    setFiltered(result);
  }, [incidents, filters]);

  const handleAccept = async (incidentId: string) => {
    try {
      await emergencyService.acceptIncident(incidentId, 'hospital1', 'responder1', 10);
      toast.success('Incident accepted');
      refetch();
    } catch {
      toast.error('Failed to accept incident');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header + Filters ── */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
            <p className="text-gray-500 mt-1">
              Showing {filtered.length} of {incidents.length} incidents
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setView(v => v === 'table' ? 'map' : 'table')}
              className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            >
              <MapPinIcon className="h-4 w-4" />
              <span>{view === 'table' ? 'Map View' : 'Table View'}</span>
            </button>
            <button
              onClick={refetch}
              className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              className="pl-9 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Status</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={filters.severity}
            onChange={e => setFilters(p => ({ ...p, severity: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Severity</option>
            {SEVERITIES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* ── Map View (Phase 4) ── */}
      {view === 'map' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Incidents Map</h2>
          <IncidentMap
            incidents={filtered}
            onMarkerClick={setSelectedIncident}
            selectedIncident={selectedIncident}
            showRadius={false}
            showHotspots={true}
            hotspotThreshold={3}
            hotspotRadiusKm={1}
            showDrivers={true}
            showResponders={true}
            showDriverTrails={true}
          />
        </div>
      )}

      {/* ── Table View ── */}
      {view === 'table' && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Incident ID', 'Time', 'Location', 'Severity', 'Status', 'Driver', 'Responders', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(incident => (
                  <tr key={incident._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">
                      {incident.incidentId?.slice(-8) ?? incident._id?.slice(-8) ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {format(new Date(incident.timestamp ?? new Date()), 'HH:mm, MMM dd')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {incident.locationAddress ?? (
                        // IGeoLocation uses GeoJSON coordinates [lng, lat]
                        incident.location?.coordinates
                          ? `${incident.location.coordinates[1].toFixed(4)}, ${incident.location.coordinates[0].toFixed(4)}`
                          : 'N/A'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge
                        severity={incident.severity}
                        status={incident.status}
                        timestamp={incident.timestamp}
                        showScore={false}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {incident.driverName ?? (incident as any).driver?.name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {incident.responders?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/alert/${incident._id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                        {incident.status === 'pending' && (
                          <button
                            onClick={() => handleAccept(incident._id)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Accept
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <FunnelIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No incidents found</h3>
              <p className="text-gray-500">Try adjusting your filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HospitalIncidents;
