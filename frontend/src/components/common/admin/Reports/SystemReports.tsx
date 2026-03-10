import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../../../../config/axios.config';

interface Report {
  totalIncidents: number;
  resolvedIncidents: number;
  averageResponseTime?: number;
  incidentsByType?: Record<string, number>;
  incidentsBySeverity?: Record<string, number>;
  topDrivers?: { name: string; incidents: number }[];
}

const SystemReports: React.FC = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await axiosInstance.get('/admin/reports');
        setReport(res.data?.data || res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 text-red-700 rounded-lg">{error}</div>
  );

  const resolutionRate = report?.totalIncidents
    ? Math.round(((report.resolvedIncidents || 0) / report.totalIncidents) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 mb-1">Total Incidents</p>
          <p className="text-3xl font-bold text-purple-600">{report?.totalIncidents ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 mb-1">Resolved</p>
          <p className="text-3xl font-bold text-green-600">{report?.resolvedIncidents ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 mb-1">Resolution Rate</p>
          <p className="text-3xl font-bold text-blue-600">{resolutionRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Type */}
        {report?.incidentsByType && Object.keys(report.incidentsByType).length > 0 && (
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Incidents by Type</h2>
            <div className="space-y-3">
              {Object.entries(report.incidentsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.min((count / (report.totalIncidents || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-800 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incidents by Severity */}
        {report?.incidentsBySeverity && Object.keys(report.incidentsBySeverity).length > 0 && (
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Incidents by Severity</h2>
            <div className="space-y-3">
              {Object.entries(report.incidentsBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{severity}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min((count / (report.totalIncidents || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-800 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Average Response Time */}
      {report?.averageResponseTime !== undefined && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Average Response Time</h2>
          <p className="text-3xl font-bold text-orange-500">{report.averageResponseTime} <span className="text-base font-normal text-gray-500">minutes</span></p>
        </div>
      )}
    </div>
  );
};

export default SystemReports;
