import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../../../../config/axios.config';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const ROLES = ['driver', 'hospital', 'responder', 'admin'];

const roleColors: Record<string, string> = {
  driver: 'bg-sky-100 text-sky-700',
  hospital: 'bg-teal-100 text-teal-700',
  responder: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-red-100 text-red-700',
};

const UserRoles: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axiosInstance.get('/admin/users');
        const data = res.data?.data || res.data;
        setUsers(Array.isArray(data) ? data : data.users || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      await axiosInstance.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      setSuccessMsg('Role updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Roles</h1>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {successMsg && <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm">{successMsg}</div>}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-400 text-sm">No users found</td>
              </tr>
            ) : users.map(user => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={user.role}
                    disabled={updating === user._id}
                    onChange={e => handleRoleChange(user._id, e.target.value)}
                    className="border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserRoles;
