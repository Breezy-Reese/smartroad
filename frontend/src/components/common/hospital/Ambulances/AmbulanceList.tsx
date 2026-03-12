import React, { useState, useEffect } from 'react';
import { TruckIcon, PlusIcon, MapPinIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../../../services/api/axiosInstance';

interface Ambulance {
  _id: string;
  plateNumber: string;
  ambulanceModel: string;
  make: string;
  year?: number;
  status: 'available' | 'dispatched' | 'maintenance' | 'offline';
  driverName?: string;
  location?: { lat: number; lng: number };
  lastService?: string;
  notes?: string;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  dispatched: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  offline: 'bg-gray-100 text-gray-700',
};

const AmbulanceList: React.FC = () => {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [newAmbulance, setNewAmbulance] = useState({
    plateNumber: '', ambulanceModel: '', make: '', year: '', driverName: '', notes: '',
  });

  useEffect(() => { fetchAmbulances(); }, []);

  const fetchAmbulances = async () => {
    try {
      const res = await axiosInstance.get('/ambulances');
      const list = res.data?.data?.ambulances || [];
      setAmbulances(list);
    } catch {
      toast.error('Failed to load ambulances');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newAmbulance.plateNumber || !newAmbulance.ambulanceModel || !newAmbulance.make) {
      toast.error('Plate number, model and make are required');
      return;
    }
    try {
      await axiosInstance.post('/ambulances', {
        ...newAmbulance,
        year: newAmbulance.year ? Number(newAmbulance.year) : undefined,
      });
      toast.success('Ambulance added!');
      setShowAddModal(false);
      setNewAmbulance({ plateNumber: '', ambulanceModel: '', make: '', year: '', driverName: '', notes: '' });
      fetchAmbulances();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add ambulance');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this ambulance?')) return;
    try {
      await axiosInstance.delete(`/ambulances/${id}`);
      toast.success('Ambulance removed');
      setAmbulances(prev => prev.filter(a => a._id !== id));
    } catch {
      toast.error('Failed to remove ambulance');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await axiosInstance.patch(`/ambulances/${id}/status`, { status });
      setAmbulances(prev => prev.map(a => a._id === id ? { ...a, status: status as Ambulance['status'] } : a));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = filterStatus ? ambulances.filter(a => a.status === filterStatus) : ambulances;

  const stats = {
    total: ambulances.length,
    available: ambulances.filter(a => a.status === 'available').length,
    dispatched: ambulances.filter(a => a.status === 'dispatched').length,
    maintenance: ambulances.filter(a => a.status === 'maintenance').length,
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ambulances</h1>
            <p className="text-gray-500 mt-1">{ambulances.length} total ambulances</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <PlusIcon className="h-5 w-5" /><span>Add Ambulance</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Available', value: stats.available, color: 'text-green-600' },
            { label: 'Dispatched', value: stats.dispatched, color: 'text-blue-600' },
            { label: 'Maintenance', value: stats.maintenance, color: 'text-yellow-600' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="dispatched">Dispatched</option>
          <option value="maintenance">Maintenance</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Ambulances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <div key={a._id} className="bg-white rounded-lg shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-red-50 rounded-full p-2">
                  <TruckIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{a.plateNumber}</h3>
                  <p className="text-sm text-gray-500">{a.make} {a.ambulanceModel}{a.year ? ` (${a.year})` : ''}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[a.status]}`}>
                {a.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {a.driverName && <p><span className="font-medium">Driver:</span> {a.driverName}</p>}
              {a.location && (
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-4 w-4" />
                  <span className="font-mono text-xs">{a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)}</span>
                </div>
              )}
              {a.notes && <p className="text-xs text-gray-400 italic">{a.notes}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {a.status === 'available'
                  ? <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  : <XCircleIcon className="h-5 w-5 text-gray-400" />}
                <span className={`text-sm ${a.status === 'available' ? 'text-green-600' : 'text-gray-500'}`}>
                  {a.status === 'available' ? 'Ready for dispatch' : a.status === 'dispatched' ? 'On call' : 'Not available'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <select
                  value={a.status}
                  onChange={e => handleStatusChange(a._id, e.target.value)}
                  className="text-xs border rounded px-1 py-1"
                >
                  <option value="available">Available</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Offline</option>
                </select>
                <button
                  onClick={() => handleDelete(a._id)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No ambulances found</h3>
          <p className="text-gray-500 mt-1">Add an ambulance to get started.</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Add Ambulance</h2>
            <div className="space-y-4">
              {[
                { label: 'Plate Number *', key: 'plateNumber', placeholder: 'KCA 001A' },
                { label: 'Make *', key: 'make', placeholder: 'Toyota' },
                { label: 'Model *', key: 'ambulanceModel', placeholder: 'HiAce' },
                { label: 'Year', key: 'year', placeholder: '2022' },
                { label: 'Driver Name', key: 'driverName', placeholder: 'Driver name' },
                { label: 'Notes', key: 'notes', placeholder: 'Optional notes' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={(newAmbulance as any)[f.key]}
                    onChange={e => setNewAmbulance(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={handleAdd} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Add</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 border text-gray-700 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmbulanceList;
