import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../../../../config/axios.config';

interface Log {
  _id: string;
  level: string;
  message: string;
  timestamp: string;
  userId?: string;
  action?: string;
}

const levelColor: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warn: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  debug: 'bg-gray-100 text-gray-600',
};

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axiosInstance.get('/admin/logs');
        const data = res.data?.data || res.data;
        setLogs(Array.isArray(data) ? data : data.logs || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = levelFilter === 'all' ? logs : logs.filter(l => l.level === levelFilter);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 text-red-700 rounded-lg">{error}</div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No logs found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(log => (
              <div key={log._id} className="px-6 py-4 flex items-start gap-4">
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize shrink-0 ${levelColor[log.level] || 'bg-gray-100 text-gray-600'}`}>
                  {log.level}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{log.message}</p>
                  {log.action && <p className="text-xs text-gray-400 mt-1">Action: {log.action}</p>}
                </div>
                <p className="text-xs text-gray-400 shrink-0">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;
