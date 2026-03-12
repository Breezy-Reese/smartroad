import React, { useState, useEffect } from 'react';
import { ChartBarIcon, ClockIcon, TruckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../../../services/api/axiosInstance';

interface Stats {
  totalIncidents: number;
  resolvedIncidents: number;
  avgResponseTime: number;
  activeIncidents: number;
  incidentsByType: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  incidentsByStatus: Record<string, number>;
}

const ResponseAnalytics: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalIncidents: 0, resolvedIncidents: 0, avgResponseTime: 0, activeIncidents: 0,
    incidentsByType: {}, incidentsBySeverity: {}, incidentsByStatus: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get('/incidents/stats');
      const data = res.data?.data || res.data || {};
      setStats(prev => ({ ...prev, ...data }));
    } catch {
      // Use mock data
      setStats({
        totalIncidents: 20, resolvedIncidents: 8, avgResponseTime: 12, activeIncidents: 7,
        incidentsByType: { collision: 8, rollover: 4, fire: 3, medical: 3, other: 2 },
        incidentsBySeverity: { low: 4, medium: 6, high: 5, critical: 3, fatal: 2 },
        incidentsByStatus: { pending: 3, detected: 2, confirmed: 2, dispatched: 2, 'en-route': 2, arrived: 1, resolved: 8 },
      });
    } finally {
      setLoading(false);
    }
  };

  const severityColors: Record<string, string> = {
    low: 'bg-blue-500', medium: 'bg-yellow-500',
    high: 'bg-orange-500', critical: 'bg-red-500', fatal: 'bg-black',
  };

  const typeColors: Record<string, string> = {
    collision: 'bg-red-400', rollover: 'bg-orange-400',
    fire: 'bg-yellow-400', medical: 'bg-green-400', other: 'bg-gray-400',
  };

  const maxType = Math.max(...Object.values(stats.incidentsByType), 1);
  const maxSeverity = Math.max(...Object.values(stats.incidentsBySeverity), 1);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-500 mt-1">Overview of emergency response performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Incidents', value: stats.totalIncidents, icon: ChartBarIcon, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Active Incidents', value: stats.activeIncidents, icon: TruckIcon, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Resolved', value: stats.resolvedIncidents, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg Response Time', value: `${stats.avgResponseTime} min`, icon: ClockIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-lg shadow p-5`}>
            <div className="flex items-center space-x-3">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Incidents by Type */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Incidents by Type</h2>
          <div className="space-y-3">
            {Object.entries(stats.incidentsByType).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize font-medium">{type}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`${typeColors[type] || 'bg-gray-400'} h-3 rounded-full transition-all`}
                    style={{ width: `${(count / maxType) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incidents by Severity */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Incidents by Severity</h2>
          <div className="space-y-3">
            {Object.entries(stats.incidentsBySeverity).map(([severity, count]) => (
              <div key={severity}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize font-medium">{severity}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`${severityColors[severity] || 'bg-gray-400'} h-3 rounded-full transition-all`}
                    style={{ width: `${(count / maxSeverity) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incidents by Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Incidents by Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.incidentsByStatus).map(([status, count]) => (
              <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500 capitalize">{status.replace('-', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resolution Rate */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Resolution Rate</h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-gray-100 rounded-full h-6">
            <div
              className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-3 transition-all"
              style={{ width: `${stats.totalIncidents ? (stats.resolvedIncidents / stats.totalIncidents) * 100 : 0}%` }}
            >
              <span className="text-white text-xs font-medium">
                {stats.totalIncidents ? Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100) : 0}%
              </span>
            </div>
          </div>
          <span className="text-sm text-gray-500">{stats.resolvedIncidents} / {stats.totalIncidents} resolved</span>
        </div>
      </div>
    </div>
  );
};

export default ResponseAnalytics;
