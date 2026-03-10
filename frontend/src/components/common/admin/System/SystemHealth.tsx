import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../../../../config/axios.config';

interface SystemHealthData {
  status: string;
  uptime?: number;
  memoryUsage?: { used: number; total: number };
  cpuUsage?: number;
  dbStatus?: string;
  activeConnections?: number;
}

const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/admin/system/health');
      setHealth(res.data?.data || res.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const statusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    if (status === 'healthy' || status === 'connected' || status === 'ok') return 'bg-green-100 text-green-700';
    if (status === 'degraded') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading && !health) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 text-red-700 rounded-lg">{error}</div>
  );

  const metrics = [
    { label: 'System Status', value: health?.status || 'Unknown', isStatus: true },
    { label: 'Database', value: health?.dbStatus || 'Unknown', isStatus: true },
    { label: 'Uptime', value: formatUptime(health?.uptime), isStatus: false },
    { label: 'Active Connections', value: String(health?.activeConnections ?? 'N/A'), isStatus: false },
    { label: 'CPU Usage', value: health?.cpuUsage !== undefined ? `${health.cpuUsage}%` : 'N/A', isStatus: false },
    { label: 'Memory Used', value: health?.memoryUsage ? `${health.memoryUsage.used}MB / ${health.memoryUsage.total}MB` : 'N/A', isStatus: false },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</p>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(metric => (
          <div key={metric.label} className="bg-white rounded-xl shadow p-5">
            <p className="text-xs text-gray-500 mb-2">{metric.label}</p>
            {metric.isStatus ? (
              <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${statusColor(metric.value)}`}>
                {metric.value}
              </span>
            ) : (
              <p className="text-lg font-semibold text-gray-800">{metric.value}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHealth;
