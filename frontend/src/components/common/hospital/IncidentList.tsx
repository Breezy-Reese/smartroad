import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { emergencyService } from '../../../services/api/emergency.service';
import { Incident } from "../../../types/emergency.types";
import { format } from 'date-fns';
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const IncidentList: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const navigate = useNavigate();

  useEffect(() => { fetchIncidents(); }, []);
  useEffect(() => { applyFilters(); }, [incidents, filters]);

  const fetchIncidents = async () => {
    try {
      const list = await emergencyService.getActiveIncidents({});
      setIncidents(list);
      setFilteredIncidents(list);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      setIncidents([]);
      setFilteredIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...incidents];

    if (filters.status) {
      filtered = filtered.filter(inc => inc.status === filters.status);
    }
    if (filters.severity) {
      filtered = filtered.filter(inc => inc.severity === filters.severity);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(inc =>
        (inc.incidentId ?? '').toLowerCase().includes(searchLower) ||
        inc.driverId?.toLowerCase().includes(searchLower) ||
        inc.vehicleNumber?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.startDate) {
      filtered = filtered.filter(inc =>
        new Date(inc.timestamp ?? new Date()) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(inc =>
        new Date(inc.timestamp ?? new Date()) <= new Date(filters.endDate)
      );
    }

    setFilteredIncidents(filtered);
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
      fatal: 'bg-black text-white',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      reported: 'bg-orange-100 text-orange-800',
      assigned: 'bg-blue-100 text-blue-800',
      responding: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emergency-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Incident Management</h2>
          <button
            onClick={fetchIncidents}
            className="flex items-center space-x-2 text-gray-600 hover:text-emergency-600"
          >
            <ArrowPathIcon className="h-5 w-5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reported">Reported</option>
            <option value="assigned">Assigned</option>
            <option value="responding">Responding</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
          >
            <option value="">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
            <option value="fatal">Fatal</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
          />
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredIncidents.length} of {incidents.length} incidents
        </div>

        {/* Incidents Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Incident ID', 'Time', 'Location', 'Severity', 'Status', 'Driver', 'Responders', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIncidents.map((incident) => (
                <tr key={incident._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {incident.incidentId?.slice(-8) ?? incident._id?.slice(-8) ?? 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {format(new Date(incident.timestamp ?? new Date()), 'HH:mm, MMM dd')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {incident.locationAddress ||
                      `${(incident.location?.latitude ?? incident.location?.lat)?.toFixed(4) ?? 'N/A'}, 
                       ${(incident.location?.longitude ?? incident.location?.lng)?.toFixed(4) ?? 'N/A'}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {incident.driver?.name ?? (incident as any).driverName ?? 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {incident.responders?.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => navigate(`/hospital/incidents/${incident._id}`)}
                      className="text-emergency-600 hover:text-emergency-900 font-medium"
                    >
                      View
                    </button>
                    {incident.status === 'pending' && (
                      <button
                        onClick={() => emergencyService.acceptIncident(incident._id, 'hospital1', 'responder1', 10)}
                        className="text-green-600 hover:text-green-900 font-medium"
                      >
                        Accept
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredIncidents.length === 0 && (
          <div className="text-center py-12">
            <FunnelIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentList;
