import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../../../../config/axios.config';

interface Stats {
  totalUsers: number;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  totalDrivers: number;
  totalHospitals: number;
  totalResponders: number;
}

interface RecentIncident {
  _id: string;
  incidentId: string;
  type: string;
  severity: string;
  status: string;
  driverName: string;
  createdAt: string;
}

interface RecentUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const severityColor: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
  fatal: 'bg-red-200 text-red-900',
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axiosInstance.get('/admin/dashboard');
        const { stats, recentIncidents, recentUsers } = res.data.data;
        setStats(stats);
        setRecentIncidents(recentIncidents);
        setRecentUsers(recentUsers);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 text-red-700 rounded-lg">{error}</div>
  );

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers, color: 'bg-blue-500' },
    { label: 'Total Incidents', value: stats?.totalIncidents, color: 'bg-purple-500' },
    { label: 'Active Incidents', value: stats?.activeIncidents, color: 'bg-orange-500' },
    { label: 'Resolved', value: stats?.resolvedIncidents, color: 'bg-green-500' },
    { label: 'Drivers', value: stats?.totalDrivers, color: 'bg-sky-500' },
    { label: 'Hospitals', value: stats?.totalHospitals, color: 'bg-teal-500' },
    { label: 'Responders', value: stats?.totalResponders, color: 'bg-indigo-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
            <div className={`${card.color} text-white text-2xl font-bold rounded-lg px-4 py-2 mb-2`}>
              {card.value ?? 0}
            </div>
            <p className="text-xs text-gray-500 text-center">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Incidents</h2>
          {recentIncidents.length === 0 ? (
            <p className="text-gray-500 text-sm">No incidents yet</p>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map(inc => (
                <div key={inc._id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{inc.driverName}</p>
                    <p className="text-xs text-gray-500">{inc.type} · {new Date(inc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${severityColor[inc.severity] || 'bg-gray-100 text-gray-600'}`}>
                      {inc.severity}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {inc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Users</h2>
          {recentUsers.length === 0 ? (
            <p className="text-gray-500 text-sm">No users yet</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map(user => (
                <div key={user._id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
